// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IBroker {
    function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
    function exchangeProviders(uint256 index) external view returns (address);
}

interface ISortedOracles {
    function getRates(address token) external view returns (uint256[] memory, uint256[] memory);
    function medianRate(address token) external view returns (uint256, uint256);
    function numRates(address token) external view returns (uint256);
    function numTimestamps(address token) external view returns (uint256);
    function isOldestReportExpired(address token) external view returns (bool, uint256);
}

interface IExchangeProvider {
    struct Exchange {
        bytes32 exchangeId;
        address[] assets;
    }
    
    function getExchanges() external view returns (Exchange[] memory exchanges);
    function swapIn(bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut);
    function swapOut(bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountOut) external returns (uint256 amountIn);
    function getAmountOut(bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
    function getAmountIn(bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountOut) external view returns (uint256 amountIn);
}

/**
 * @title cXchange
 * @notice Advanced DEX for Mento Labs assets with order book, Mento oracle integration, and analytics
 * @dev Integrates directly with Mento's SortedOracles and BiPoolManager system
 */
contract cXchange is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_FEE_BPS = 1000; // 10%
    uint256 public constant ORDER_EXPIRY_TIME = 7 days;
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    
    // Mento Protocol Addresses
    address public mentoTokenBroker;
    address public sortedOracles;
    address public biPoolManager;
    address public baseToken; // CELO or cUSD
    
    // Trading Configuration
    uint256 public tradingFeeBps = 30; // 0.3%
    uint256 public makerRebateBps = 10; // 0.1%
    uint256 public minLiquidityThreshold = 1000 * 1e18; // Minimum liquidity for AMM pools
    
    // Order book structures
    enum OrderType { MARKET, LIMIT, STOP_LOSS, TAKE_PROFIT }
    enum OrderSide { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, CANCELLED, EXPIRED }
    
    struct Order {
        uint256 orderId;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 price; // Price in base token units
        OrderType orderType;
        OrderSide side;
        OrderStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 filledAmount;
        bool isPartialFillAllowed;
    }
    
    struct PriceCandle {
        uint256 timestamp;
        uint256 open;
        uint256 high;
        uint256 low;
        uint256 close;
        uint256 volume;
        uint256 trades;
    }
    
    struct TradingPair {
        address tokenA;
        address tokenB;
        bool active;
        uint256 minOrderSize;
        uint256 tickSize;
        uint256 totalVolume24h;
        uint256 priceChange24h;
        uint256 lastPrice;
        uint256 lastTradeTimestamp;
        bytes32 rateFeedId; // Mento oracle rate feed ID
    }
    
    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalShares;
        uint256 feeAccumulated;
        mapping(address => uint256) shares;
        bool active;
        uint256 lastUpdateTimestamp;
    }
    
    struct TokenExchangeProvider {
        address provider; // BiPoolManager or other exchange provider
        bytes32 exchangeId; // Exchange ID for the token pair
        bool active;
        address rateFeedId; // Oracle rate feed identifier
        uint256 lastPriceUpdate;
    }
    
    // State variables
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => TradingPair) public tradingPairs;
    mapping(address => mapping(address => TokenExchangeProvider)) public tokenExchangeProviders;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(bytes32 => uint256[]) public pairOrders;
    mapping(bytes32 => LiquidityPool) public liquidityPools;
    mapping(address => mapping(address => uint256)) public userBalances;
    mapping(bytes32 => mapping(uint256 => PriceCandle)) public priceCandles;
    mapping(address => uint256) public collectedFees;
    mapping(address => uint256) public lastPriceTimestamp;
    mapping(address => uint256) public cachedPrices;
    
    address[] public supportedTokensList;
    bytes32[] public activePairs;
    uint256 public nextOrderId = 1;
    uint256 public totalTrades;
    uint256 public totalVolume;
    
    // Events
    event OrderPlaced(uint256 indexed orderId, address indexed trader, bytes32 indexed pair, OrderType orderType, OrderSide side, uint256 amountIn, uint256 price);
    event OrderFilled(uint256 indexed orderId, address indexed trader, address indexed filler, uint256 amountFilled, uint256 price);
    event OrderCancelled(uint256 indexed orderId, address indexed trader);
    event TradeExecuted(bytes32 indexed pair, address indexed buyer, address indexed seller, uint256 amount, uint256 price, uint256 timestamp);
    event LiquidityAdded(bytes32 indexed pair, address indexed provider, uint256 amountA, uint256 amountB, uint256 shares);
    event LiquidityRemoved(bytes32 indexed pair, address indexed provider, uint256 amountA, uint256 amountB, uint256 shares);
    event PriceUpdated(address indexed token, uint256 oldPrice, uint256 newPrice, uint256 timestamp);
    event TradingPairAdded(bytes32 indexed pair, address indexed tokenA, address indexed tokenB, bytes32 rateFeedId);
    event TokenAdded(address indexed token, address indexed exchangeProvider, bytes32 exchangeId);
    event FeeCollected(address indexed token, uint256 amount);
    event OraclePriceStale(address indexed token, uint256 lastUpdate);
    event ExchangeProviderUpdated(address indexed tokenA, address indexed tokenB, address provider, bytes32 exchangeId);
    
    // Modifiers
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }
    
    modifier validOrder(uint256 orderId) {
        require(orders[orderId].orderId != 0, "Order does not exist");
        require(orders[orderId].status == OrderStatus.ACTIVE, "Order not active");
        require(orders[orderId].expiresAt > block.timestamp, "Order expired");
        _;
    }
    
    modifier activePair(bytes32 pairId) {
        require(tradingPairs[pairId].active, "Trading pair not active");
        _;
    }
    
    constructor(
        address _mentoTokenBroker,
        address _sortedOracles,
        address _biPoolManager,
        address _baseToken
    ) {
        require(_mentoTokenBroker != address(0), "Invalid broker address");
        require(_sortedOracles != address(0), "Invalid oracles address");
        require(_biPoolManager != address(0), "Invalid pool manager address");
        require(_baseToken != address(0), "Invalid base token address");
        
        mentoTokenBroker = _mentoTokenBroker;
        sortedOracles = _sortedOracles;
        biPoolManager = _biPoolManager;
        baseToken = _baseToken;
        
        // Add base token as supported
        supportedTokens[_baseToken] = true;
        supportedTokensList.push(_baseToken);
        emit TokenAdded(_baseToken, address(0), bytes32(0));
    }
    
    // Token Management with Mento Integration
    function addSupportedToken(
        address token,
        address exchangeProvider,
        bytes32 exchangeId,
        address rateFeedId
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        supportedTokensList.push(token);
        
        if (exchangeProvider != address(0)) {
            tokenExchangeProviders[token][baseToken] = TokenExchangeProvider({
                provider: exchangeProvider,
                exchangeId: exchangeId,
                active: true,
                rateFeedId: rateFeedId,
                lastPriceUpdate: block.timestamp
            });
            
            // Approve token for Mento broker
            IERC20(token).approve(mentoTokenBroker, type(uint256).max);
        }
        
        emit TokenAdded(token, exchangeProvider, exchangeId);
    }
    
    function addTradingPair(
        address tokenA,
        address tokenB,
        uint256 minOrderSize,
        uint256 tickSize,
        bytes32 rateFeedId
    ) external onlyOwner {
        require(supportedTokens[tokenA] && supportedTokens[tokenB], "Tokens not supported");
        require(tokenA != tokenB, "Cannot pair token with itself");
        
        bytes32 pairId = getPairId(tokenA, tokenB);
        require(!tradingPairs[pairId].active, "Pair already exists");
        
        tradingPairs[pairId] = TradingPair({
            tokenA: tokenA,
            tokenB: tokenB,
            active: true,
            minOrderSize: minOrderSize,
            tickSize: tickSize,
            totalVolume24h: 0,
            priceChange24h: 0,
            lastPrice: 0,
            lastTradeTimestamp: 0,
            rateFeedId: rateFeedId
        });
        
        activePairs.push(pairId);
        emit TradingPairAdded(pairId, tokenA, tokenB, rateFeedId);
    }
    
    // Mento Oracle Integration
    function getTokenPriceFromOracle(address token) public returns (uint256 price, uint256 timestamp) {
        if (token == baseToken) {
            return (PRECISION, block.timestamp);
        }
        
        TokenExchangeProvider memory provider = tokenExchangeProviders[token][baseToken];
        if (provider.rateFeedId != address(0)) {
            try ISortedOracles(sortedOracles).medianRate(provider.rateFeedId) returns (uint256 rate, uint256 updatedAt) {
                // Check if price is not stale
                if (block.timestamp - updatedAt <= PRICE_STALENESS_THRESHOLD) {
                    return (rate, updatedAt);
                } else {
                    emit OraclePriceStale(token, updatedAt);
                }
            } catch {}
        }
        
        // Fallback to Mento broker for price discovery
        if (provider.active) {
            try IBroker(mentoTokenBroker).getAmountOut(
                provider.provider,
                provider.exchangeId,
                token,
                baseToken,
                PRECISION
            ) returns (uint256 amount) {
                return (amount, block.timestamp);
            } catch {}
        }
        
        revert("Price not available");
    }
    
    function updateTokenPrice(address token) external returns (uint256 price) {
        (uint256 newPrice, uint256 timestamp) = getTokenPriceFromOracle(token);
        price = newPrice;
        
        uint256 oldPrice = cachedPrices[token];
        cachedPrices[token] = price;
        lastPriceTimestamp[token] = timestamp;
        
        if (oldPrice != price) {
            emit PriceUpdated(token, oldPrice, price, timestamp);
        }
        
        return price;
    }
    
    function getTokenPrice(address token) public returns (uint256 price, uint256 timestamp) {
        // Return cached price if recent enough
        uint256 cachedTimestamp = lastPriceTimestamp[token];
        if (cachedTimestamp > 0 && block.timestamp - cachedTimestamp <= PRICE_STALENESS_THRESHOLD) {
            return (cachedPrices[token], cachedTimestamp);
        }
        
        // Get fresh price from oracle
        return getTokenPriceFromOracle(token);
    }
    
    function updatePriceCandle(
        bytes32 pairId,
        uint256 timeframe,
        uint256 price,
        uint256 volume
    ) internal {
        uint256 candleTime = (block.timestamp / timeframe) * timeframe;
        PriceCandle storage candle = priceCandles[pairId][candleTime];
        
        if (candle.timestamp == 0) {
            candle.timestamp = candleTime;
            candle.open = price;
            candle.high = price;
            candle.low = price;
            candle.close = price;
            candle.volume = volume;
            candle.trades = 1;
        } else {
            candle.high = price > candle.high ? price : candle.high;
            candle.low = price < candle.low ? price : candle.low;
            candle.close = price;
            candle.volume = candle.volume + volume;
            candle.trades = candle.trades + 1;
        }
    }
    
    // Order Book Functions
    function placeOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        OrderType orderType,
        bool isPartialFillAllowed,
        uint256 expiresAt
    ) external nonReentrant onlySupportedToken(tokenIn) onlySupportedToken(tokenOut) returns (uint256 orderId) {
        require(amountIn > 0 && amountOut > 0, "Invalid amounts");
        require(tokenIn != tokenOut, "Cannot trade same token");
        
        bytes32 pairId = getPairId(tokenIn, tokenOut);
        require(tradingPairs[pairId].active, "Trading pair not active");
        
        if (expiresAt == 0) {
            expiresAt = block.timestamp + ORDER_EXPIRY_TIME;
        }
        require(expiresAt > block.timestamp, "Invalid expiry time");
        
        // Calculate price using oracle data
        uint256 price = calculateOrderPrice(tokenIn, tokenOut, amountIn, amountOut);
        
        orderId = nextOrderId++;
        OrderSide side = tokenOut == baseToken ? OrderSide.SELL : OrderSide.BUY;
        
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            price: price,
            orderType: orderType,
            side: side,
            status: OrderStatus.ACTIVE,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            filledAmount: 0,
            isPartialFillAllowed: isPartialFillAllowed
        });
        
        userOrders[msg.sender].push(orderId);
        pairOrders[pairId].push(orderId);
        
        // Lock tokens for the order
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        userBalances[msg.sender][tokenIn] = userBalances[msg.sender][tokenIn] + amountIn;
        
        emit OrderPlaced(orderId, msg.sender, pairId, orderType, side, amountIn, price);
        
        // Try to match immediately for market orders
        if (orderType == OrderType.MARKET) {
            _matchOrder(orderId);
        }
        
        return orderId;
    }
    
    function calculateOrderPrice(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal returns (uint256) {
        if (tokenOut == baseToken) {
            return amountOut * PRECISION / amountIn;
        } else if (tokenIn == baseToken) {
            return amountIn * PRECISION / amountOut;
        } else {
            // Convert both to base token for price calculation
            (uint256 tokenInPrice,) = getTokenPrice(tokenIn);
            (uint256 tokenOutPrice,) = getTokenPrice(tokenOut);
            
            uint256 tokenInValueInBase = amountIn * tokenInPrice / PRECISION;
            uint256 tokenOutValueInBase = amountOut * tokenOutPrice / PRECISION;
            
            return tokenOutValueInBase * PRECISION / tokenInValueInBase;
        }
    }
    
    function cancelOrder(uint256 orderId) external validOrder(orderId) {
        _cancelOrder(orderId, msg.sender);
    }
    
    function _cancelOrder(uint256 orderId, address canceller) internal {
        Order storage order = orders[orderId];
        require(order.trader == canceller || owner() == canceller, "Not authorized");
        
        order.status = OrderStatus.CANCELLED;
        
        // Refund locked tokens
        uint256 remainingAmount = order.amountIn - order.filledAmount;
        if (remainingAmount > 0) {
            userBalances[order.trader][order.tokenIn] = userBalances[order.trader][order.tokenIn] - remainingAmount;
            IERC20(order.tokenIn).safeTransfer(order.trader, remainingAmount);
        }
        
        emit OrderCancelled(orderId, canceller);
    }
    
    function fillOrder(uint256 orderId, uint256 amountToFill) external nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        require(order.trader != msg.sender, "Cannot fill own order");
        require(amountToFill > 0, "Invalid fill amount");
        
        uint256 remainingAmount = order.amountIn - order.filledAmount;
        require(amountToFill <= remainingAmount, "Amount exceeds remaining");
        
        if (!order.isPartialFillAllowed) {
            require(amountToFill == remainingAmount, "Partial fills not allowed");
        }
        
        // Calculate output amount
        uint256 outputAmount = amountToFill * order.amountOut / order.amountIn;
        
        // Calculate fees
        uint256 takerFee = outputAmount * tradingFeeBps / 10000;
        uint256 makerRebate = outputAmount * makerRebateBps / 10000;
        uint256 netOutput = outputAmount - takerFee;
        
        // Execute the trade
        _executeFill(order, amountToFill, outputAmount, netOutput, takerFee, makerRebate);
        
        emit OrderFilled(orderId, order.trader, msg.sender, amountToFill, order.price);
    }
    
    function _executeFill(
        Order storage order,
        uint256 amountToFill,
        uint256 outputAmount,
        uint256 netOutput,
        uint256 takerFee,
        uint256 makerRebate
    ) internal {
        // Transfer tokens
        IERC20(order.tokenOut).safeTransferFrom(msg.sender, order.trader, netOutput);
        IERC20(order.tokenIn).safeTransfer(msg.sender, amountToFill - makerRebate);
        
        // Update order state
        order.filledAmount = order.filledAmount + amountToFill;
        userBalances[order.trader][order.tokenIn] = userBalances[order.trader][order.tokenIn] - amountToFill;
        
        if (order.filledAmount == order.amountIn) {
            order.status = OrderStatus.FILLED;
        }
        
        // Update trading pair stats
        bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
        TradingPair storage pair = tradingPairs[pairId];
        pair.lastPrice = order.price;
        pair.lastTradeTimestamp = block.timestamp;
        pair.totalVolume24h = pair.totalVolume24h + outputAmount;
        
        // Update price candles
        updatePriceCandle(pairId, 300, order.price, outputAmount);
        updatePriceCandle(pairId, 3600, order.price, outputAmount);
        updatePriceCandle(pairId, 86400, order.price, outputAmount);
        
        // Collect fees
        collectedFees[order.tokenOut] = collectedFees[order.tokenOut] + (takerFee - makerRebate);
        
        totalTrades = totalTrades + 1;
        totalVolume = totalVolume + outputAmount;
        
        emit TradeExecuted(pairId, msg.sender, order.trader, outputAmount, order.price, block.timestamp);
    }
    
    function _matchOrder(uint256 orderId) internal {
        Order storage order = orders[orderId];
        bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
        uint256[] memory oppositeOrders = pairOrders[pairId];
        
        for (uint256 i = 0; i < oppositeOrders.length; i++) {
            uint256 matchOrderId = oppositeOrders[i];
            Order storage matchOrder = orders[matchOrderId];
            
            if (matchOrder.status != OrderStatus.ACTIVE || 
                matchOrder.trader == order.trader ||
                matchOrder.tokenIn != order.tokenOut ||
                matchOrder.tokenOut != order.tokenIn ||
                matchOrderId == orderId) {
                continue;
            }
            
            // Check price compatibility for matching
            bool canMatch = false;
            if (order.side == OrderSide.BUY && matchOrder.side == OrderSide.SELL) {
                canMatch = order.price >= matchOrder.price;
            } else if (order.side == OrderSide.SELL && matchOrder.side == OrderSide.BUY) {
                canMatch = order.price <= matchOrder.price;
            }
            
            if (canMatch) {
                uint256 fillAmount = _min(
                    order.amountIn - order.filledAmount,
                    matchOrder.amountIn - matchOrder.filledAmount
                );
                
                if (fillAmount > 0) {
                    _executeTrade(orderId, matchOrderId, fillAmount);
                    
                    if (order.filledAmount == order.amountIn) {
                        break;
                    }
                }
            }
        }
    }
    
    function _executeTrade(uint256 buyOrderId, uint256 sellOrderId, uint256 amount) internal {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];
        
        // Use the maker's price (first order placed)
        uint256 executionPrice = buyOrder.createdAt < sellOrder.createdAt ? buyOrder.price : sellOrder.price;
        
        uint256 outputAmount = amount * executionPrice / PRECISION;
        
        // Calculate fees
        uint256 fee = outputAmount * tradingFeeBps / 10000;
        uint256 netOutput = outputAmount - fee;
        
        // Update order states
        buyOrder.filledAmount = buyOrder.filledAmount + amount;
        sellOrder.filledAmount = sellOrder.filledAmount + amount;
        
        if (buyOrder.filledAmount == buyOrder.amountIn) {
            buyOrder.status = OrderStatus.FILLED;
        }
        if (sellOrder.filledAmount == sellOrder.amountIn) {
            sellOrder.status = OrderStatus.FILLED;
        }
        
        // Transfer tokens
        userBalances[buyOrder.trader][buyOrder.tokenIn] = userBalances[buyOrder.trader][buyOrder.tokenIn] - amount;
        userBalances[sellOrder.trader][sellOrder.tokenIn] = userBalances[sellOrder.trader][sellOrder.tokenIn] - amount;
        
        IERC20(buyOrder.tokenOut).safeTransfer(buyOrder.trader, netOutput);
        IERC20(sellOrder.tokenOut).safeTransfer(sellOrder.trader, amount);
        
        // Collect fees
        collectedFees[buyOrder.tokenOut] = collectedFees[buyOrder.tokenOut] + fee;
        
        emit OrderFilled(buyOrderId, buyOrder.trader, sellOrder.trader, amount, executionPrice);
        emit OrderFilled(sellOrderId, sellOrder.trader, buyOrder.trader, amount, executionPrice);
    }
    
    // AMM Swap Functions with Mento Integration
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external nonReentrant onlySupportedToken(tokenIn) onlySupportedToken(tokenOut) returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");
        require(to != address(0), "Invalid recipient");
        
        bytes32 poolId = getPairId(tokenIn, tokenOut);
        LiquidityPool storage pool = liquidityPools[poolId];
        
        // Try internal AMM first if sufficient liquidity
        if (pool.active && _hasMinimumLiquidity(pool)) {
            amountOut = _getAmountOut(amountIn, pool, tokenIn == pool.tokenA);
            require(amountOut >= amountOutMin, "Insufficient output amount");
            
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            _executeAMMSwap(pool, tokenIn, tokenOut, amountIn, amountOut, to);
        } else {
            // Use Mento protocol
            amountOut = _swapViaMento(tokenIn, tokenOut, amountIn, amountOutMin, to);
        }
        
        // Update trading stats
        _updateTradingStats(poolId, tokenIn, tokenOut, amountIn, amountOut);
        
        return amountOut;
    }
    
    function _swapViaMento(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) internal returns (uint256 amountOut) {
        TokenExchangeProvider memory provider = tokenExchangeProviders[tokenIn][tokenOut];
        
        // If no direct provider, try via base token
        if (!provider.active) {
            provider = tokenExchangeProviders[tokenIn][baseToken];
            require(provider.active, "No exchange provider available");
        }
        
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        if (tokenOut == baseToken || provider.exchangeId != bytes32(0)) {
            // Direct swap via Mento broker
            amountOut = IBroker(mentoTokenBroker).swapIn(
                provider.provider,
                provider.exchangeId,
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMin
            );
        } else {
            // Two-hop swap via base token
            uint256 intermediateAmount = IBroker(mentoTokenBroker).swapIn(
                provider.provider,
                provider.exchangeId,
                tokenIn,
                baseToken,
                amountIn,
                0
            );
            
            TokenExchangeProvider memory outProvider = tokenExchangeProviders[baseToken][tokenOut];
            require(outProvider.active, "No output exchange provider");
            
            amountOut = IBroker(mentoTokenBroker).swapIn(
                outProvider.provider,
                outProvider.exchangeId,
                baseToken,
                tokenOut,
                intermediateAmount,
                amountOutMin
            );
        }
        
        IERC20(tokenOut).safeTransfer(to, amountOut);
        return amountOut;
    }
    
    function _executeAMMSwap(
        LiquidityPool storage pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    ) internal {
        // Update reserves
        if (tokenIn == pool.tokenA) {
            pool.reserveA = pool.reserveA + amountIn;
            pool.reserveB = pool.reserveB - amountOut;
        } else {
            pool.reserveB = pool.reserveB + amountIn;
            pool.reserveA = pool.reserveA - amountOut;
        }
        
        pool.lastUpdateTimestamp = block.timestamp;
        
        // Transfer output tokens
        IERC20(tokenOut).safeTransfer(to, amountOut);
    }
    
    function _updateTradingStats(
        bytes32 poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal {
        TradingPair storage pair = tradingPairs[poolId];
        uint256 price = 0;
        if (pair.active) {
            price = calculateOrderPrice(tokenIn, tokenOut, amountIn, amountOut);
            pair.lastPrice = price;
            pair.lastTradeTimestamp = block.timestamp;
            updatePriceCandle(poolId, 300, price, amountOut);
       }
       
       emit TradeExecuted(poolId, msg.sender, address(this), amountOut, price, block.timestamp);
   }
   
   function _hasMinimumLiquidity(LiquidityPool storage pool) internal returns (bool) {
       (uint256 tokenAPrice,) = getTokenPrice(pool.tokenA);
       (uint256 tokenBPrice,) = getTokenPrice(pool.tokenB);
       
       uint256 totalValueA = pool.reserveA * tokenAPrice / PRECISION;
       uint256 totalValueB = pool.reserveB * tokenBPrice / PRECISION;
       
       return (totalValueA + totalValueB) >= minLiquidityThreshold;
   }
   
   function _getAmountOut(
       uint256 amountIn,
       LiquidityPool storage pool,
       bool tokenAIn
   ) internal view returns (uint256 amountOut) {
       uint256 reserveIn = tokenAIn ? pool.reserveA : pool.reserveB;
       uint256 reserveOut = tokenAIn ? pool.reserveB : pool.reserveA;
       
       uint256 amountInWithFee = amountIn * 997;
       uint256 numerator = amountInWithFee * reserveOut;
       uint256 denominator = reserveIn * 1000 + amountInWithFee;
       amountOut = numerator / denominator;
   }
   
   // Liquidity Pool Functions
   function createLiquidityPool(
       address tokenA,
       address tokenB,
       uint256 amountA,
       uint256 amountB
   ) external nonReentrant onlySupportedToken(tokenA) onlySupportedToken(tokenB) returns (bytes32 poolId) {
       require(tokenA != tokenB, "Cannot create pool with same token");
       require(amountA > 0 && amountB > 0, "Invalid amounts");
       
       poolId = getPairId(tokenA, tokenB);
       require(!liquidityPools[poolId].active, "Pool already exists");
       
       LiquidityPool storage pool = liquidityPools[poolId];
       pool.tokenA = tokenA;
       pool.tokenB = tokenB;
       pool.reserveA = amountA;
       pool.reserveB = amountB;
       pool.totalShares = Math.sqrt(amountA * amountB);
       pool.active = true;
       pool.lastUpdateTimestamp = block.timestamp;
       pool.shares[msg.sender] = pool.totalShares;
       
       IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
       IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
       
       emit LiquidityAdded(poolId, msg.sender, amountA, amountB, pool.totalShares);
       return poolId;
   }
   
   function addLiquidity(
       bytes32 poolId,
       uint256 amountA,
       uint256 amountB
   ) external nonReentrant returns (uint256 shares) {
       LiquidityPool storage pool = liquidityPools[poolId];
       require(pool.active, "Pool not active");
       
       // Calculate optimal amounts
       uint256 optimalAmountB = amountA * pool.reserveB / pool.reserveA;
       if (optimalAmountB <= amountB) {
           amountB = optimalAmountB;
       } else {
           amountA = amountB * pool.reserveA / pool.reserveB;
       }
       
       // Calculate shares
       shares = _min(
           amountA * pool.totalShares / pool.reserveA,
           amountB * pool.totalShares / pool.reserveB
       );
       
       require(shares > 0, "Insufficient liquidity added");
       
       pool.reserveA = pool.reserveA + amountA;
       pool.reserveB = pool.reserveB + amountB;
       pool.totalShares = pool.totalShares + shares;
       pool.shares[msg.sender] = pool.shares[msg.sender] + shares;
       pool.lastUpdateTimestamp = block.timestamp;
       
       IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), amountA);
       IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), amountB);
       
       emit LiquidityAdded(poolId, msg.sender, amountA, amountB, shares);
   }
   
   function removeLiquidity(
       bytes32 poolId,
       uint256 shares
   ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
       LiquidityPool storage pool = liquidityPools[poolId];
       require(pool.active, "Pool not active");
       require(pool.shares[msg.sender] >= shares, "Insufficient shares");
       
       amountA = shares * pool.reserveA / pool.totalShares;
       amountB = shares * pool.reserveB / pool.totalShares;
       
       pool.reserveA = pool.reserveA - amountA;
       pool.reserveB = pool.reserveB - amountB;
       pool.totalShares = pool.totalShares - shares;
       pool.shares[msg.sender] = pool.shares[msg.sender] - shares;
       pool.lastUpdateTimestamp = block.timestamp;
       
       IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
       IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
       
       emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, shares);
   }
   
   // Mento Oracle Integration Functions
   function getMentoExchanges() external view returns (IExchangeProvider.Exchange[] memory) {
       if (biPoolManager != address(0)) {
           return IExchangeProvider(biPoolManager).getExchanges();
       }
       return new IExchangeProvider.Exchange[](0);
   }
   
   function getOracleRates(address token) external view returns (uint256[] memory rates, uint256[] memory timestamps) {
       TokenExchangeProvider memory provider = tokenExchangeProviders[token][baseToken];
       if (provider.rateFeedId != address(0)) {
           return ISortedOracles(sortedOracles).getRates(provider.rateFeedId);
       }
       return (new uint256[](0), new uint256[](0));
   }
   
   function isOraclePriceStale(address token) external view returns (bool isStale, uint256 lastUpdate) {
       TokenExchangeProvider memory provider = tokenExchangeProviders[token][baseToken];
       if (provider.rateFeedId != address(0)) {
           return ISortedOracles(sortedOracles).isOldestReportExpired(provider.rateFeedId);
       }
       return (true, 0);
   }
   
   function syncPricesWithOracles() external {
       for (uint256 i = 0; i < supportedTokensList.length; i++) {
           address token = supportedTokensList[i];
           if (token != baseToken) {
               try this.updateTokenPrice(token) {
                   // Price updated successfully
               } catch {
                   // Skip tokens with price update failures
               }
           }
       }
   }
   
   // Advanced Trading Functions
   function getSwapAmountOut(
       address tokenIn,
       address tokenOut,
       uint256 amountIn
   ) external returns (uint256 amountOut) {
       bytes32 poolId = getPairId(tokenIn, tokenOut);
       LiquidityPool storage pool = liquidityPools[poolId];
       
       // Check internal AMM first
       if (pool.active && _hasMinimumLiquidity(pool)) {
           return _getAmountOut(amountIn, pool, tokenIn == pool.tokenA);
       }
       
       // Try Mento broker
       TokenExchangeProvider memory provider = tokenExchangeProviders[tokenIn][tokenOut];
       if (!provider.active) {
           provider = tokenExchangeProviders[tokenIn][baseToken];
       }
       
       if (provider.active) {
           try IBroker(mentoTokenBroker).getAmountOut(
               provider.provider,
               provider.exchangeId,
               tokenIn,
               tokenOut,
               amountIn
           ) returns (uint256 amount) {
               return amount;
           } catch {
               return 0;
           }
       }
       
       return 0;
   }
   
   function executeArbitrage(
       address tokenA,
       address tokenB,
       uint256 amountIn,
       bool useInternalFirst
   ) external nonReentrant onlyOwner returns (uint256 profit) {
       // Get prices from both sources
       bytes32 poolId = getPairId(tokenA, tokenB);
       LiquidityPool storage pool = liquidityPools[poolId];
       
       uint256 internalPrice = 0;
       uint256 mentoPrice = 0;
       
       if (pool.active && _hasMinimumLiquidity(pool)) {
           internalPrice = _getAmountOut(amountIn, pool, tokenA == pool.tokenA);
       }
       
       TokenExchangeProvider memory provider = tokenExchangeProviders[tokenA][tokenB];
       if (!provider.active) {
           provider = tokenExchangeProviders[tokenA][baseToken];
       }
       
       if (provider.active) {
           try IBroker(mentoTokenBroker).getAmountOut(
               provider.provider,
               provider.exchangeId,
               tokenA,
               tokenB,
               amountIn
           ) returns (uint256 amount) {
               mentoPrice = amount;
           } catch {}
       }
       
       // Execute arbitrage if profitable
       if (internalPrice > 0 && mentoPrice > 0 && internalPrice != mentoPrice) {
           uint256 priceDiff = internalPrice > mentoPrice ? internalPrice - mentoPrice : mentoPrice - internalPrice;
           uint256 minProfitThreshold = amountIn * 5 / 1000; // 0.5% minimum profit
           
           if (priceDiff > minProfitThreshold) {
               if (useInternalFirst && internalPrice > mentoPrice) {
                   // Buy from Mento, sell to internal pool
                   _executeArbitrageInternal(tokenA, tokenB, amountIn, true);
               } else if (!useInternalFirst && mentoPrice > internalPrice) {
                   // Buy from internal pool, sell to Mento
                   _executeArbitrageInternal(tokenA, tokenB, amountIn, false);
               }
           }
       }
       
       return profit;
   }
   
   function _executeArbitrageInternal(
       address tokenA,
       address tokenB,
       uint256 amountIn,
       bool buyFromMento
   ) internal {
       if (buyFromMento) {
           // Buy from Mento, sell to internal AMM
           uint256 amountOut = _swapViaMento(tokenA, tokenB, amountIn, 0, address(this));
           
           bytes32 poolId = getPairId(tokenB, tokenA);
           LiquidityPool storage pool = liquidityPools[poolId];
           
           if (pool.active) {
               uint256 finalAmount = _getAmountOut(amountOut, pool, tokenB == pool.tokenA);
               _executeAMMSwap(pool, tokenB, tokenA, amountOut, finalAmount, address(this));
           }
       } else {
           // Buy from internal AMM, sell to Mento
           bytes32 poolId = getPairId(tokenA, tokenB);
           LiquidityPool storage pool = liquidityPools[poolId];
           
           if (pool.active) {
               uint256 amountOut = _getAmountOut(amountIn, pool, tokenA == pool.tokenA);
               _executeAMMSwap(pool, tokenA, tokenB, amountIn, amountOut, address(this));
               
               _swapViaMento(tokenB, tokenA, amountOut, 0, address(this));
           }
       }
   }
   
   // Utility Functions
   function getPairId(address tokenA, address tokenB) public pure returns (bytes32) {
       return tokenA < tokenB ? keccak256(abi.encodePacked(tokenA, tokenB)) : keccak256(abi.encodePacked(tokenB, tokenA));
   }
   
   function _min(uint256 a, uint256 b) internal pure returns (uint256) {
       return a < b ? a : b;
   }
   
   // View Functions
   function getOrderBook(bytes32 pairId, uint256 depth) external view returns (
       uint256[] memory buyPrices,
       uint256[] memory buyAmounts,
       uint256[] memory sellPrices,
       uint256[] memory sellAmounts
   ) {
       uint256[] memory orderIds = pairOrders[pairId];
       uint256 buyCount = 0;
       uint256 sellCount = 0;
       
       // Count active orders
       for (uint256 i = 0; i < orderIds.length; i++) {
           Order storage order = orders[orderIds[i]];
           if (order.status == OrderStatus.ACTIVE && order.expiresAt > block.timestamp) {
               if (order.side == OrderSide.BUY) buyCount++;
               else sellCount++;
           }
       }
       
       // Limit to depth
       buyCount = buyCount > depth ? depth : buyCount;
       sellCount = sellCount > depth ? depth : sellCount;
       
       buyPrices = new uint256[](buyCount);
       buyAmounts = new uint256[](buyCount);
       sellPrices = new uint256[](sellCount);
       sellAmounts = new uint256[](sellCount);
       
       uint256 buyIndex = 0;
       uint256 sellIndex = 0;
       
       // Fill arrays
       for (uint256 i = 0; i < orderIds.length && (buyIndex < buyCount || sellIndex < sellCount); i++) {
           Order storage order = orders[orderIds[i]];
           if (order.status == OrderStatus.ACTIVE && order.expiresAt > block.timestamp) {
               uint256 remainingAmount = order.amountIn - order.filledAmount;
               
               if (order.side == OrderSide.BUY && buyIndex < buyCount) {
                   buyPrices[buyIndex] = order.price;
                   buyAmounts[buyIndex] = remainingAmount;
                   buyIndex++;
               } else if (order.side == OrderSide.SELL && sellIndex < sellCount) {
                   sellPrices[sellIndex] = order.price;
                   sellAmounts[sellIndex] = remainingAmount;
                   sellIndex++;
               }
           }
       }
   }
   
   function getPriceCandles(
       bytes32 pairId,
       uint256 timeframe,
       uint256 from,
       uint256 to,
       uint256 limit
   ) external view returns (PriceCandle[] memory candles) {
       require(to > from, "Invalid time range");
       uint256 count = 0;
       uint256 maxCandles = limit > 0 ? limit : 1000;
       
       // Count candles in range
       for (uint256 timestamp = from; timestamp <= to && count < maxCandles; timestamp += timeframe) {
           if (priceCandles[pairId][timestamp].timestamp != 0) {
               count++;
           }
       }
       
       candles = new PriceCandle[](count);
       uint256 index = 0;
       
       for (uint256 timestamp = from; timestamp <= to && index < count; timestamp += timeframe) {
           PriceCandle storage candle = priceCandles[pairId][timestamp];
           if (candle.timestamp != 0) {
               candles[index] = candle;
               index++;
           }
       }
   }
   
   function getMarketData(bytes32 pairId) external view returns (
       uint256 lastPrice,
       uint256 priceChange24h,
       uint256 volume24h,
       uint256 high24h,
       uint256 low24h,
       uint256 lastTradeTimestamp
   ) {
       TradingPair storage pair = tradingPairs[pairId];
       lastPrice = pair.lastPrice;
       priceChange24h = pair.priceChange24h;
       volume24h = pair.totalVolume24h;
       lastTradeTimestamp = pair.lastTradeTimestamp;
       
       // Calculate 24h high/low from candles
       uint256 yesterday = block.timestamp - 86400;
       for (uint256 i = 0; i < 24; i++) {
           uint256 hourTimestamp = yesterday + (i * 3600);
           PriceCandle storage candle = priceCandles[pairId][hourTimestamp];
           if (candle.timestamp != 0) {
               if (high24h == 0 || candle.high > high24h) high24h = candle.high;
               if (low24h == 0 || candle.low < low24h) low24h = candle.low;
           }
       }
   }
   
   function getUserOrders(address user, bool activeOnly) external view returns (uint256[] memory orderIds) {
       uint256[] memory allOrders = userOrders[user];
       uint256 count = 0;
       
       if (activeOnly) {
           for (uint256 i = 0; i < allOrders.length; i++) {
               Order storage order = orders[allOrders[i]];
               if (order.status == OrderStatus.ACTIVE && order.expiresAt > block.timestamp) {
                   count++;
               }
           }
           
           orderIds = new uint256[](count);
           uint256 index = 0;
           
           for (uint256 i = 0; i < allOrders.length; i++) {
               Order storage order = orders[allOrders[i]];
               if (order.status == OrderStatus.ACTIVE && order.expiresAt > block.timestamp) {
                   orderIds[index] = allOrders[i];
                   index++;
               }
           }
       } else {
           orderIds = allOrders;
       }
   }
   
   function getLiquidityPoolInfo(bytes32 poolId) external view returns (
       address tokenA,
       address tokenB,
       uint256 reserveA,
       uint256 reserveB,
       uint256 totalShares,
       uint256 userShares,
       uint256 lastUpdate
   ) {
       LiquidityPool storage pool = liquidityPools[poolId];
       return (
           pool.tokenA,
           pool.tokenB,
           pool.reserveA,
           pool.reserveB,
           pool.totalShares,
           pool.shares[msg.sender],
           pool.lastUpdateTimestamp
       );
   }
   
   function getTradingPairs() external view returns (bytes32[] memory) {
       return activePairs;
   }
   
   function getSupportedTokens() external view returns (address[] memory) {
       return supportedTokensList;
   }
   
   function getOrder(uint256 orderId) external view returns (Order memory) {
       return orders[orderId];
   }
   
   function getTokenExchangeProvider(address tokenA, address tokenB) external view returns (
       address provider,
       bytes32 exchangeId,
       bool active,
       address rateFeedId,
       uint256 lastPriceUpdate
   ) {
       TokenExchangeProvider memory providerInfo = tokenExchangeProviders[tokenA][tokenB];
       return (
           providerInfo.provider,
           providerInfo.exchangeId,
           providerInfo.active,
           providerInfo.rateFeedId,
           providerInfo.lastPriceUpdate
       );
   }
   
   // Admin Functions
   function setTradingFee(uint256 _tradingFeeBps, uint256 _makerRebateBps) external onlyOwner {
       require(_tradingFeeBps <= MAX_FEE_BPS, "Fee too high");
       require(_makerRebateBps <= _tradingFeeBps, "Rebate cannot exceed fee");
       
       tradingFeeBps = _tradingFeeBps;
       makerRebateBps = _makerRebateBps;
   }
   
   function updateExchangeProvider(
       address tokenA,
       address tokenB,
       address provider,
       bytes32 exchangeId,
       address rateFeedId
   ) external onlyOwner {
       tokenExchangeProviders[tokenA][tokenB] = TokenExchangeProvider({
           provider: provider,
           exchangeId: exchangeId,
           active: true,
           rateFeedId: rateFeedId,
           lastPriceUpdate: block.timestamp
       });
       
       emit ExchangeProviderUpdated(tokenA, tokenB, provider, exchangeId);
   }
   
   function setMinLiquidityThreshold(uint256 _minLiquidityThreshold) external onlyOwner {
       minLiquidityThreshold = _minLiquidityThreshold;
   }
   
   function pauseTradingPair(bytes32 pairId) external onlyOwner {
       tradingPairs[pairId].active = false;
   }
   
   function resumeTradingPair(bytes32 pairId) external onlyOwner {
       tradingPairs[pairId].active = true;
   }
   
   function withdrawFees(address token, uint256 amount) external onlyOwner {
       uint256 balance = collectedFees[token];
       require(balance > 0, "No fees to withdraw");
       
       uint256 withdrawAmount = amount == 0 ? balance : amount;
       require(withdrawAmount <= balance, "Insufficient fee balance");
       
       collectedFees[token] = balance - withdrawAmount;
       IERC20(token).safeTransfer(owner(), withdrawAmount);
       
       emit FeeCollected(token, withdrawAmount);
   }
   
   function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
       IERC20(token).safeTransfer(owner(), amount);
   }
   
   // Batch functions
   function batchCancelOrders(uint256[] calldata orderIds) external {
       for (uint256 i = 0; i < orderIds.length; i++) {
           if (orders[orderIds[i]].trader == msg.sender && 
               orders[orderIds[i]].status == OrderStatus.ACTIVE) {
               _cancelOrder(orderIds[i], msg.sender);
           }
       }
   }
   
   function updateExpiredOrders(uint256[] calldata orderIds) external {
       for (uint256 i = 0; i < orderIds.length; i++) {
           Order storage order = orders[orderIds[i]];
           if (order.status == OrderStatus.ACTIVE && order.expiresAt <= block.timestamp) {
               order.status = OrderStatus.EXPIRED;
               
               // Refund locked tokens
               uint256 remainingAmount = order.amountIn - order.filledAmount;
               if (remainingAmount > 0) {
                   userBalances[order.trader][order.tokenIn] = userBalances[order.trader][order.tokenIn] - remainingAmount;
                   IERC20(order.tokenIn).safeTransfer(order.trader, remainingAmount);
               }
           }
       }
   }
   
   // Receive function for native token handling
   receive() external payable {
       // Contract can receive native tokens if needed
   }
}