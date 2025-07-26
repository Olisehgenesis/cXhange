// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IMentoBroker {
    function swapIn(
        address exchangeProvider, 
        bytes32 exchangeId, 
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        uint256 amountOutMin
    ) external returns (uint256 amountOut);
    
    function getAmountOut(
        address exchangeProvider,
        bytes32 exchangeId, 
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn
    ) external view returns (uint256 amountOut);
}

/**
 * @title cXchange v3 - Hybrid DEX
 * @notice Advanced DEX combining AMM pools, order book, and Mento integration
 * @dev Supports instant AMM trades, limit orders, and admin-managed execution
 */
contract cXchangev3 is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MIN_LIQUIDITY = 1000;
    uint256 public constant ORDER_EXPIRY_TIME = 7 days;
    uint256 public constant MAX_FEE_BPS = 1000; // 10%
    
    // Configuration
    address public mentoBroker;
    address public baseToken; // cUSD
    uint256 public ammFeeBps = 25; // 0.25% for AMM
    uint256 public orderFeeBps = 30; // 0.3% for orders
    bool public ammEnabled = true;
    bool public orderBookEnabled = true;
    
    // Trading Modes
    enum ExecutionMode { AUTO, AMM_ONLY, ORDER_ONLY, MENTO_ONLY }
    ExecutionMode public defaultExecutionMode = ExecutionMode.AUTO;
    
    // Order System
    enum OrderType { MARKET, LIMIT, STOP_LOSS, TAKE_PROFIT }
    enum OrderSide { BUY, SELL }
    enum OrderStatus { PENDING, EXECUTED, CANCELLED, EXPIRED, FAILED, PARTIALLY_FILLED }
    
    struct Order {
        uint256 orderId;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 limitPrice;
        uint256 stopPrice; // For stop orders
        uint256 minAmountOut;
        OrderType orderType;
        OrderSide side;
        OrderStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 executedAmount;
        uint256 remainingAmount;
        uint256 executedPrice;
        string executionNote;
        address executedBy;
        uint256 executedAt;
        bool allowPartialFill;
        ExecutionMode preferredMode;
    }
    
    // AMM Pool Structure
    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalShares;
        uint256 lastPrice;
        uint256 volume24h;
        uint256 fees24h;
        uint256 lastUpdateTime;
        bool active;
        uint256 minLiquidity;
        mapping(address => uint256) shares;
        mapping(address => uint256) lastDepositTime;
    }
    
    // Trading Pair with Mento Integration
    struct TradingPair {
        address tokenA;
        address tokenB;
        bool active;
        bool hasAmmPool;
        bool hasMentoRoute;
        uint256 lastPrice;
        uint256 volume24h;
        uint256 lastTradeTimestamp;
        address exchangeProvider; // BiPoolManager
        bytes32 exchangeId; // Mento exchange ID
        uint256 minOrderSize;
        uint256 maxSlippageBps;
    }
    
    // Price Oracle Data
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;
        address source; // AMM, Mento, or Admin
    }
    
    // Admin Management
    mapping(address => bool) public admins;
    mapping(address => uint256) public adminExecutionCount;
    mapping(address => bool) public liquidityProviders;
    
    // Core Mappings
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => TradingPair) public tradingPairs;
    mapping(bytes32 => LiquidityPool) public liquidityPools;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(bytes32 => uint256[]) public pairOrders;
    mapping(address => uint256) public collectedFees;
    mapping(bytes32 => PriceData) public priceFeeds;
    
    // Arrays for enumeration
    address[] public supportedTokensList;
    bytes32[] public activePairs;
    bytes32[] public activeAmmPools;
    uint256[] public activeOrderIds;
    
    // Counters and Stats
    uint256 public nextOrderId = 1;
    uint256 public totalTrades;
    uint256 public totalVolume;
    uint256 public totalAmmVolume;
    uint256 public totalOrderVolume;
    uint256 public pendingOrdersCount;
    uint256 public totalLiquidityUSD;
    
    // Events
    event OrderPlaced(uint256 indexed orderId, address indexed trader, bytes32 indexed pair, OrderType orderType, OrderSide side, uint256 amountIn, uint256 limitPrice);
    event OrderExecuted(uint256 indexed orderId, address indexed executedBy, uint256 executedAmount, uint256 executedPrice, string note, ExecutionMode mode);
    event OrderCancelled(uint256 indexed orderId, address indexed cancelledBy, string reason);
    event OrderFailed(uint256 indexed orderId, address indexed admin, string reason);
    event LiquidityAdded(bytes32 indexed pairId, address indexed provider, uint256 amountA, uint256 amountB, uint256 shares);
    event LiquidityRemoved(bytes32 indexed pairId, address indexed provider, uint256 amountA, uint256 amountB, uint256 shares);
    event AmmSwap(bytes32 indexed pairId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event MentoSwap(bytes32 indexed pairId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event PriceUpdate(bytes32 indexed pairId, uint256 newPrice, uint256 timestamp, address source);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event TradingPairAdded(bytes32 indexed pairId, address indexed tokenA, address indexed tokenB, bool hasAmm, bool hasMento);
    event TokenAdded(address indexed token);
    event ExecutionModeChanged(ExecutionMode newMode, address changedBy);
    
    // Modifiers
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Only admin can execute");
        _;
    }
    
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }
    
    modifier validOrder(uint256 orderId) {
        require(orders[orderId].orderId != 0, "Order does not exist");
        _;
    }
    
    modifier activePair(bytes32 pairId) {
        require(tradingPairs[pairId].active, "Trading pair not active");
        _;
    }
    
    modifier whenAmmEnabled() {
        require(ammEnabled, "AMM disabled");
        _;
    }
    
    modifier whenOrderBookEnabled() {
        require(orderBookEnabled, "Order book disabled");
        _;
    }
    
    constructor(
        address _mentoBroker,
        address _baseToken
    ) {
        require(_mentoBroker != address(0), "Invalid broker address");
        require(_baseToken != address(0), "Invalid base token address");
        
        mentoBroker = _mentoBroker;
        baseToken = _baseToken;
        
        // Add deployer as admin and LP
        admins[msg.sender] = true;
        liquidityProviders[msg.sender] = true;
        
        // Add base token as supported
        supportedTokens[_baseToken] = true;
        supportedTokensList.push(_baseToken);
        emit TokenAdded(_baseToken);
    }
    
    // ================================
    // ADMIN & CONFIGURATION FUNCTIONS
    // ================================
    
    function addAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        require(!admins[newAdmin], "Already an admin");
        
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin, msg.sender);
    }
    
    function removeAdmin(address admin) external onlyOwner {
        require(admin != owner(), "Cannot remove owner");
        require(admins[admin], "Not an admin");
        
        admins[admin] = false;
        emit AdminRemoved(admin, msg.sender);
    }
    
    function addLiquidityProvider(address provider) external onlyOwner {
        liquidityProviders[provider] = true;
    }
    
    function setExecutionMode(ExecutionMode _mode) external onlyOwner {
        defaultExecutionMode = _mode;
        emit ExecutionModeChanged(_mode, msg.sender);
    }
    
    function setFeatures(bool _ammEnabled, bool _orderBookEnabled) external onlyOwner {
        ammEnabled = _ammEnabled;
        orderBookEnabled = _orderBookEnabled;
    }
    
    function setFees(uint256 _ammFeeBps, uint256 _orderFeeBps) external onlyOwner {
        require(_ammFeeBps <= MAX_FEE_BPS && _orderFeeBps <= MAX_FEE_BPS, "Fee too high");
        ammFeeBps = _ammFeeBps;
        orderFeeBps = _orderFeeBps;
    }
    
    // ================================
    // TOKEN & PAIR MANAGEMENT
    // ================================
    
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        supportedTokensList.push(token);
        
        // Auto-approve token for Mento broker
        IERC20(token).approve(mentoBroker, type(uint256).max);
        
        emit TokenAdded(token);
    }
    
    function addTradingPair(
        address tokenA,
        address tokenB,
        address exchangeProvider,
        bytes32 exchangeId,
        uint256 minOrderSize,
        bool enableAmm,
        bool enableMento
    ) external onlyOwner {
        require(supportedTokens[tokenA] && supportedTokens[tokenB], "Tokens not supported");
        require(tokenA != tokenB, "Cannot pair token with itself");
        require(enableAmm || enableMento, "Must enable at least one execution method");
        
        bytes32 pairId = getPairId(tokenA, tokenB);
        require(!tradingPairs[pairId].active, "Pair already exists");
        
        tradingPairs[pairId] = TradingPair({
            tokenA: tokenA,
            tokenB: tokenB,
            active: true,
            hasAmmPool: enableAmm,
            hasMentoRoute: enableMento,
            lastPrice: 0,
            volume24h: 0,
            lastTradeTimestamp: 0,
            exchangeProvider: exchangeProvider,
            exchangeId: exchangeId,
            minOrderSize: minOrderSize,
            maxSlippageBps: 500 // 5% default max slippage
        });
        
        activePairs.push(pairId);
        
        // Initialize AMM pool if enabled
        if (enableAmm) {
            _initializeAmmPool(pairId, tokenA, tokenB);
        }
        
        emit TradingPairAdded(pairId, tokenA, tokenB, enableAmm, enableMento);
    }
    
    function _initializeAmmPool(bytes32 pairId, address tokenA, address tokenB) internal {
        LiquidityPool storage pool = liquidityPools[pairId];
        pool.tokenA = tokenA;
        pool.tokenB = tokenB;
        pool.active = true;
        pool.minLiquidity = MIN_LIQUIDITY;
        pool.lastUpdateTime = block.timestamp;
        
        activeAmmPools.push(pairId);
    }
    
    // ================================
    // AMM LIQUIDITY FUNCTIONS
    // ================================
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant onlySupportedToken(tokenA) onlySupportedToken(tokenB) whenAmmEnabled returns (uint256 shares) {
        bytes32 pairId = getPairId(tokenA, tokenB);
        require(tradingPairs[pairId].hasAmmPool, "AMM not enabled for this pair");
        
        LiquidityPool storage pool = liquidityPools[pairId];
        require(pool.active, "Pool not active");
        
        uint256 amountA = amountADesired;
        uint256 amountB = amountBDesired;
        
        if (pool.totalShares > 0) {
            // Calculate optimal amounts to maintain ratio
            uint256 ratioA = (amountA * pool.reserveB) / pool.reserveA;
            uint256 ratioB = (amountB * pool.reserveA) / pool.reserveB;
            
            if (ratioA <= amountB) {
                amountB = ratioA;
                require(amountB >= amountBMin, "Insufficient B amount");
            } else {
                amountA = ratioB;
                require(amountA >= amountAMin, "Insufficient A amount");
            }
            
            shares = Math.min(
                (amountA * pool.totalShares) / pool.reserveA,
                (amountB * pool.totalShares) / pool.reserveB
            );
        } else {
            // First liquidity provision
            shares = Math.sqrt(amountA * amountB) - MIN_LIQUIDITY;
            require(shares > 0, "Insufficient liquidity");
            pool.totalShares = MIN_LIQUIDITY; // Permanently lock minimum liquidity
        }
        
        require(shares > 0, "No shares minted");
        
        // Transfer tokens
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
        
        // Update pool
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalShares += shares;
        pool.shares[msg.sender] += shares;
        pool.lastDepositTime[msg.sender] = block.timestamp;
        pool.lastUpdateTime = block.timestamp;
        
        // Update price
        _updatePoolPrice(pairId);
        
        emit LiquidityAdded(pairId, msg.sender, amountA, amountB, shares);
        
        return shares;
    }
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 shares,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant whenAmmEnabled returns (uint256 amountA, uint256 amountB) {
        bytes32 pairId = getPairId(tokenA, tokenB);
        LiquidityPool storage pool = liquidityPools[pairId];
        
        require(pool.shares[msg.sender] >= shares, "Insufficient shares");
        require(pool.totalShares > 0, "No liquidity");
        
        // Calculate amounts
        amountA = (shares * pool.reserveA) / pool.totalShares;
        amountB = (shares * pool.reserveB) / pool.totalShares;
        
        require(amountA >= amountAMin && amountB >= amountBMin, "Insufficient output amounts");
        
        // Update pool
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalShares -= shares;
        pool.shares[msg.sender] -= shares;
        pool.lastUpdateTime = block.timestamp;
        
        // Transfer tokens
        IERC20(tokenA).safeTransfer(msg.sender, amountA);
        IERC20(tokenB).safeTransfer(msg.sender, amountB);
        
        // Update price
        _updatePoolPrice(pairId);
        
        emit LiquidityRemoved(pairId, msg.sender, amountA, amountB, shares);
        
        return (amountA, amountB);
    }
    
    // ================================
    // SMART ROUTING & EXECUTION
    // ================================
    
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        ExecutionMode mode
    ) external nonReentrant onlySupportedToken(tokenIn) onlySupportedToken(tokenOut) returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");
        require(tokenIn != tokenOut, "Cannot swap same token");
        
        bytes32 pairId = getPairId(tokenIn, tokenOut);
        require(tradingPairs[pairId].active, "Trading pair not active");
        
        // Transfer input tokens
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Route execution based on mode and conditions
        ExecutionMode executionMode = mode == ExecutionMode.AUTO ? _determineOptimalRoute(pairId, amountIn) : mode;
        
        if (executionMode == ExecutionMode.AMM_ONLY) {
            amountOut = _executeAmmSwap(pairId, tokenIn, tokenOut, amountIn, amountOutMin);
        } else if (executionMode == ExecutionMode.MENTO_ONLY) {
            amountOut = _executeMentoSwap(pairId, tokenIn, tokenOut, amountIn, amountOutMin);
        } else {
            // For ORDER_ONLY mode, place an immediate market order
            uint256 orderId = _placeMarketOrder(tokenIn, tokenOut, amountIn, amountOutMin);
            // Return order ID as amount (frontend can handle this)
            return orderId;
        }
        
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        // Transfer output tokens
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        return amountOut;
    }
    
    function _determineOptimalRoute(bytes32 pairId, uint256 amountIn) internal view returns (ExecutionMode) {
        TradingPair storage pair = tradingPairs[pairId];
        
        // Check AMM liquidity
        if (pair.hasAmmPool && ammEnabled) {
            LiquidityPool storage pool = liquidityPools[pairId];
            uint256 poolLiquidity = (pool.reserveA * pool.reserveB) / PRECISION;
            
            // If AMM has good liquidity (>10x trade size), use AMM
            if (poolLiquidity > amountIn * 10) {
                return ExecutionMode.AMM_ONLY;
            }
        }
        
        // If Mento route available, use it for better rates
        if (pair.hasMentoRoute) {
            return ExecutionMode.MENTO_ONLY;
        }
        
        // Default to order book
        return ExecutionMode.ORDER_ONLY;
    }
    
    function _executeAmmSwap(
        bytes32 pairId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        LiquidityPool storage pool = liquidityPools[pairId];
        require(pool.active && pool.totalShares > 0, "Pool not available");
        
        // Calculate swap with fees
        uint256 amountInWithFee = amountIn * (10000 - ammFeeBps) / 10000;
        
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == pool.tokenA 
            ? (pool.reserveA, pool.reserveB) 
            : (pool.reserveB, pool.reserveA);
        
        // Constant product formula: x * y = k
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        
        require(amountOut >= amountOutMin, "Insufficient output amount");
        require(amountOut < reserveOut, "Insufficient liquidity");
        
        // Update reserves
        if (tokenIn == pool.tokenA) {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }
        
        // Collect fees
        uint256 fee = amountIn - amountInWithFee;
        if (fee > 0) {
            collectedFees[tokenIn] += fee;
            pool.fees24h += fee;
        }
        
        // Update stats
        pool.volume24h += amountIn;
        pool.lastUpdateTime = block.timestamp;
        totalAmmVolume += amountIn;
        totalTrades++;
        
        // Update price
        _updatePoolPrice(pairId);
        
        emit AmmSwap(pairId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        
        return amountOut;
    }
    
    function _executeMentoSwap(
        bytes32 pairId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.hasMentoRoute, "Mento route not available");
        
        // Calculate fees
        uint256 fee = (amountIn * orderFeeBps) / 10000;
        uint256 amountInAfterFee = amountIn - fee;
        
        // Execute via Mento
        amountOut = IMentoBroker(mentoBroker).swapIn(
            pair.exchangeProvider,
            pair.exchangeId,
            tokenIn,
            tokenOut,
            amountInAfterFee,
            amountOutMin
        );
        
        require(amountOut >= amountOutMin, "Insufficient output from Mento");
        
        // Collect fees
        if (fee > 0) {
            collectedFees[tokenIn] += fee;
        }
        
        // Update stats
        pair.volume24h += amountIn;
        pair.lastTradeTimestamp = block.timestamp;
        totalOrderVolume += amountIn;
        totalTrades++;
        
        // Update price based on execution
        uint256 executionPrice = (amountOut * PRECISION) / amountInAfterFee;
        pair.lastPrice = executionPrice;
        _updatePriceFeed(pairId, executionPrice, address(this));
        
        emit MentoSwap(pairId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        
        return amountOut;
    }
    
    // ================================
    // ORDER BOOK FUNCTIONS
    // ================================
    
    function placeOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 limitPrice, // 0 for market orders
        uint256 stopPrice,  // 0 for non-stop orders
        uint256 minAmountOut,
        OrderType orderType,
        uint256 expiresAt,
        bool allowPartialFill,
        ExecutionMode preferredMode
    ) external nonReentrant onlySupportedToken(tokenIn) onlySupportedToken(tokenOut) whenOrderBookEnabled returns (uint256 orderId) {
        require(amountIn > 0, "Invalid amount");
        require(tokenIn != tokenOut, "Cannot trade same token");
        
        bytes32 pairId = getPairId(tokenIn, tokenOut);
        require(tradingPairs[pairId].active, "Trading pair not active");
        require(amountIn >= tradingPairs[pairId].minOrderSize, "Order below minimum size");
        
        if (expiresAt == 0) {
            expiresAt = block.timestamp + ORDER_EXPIRY_TIME;
        }
        require(expiresAt > block.timestamp, "Invalid expiry time");
        
        OrderSide side = tokenOut == baseToken ? OrderSide.SELL : OrderSide.BUY;
        
        orderId = nextOrderId++;
        
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            limitPrice: limitPrice,
            stopPrice: stopPrice,
            minAmountOut: minAmountOut,
            orderType: orderType,
            side: side,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            executedAmount: 0,
            remainingAmount: amountIn,
            executedPrice: 0,
            executionNote: "",
            executedBy: address(0),
            executedAt: 0,
            allowPartialFill: allowPartialFill,
            preferredMode: preferredMode
        });
        
        userOrders[msg.sender].push(orderId);
        pairOrders[pairId].push(orderId);
        activeOrderIds.push(orderId);
        pendingOrdersCount++;
        
        // Transfer tokens to contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        emit OrderPlaced(orderId, msg.sender, pairId, orderType, side, amountIn, limitPrice);
        
        // Try immediate execution for market orders
        if (orderType == OrderType.MARKET) {
            _tryExecuteOrderImmediately(orderId);
        }
        
        return orderId;
    }
    
    function _placeMarketOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 orderId) {
        bytes32 pairId = getPairId(tokenIn, tokenOut);
        OrderSide side = tokenOut == baseToken ? OrderSide.SELL : OrderSide.BUY;
        
        orderId = nextOrderId++;
        
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            limitPrice: 0,
            stopPrice: 0,
            minAmountOut: minAmountOut,
            orderType: OrderType.MARKET,
            side: side,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + 1 hours, // Short expiry for market orders
            executedAmount: 0,
            remainingAmount: amountIn,
            executedPrice: 0,
            executionNote: "",
            executedBy: address(0),
            executedAt: 0,
            allowPartialFill: false,
            preferredMode: ExecutionMode.AUTO
        });
        
        userOrders[msg.sender].push(orderId);
        pairOrders[pairId].push(orderId);
        activeOrderIds.push(orderId);
        pendingOrdersCount++;
        
        // Try immediate execution
        _tryExecuteOrderImmediately(orderId);
        
        return orderId;
    }
    
    function _tryExecuteOrderImmediately(uint256 orderId) internal {
        Order storage order = orders[orderId];
        bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
        TradingPair storage pair = tradingPairs[pairId];
        
        // Try AMM first if available and has good liquidity
        if (pair.hasAmmPool && ammEnabled) {
            LiquidityPool storage pool = liquidityPools[pairId];
            if (pool.totalShares > 0 && _hassufficientAmmLiquidity(pairId, order.amountIn)) {
                try this.executeOrderViaAmm(orderId) {
                    return;
                } catch {
                    // Continue to other methods
                }
            }
        }
        
        // Try Mento if available
        if (pair.hasMentoRoute) {
            try this.executeOrderViaMento(orderId) {
                return;
            } catch {
                // Order remains pending for admin execution
            }
        }
    }
    
    // ================================
    // ADMIN EXECUTION FUNCTIONS
    // ================================
    
    function executeOrder(
        uint256 orderId,
        string calldata executionNote
    ) external onlyAdmin nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Order not pending");
        require(order.expiresAt > block.timestamp, "Order expired");
        
        bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
        
        // Try execution based on preferred mode
        if (order.preferredMode == ExecutionMode.AMM_ONLY) {
            _executeOrderViaAmm(orderId, executionNote);
            } else if (order.preferredMode == ExecutionMode.MENTO_ONLY) {
           _executeOrderViaMento(orderId, executionNote);
       } else {
           // Auto mode - try best available option
           _executeOrderAuto(orderId, executionNote);
       }
   }
   
   function _executeOrderAuto(uint256 orderId, string memory executionNote) internal {
       Order storage order = orders[orderId];
       bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
       TradingPair storage pair = tradingPairs[pairId];
       
       // Try AMM first if has good liquidity
       if (pair.hasAmmPool && _hassufficientAmmLiquidity(pairId, order.remainingAmount)) {
           try this.executeOrderViaAmm(orderId) {
               order.executionNote = string(abi.encodePacked("AMM: ", executionNote));
               return;
           } catch {
               // Continue to Mento
           }
       }
       
       // Try Mento
       if (pair.hasMentoRoute) {
           try this.executeOrderViaMento(orderId) {
               order.executionNote = string(abi.encodePacked("Mento: ", executionNote));
               return;
           } catch Error(string memory reason) {
               _markOrderFailed(orderId, reason);
               return;
           }
       }
       
       // If all methods fail
       _markOrderFailed(orderId, "No execution method available");
   }
   
   function executeOrderViaAmm(uint256 orderId) external returns (uint256 amountOut) {
       require(msg.sender == address(this) || admins[msg.sender], "Unauthorized");
       return _executeOrderViaAmm(orderId, "AMM execution");
   }
   
   function executeOrderViaMento(uint256 orderId) external returns (uint256 amountOut) {
       require(msg.sender == address(this) || admins[msg.sender], "Unauthorized");
       return _executeOrderViaMento(orderId, "Mento execution");
   }
   
   function _executeOrderViaAmm(uint256 orderId, string memory note) internal returns (uint256 amountOut) {
       Order storage order = orders[orderId];
       bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
       
       amountOut = _executeAmmSwap(pairId, order.tokenIn, order.tokenOut, order.remainingAmount, order.minAmountOut);
       
       // Calculate execution price
       uint256 executionPrice = (amountOut * PRECISION) / order.remainingAmount;
       
       // Check limit price for limit orders
       if (order.orderType == OrderType.LIMIT && order.limitPrice > 0) {
           bool priceAcceptable = order.side == OrderSide.BUY 
               ? executionPrice <= order.limitPrice 
               : executionPrice >= order.limitPrice;
           require(priceAcceptable, "Price not acceptable for limit order");
       }
       
       // Update order
       order.status = OrderStatus.EXECUTED;
       order.executedAmount = order.remainingAmount;
       order.remainingAmount = 0;
       order.executedPrice = executionPrice;
       order.executionNote = note;
       order.executedBy = msg.sender;
       order.executedAt = block.timestamp;
       
       // Transfer output to trader
       IERC20(order.tokenOut).safeTransfer(order.trader, amountOut);
       
       // Update stats
       pendingOrdersCount--;
       adminExecutionCount[msg.sender]++;
       totalOrderVolume += order.executedAmount;
       
       emit OrderExecuted(orderId, msg.sender, order.executedAmount, executionPrice, note, ExecutionMode.AMM_ONLY);
       
       return amountOut;
   }
   
   function _executeOrderViaMento(uint256 orderId, string memory note) internal returns (uint256 amountOut) {
       Order storage order = orders[orderId];
       bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
       TradingPair storage pair = tradingPairs[pairId];
       
       // Calculate fees
       uint256 fee = (order.remainingAmount * orderFeeBps) / 10000;
       uint256 amountInAfterFee = order.remainingAmount - fee;
       
       // Execute via Mento
       amountOut = IMentoBroker(mentoBroker).swapIn(
           pair.exchangeProvider,
           pair.exchangeId,
           order.tokenIn,
           order.tokenOut,
           amountInAfterFee,
           order.minAmountOut
       );
       
       // Calculate execution price
       uint256 executionPrice = (amountOut * PRECISION) / amountInAfterFee;
       
       // Check limit price
       if (order.orderType == OrderType.LIMIT && order.limitPrice > 0) {
           bool priceAcceptable = order.side == OrderSide.BUY 
               ? executionPrice <= order.limitPrice 
               : executionPrice >= order.limitPrice;
           require(priceAcceptable, "Price not acceptable for limit order");
       }
       
       // Collect fees
       if (fee > 0) {
           collectedFees[order.tokenIn] += fee;
       }
       
       // Update order
       order.status = OrderStatus.EXECUTED;
       order.executedAmount = order.remainingAmount;
       order.remainingAmount = 0;
       order.executedPrice = executionPrice;
       order.executionNote = note;
       order.executedBy = msg.sender;
       order.executedAt = block.timestamp;
       
       // Transfer output to trader
       IERC20(order.tokenOut).safeTransfer(order.trader, amountOut);
       
       // Update pair stats
       pair.lastPrice = executionPrice;
       pair.lastTradeTimestamp = block.timestamp;
       pair.volume24h += order.executedAmount;
       
       // Update stats
       pendingOrdersCount--;
       adminExecutionCount[msg.sender]++;
       totalOrderVolume += order.executedAmount;
       
       // Update price feed
       _updatePriceFeed(pairId, executionPrice, msg.sender);
       
       emit OrderExecuted(orderId, msg.sender, order.executedAmount, executionPrice, note, ExecutionMode.MENTO_ONLY);
       
       return amountOut;
   }
   
   function _markOrderFailed(uint256 orderId, string memory reason) internal {
       Order storage order = orders[orderId];
       order.status = OrderStatus.FAILED;
       order.executionNote = reason;
       order.executedBy = msg.sender;
       order.executedAt = block.timestamp;
       pendingOrdersCount--;
       
       // Refund tokens to trader
       IERC20(order.tokenIn).safeTransfer(order.trader, order.remainingAmount);
       
       emit OrderFailed(orderId, msg.sender, reason);
   }
   
   function cancelOrder(uint256 orderId, string calldata reason) external validOrder(orderId) {
       Order storage order = orders[orderId];
       require(
           order.trader == msg.sender || admins[msg.sender] || msg.sender == owner(),
           "Not authorized to cancel"
       );
       require(order.status == OrderStatus.PENDING, "Order not pending");
       
       order.status = OrderStatus.CANCELLED;
       pendingOrdersCount--;
       
       // Refund tokens to trader
       IERC20(order.tokenIn).safeTransfer(order.trader, order.remainingAmount);
       
       emit OrderCancelled(orderId, msg.sender, reason);
   }
   
   // ================================
   // BATCH OPERATIONS
   // ================================
   
   function batchExecuteOrders(
       uint256[] calldata orderIds,
       string[] calldata notes
   ) external onlyAdmin {
       require(orderIds.length == notes.length, "Arrays length mismatch");
       
       for (uint256 i = 0; i < orderIds.length; i++) {
           if (orders[orderIds[i]].status == OrderStatus.PENDING) {
               try this.executeOrder(orderIds[i], notes[i]) {
                   // Order executed successfully
               } catch {
                   // Continue with next order if this one fails
               }
           }
       }
   }
   
   function batchCancelExpiredOrders(uint256[] calldata orderIds) external onlyAdmin {
       for (uint256 i = 0; i < orderIds.length; i++) {
           uint256 orderId = orderIds[i];
           Order storage order = orders[orderId];
           
           if (order.status == OrderStatus.PENDING && order.expiresAt <= block.timestamp) {
               order.status = OrderStatus.EXPIRED;
               pendingOrdersCount--;
               
               // Refund tokens
               IERC20(order.tokenIn).safeTransfer(order.trader, order.remainingAmount);
               
               emit OrderCancelled(orderId, msg.sender, "Expired");
           }
       }
   }
   
   // ================================
   // HELPER FUNCTIONS
   // ================================
   
   function _hassufficientAmmLiquidity(bytes32 pairId, uint256 amountIn) internal view returns (bool) {
       LiquidityPool storage pool = liquidityPools[pairId];
       uint256 minReserve = Math.min(pool.reserveA, pool.reserveB);
       return minReserve > amountIn * 2; // At least 2x the trade amount
   }
   
   function _updatePoolPrice(bytes32 pairId) internal {
       LiquidityPool storage pool = liquidityPools[pairId];
       if (pool.reserveA > 0 && pool.reserveB > 0) {
           uint256 price = (pool.reserveB * PRECISION) / pool.reserveA;
           pool.lastPrice = price;
           _updatePriceFeed(pairId, price, address(this));
       }
   }
   
   function _updatePriceFeed(bytes32 pairId, uint256 price, address source) internal {
       priceFeeds[pairId] = PriceData({
           price: price,
           timestamp: block.timestamp,
           confidence: 100, // Full confidence for executed trades
           source: source
       });
       
       emit PriceUpdate(pairId, price, block.timestamp, source);
   }
   
   // ================================
   // VIEW FUNCTIONS
   // ================================
   
   function getSupportedTokens() external view returns (address[] memory) {
       return supportedTokensList;
   }
   
   function getActivePairs() external view returns (bytes32[] memory) {
       return activePairs;
   }
   
   function getActiveAmmPools() external view returns (bytes32[] memory) {
       return activeAmmPools;
   }
   
   function getPendingOrders(uint256 offset, uint256 limit) external view returns (Order[] memory) {
       uint256 pendingCount = 0;
       
       // Count pending orders
       for (uint256 i = 0; i < activeOrderIds.length; i++) {
           uint256 orderId = activeOrderIds[i];
           if (orders[orderId].status == OrderStatus.PENDING && orders[orderId].expiresAt > block.timestamp) {
               pendingCount++;
           }
       }
       
       // Create array of pending orders
       uint256 resultSize = pendingCount > limit ? limit : pendingCount;
       if (offset >= pendingCount) return new Order[](0);
       
       Order[] memory result = new Order[](resultSize);
       uint256 resultIndex = 0;
       uint256 currentOffset = 0;
       
       for (uint256 i = 0; i < activeOrderIds.length && resultIndex < resultSize; i++) {
           uint256 orderId = activeOrderIds[i];
           if (orders[orderId].status == OrderStatus.PENDING && orders[orderId].expiresAt > block.timestamp) {
               if (currentOffset >= offset) {
                   result[resultIndex] = orders[orderId];
                   resultIndex++;
               }
               currentOffset++;
           }
       }
       
       return result;
   }
   
   function getOrdersByUser(address user) external view returns (uint256[] memory) {
       return userOrders[user];
   }
   
   function getOrdersByPair(bytes32 pairId) external view returns (uint256[] memory) {
       return pairOrders[pairId];
   }
   
   function getLiquidityPoolInfo(bytes32 pairId) external view returns (
       address tokenA,
       address tokenB,
       uint256 reserveA,
       uint256 reserveB,
       uint256 totalShares,
       uint256 userShares,
       uint256 lastPrice
   ) {
       LiquidityPool storage pool = liquidityPools[pairId];
       return (
           pool.tokenA,
           pool.tokenB,
           pool.reserveA,
           pool.reserveB,
           pool.totalShares,
           pool.shares[msg.sender],
           pool.lastPrice
       );
   }
   
   function getMarketPrice(bytes32 pairId) external view returns (uint256) {
       // Try multiple sources for best price
       TradingPair storage pair = tradingPairs[pairId];
       
       // Check AMM price
       if (pair.hasAmmPool) {
           LiquidityPool storage pool = liquidityPools[pairId];
           if (pool.totalShares > 0) {
               return pool.lastPrice;
           }
       }
       
       // Check Mento price
       if (pair.hasMentoRoute) {
           try IMentoBroker(mentoBroker).getAmountOut(
               pair.exchangeProvider,
               pair.exchangeId,
               pair.tokenA,
               pair.tokenB,
               PRECISION
           ) returns (uint256 amountOut) {
               return amountOut;
           } catch {
               // Continue to price feed
           }
       }
       
       // Return cached price
       return priceFeeds[pairId].price;
   }
   
   function getSwapAmountOut(
       address tokenIn,
       address tokenOut,
       uint256 amountIn
   ) external view returns (uint256 bestAmountOut, ExecutionMode bestMode) {
       bytes32 pairId = getPairId(tokenIn, tokenOut);
       TradingPair storage pair = tradingPairs[pairId];
       
       uint256 ammOut = 0;
       uint256 mentoOut = 0;
       
       // Check AMM output
       if (pair.hasAmmPool) {
           LiquidityPool storage pool = liquidityPools[pairId];
           if (pool.totalShares > 0) {
               uint256 amountInWithFee = amountIn * (10000 - ammFeeBps) / 10000;
               (uint256 reserveIn, uint256 reserveOut) = tokenIn == pool.tokenA 
                   ? (pool.reserveA, pool.reserveB) 
                   : (pool.reserveB, pool.reserveA);
               
               if (reserveIn > 0 && amountInWithFee < reserveIn) {
                   ammOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
               }
           }
       }
       
       // Check Mento output
       if (pair.hasMentoRoute) {
           try IMentoBroker(mentoBroker).getAmountOut(
               pair.exchangeProvider,
               pair.exchangeId,
               tokenIn,
               tokenOut,
               amountIn
           ) returns (uint256 amountOut) {
               // Subtract fees
               mentoOut = amountOut * (10000 - orderFeeBps) / 10000;
           } catch {
               mentoOut = 0;
           }
       }
       
       // Return best option
       if (ammOut > mentoOut) {
           return (ammOut, ExecutionMode.AMM_ONLY);
       } else if (mentoOut > 0) {
           return (mentoOut, ExecutionMode.MENTO_ONLY);
       } else {
           return (0, ExecutionMode.ORDER_ONLY);
       }
   }
   
   // ================================
   // UTILITY FUNCTIONS
   // ================================
   
   function getPairId(address tokenA, address tokenB) public pure returns (bytes32) {
       return tokenA < tokenB 
           ? keccak256(abi.encodePacked(tokenA, tokenB)) 
           : keccak256(abi.encodePacked(tokenB, tokenA));
   }
   
   function withdrawFees(address token, uint256 amount) external onlyOwner {
       uint256 balance = collectedFees[token];
       require(balance > 0, "No fees to withdraw");
       
       uint256 withdrawAmount = amount == 0 ? balance : amount;
       require(withdrawAmount <= balance, "Insufficient fee balance");
       
       collectedFees[token] -= withdrawAmount;
       IERC20(token).safeTransfer(owner(), withdrawAmount);
   }
   
   function emergencyPause(bytes32 pairId) external onlyOwner {
       tradingPairs[pairId].active = false;
       liquidityPools[pairId].active = false;
   }
   
   function emergencyResume(bytes32 pairId) external onlyOwner {
       tradingPairs[pairId].active = true;
       liquidityPools[pairId].active = true;
   }
   
   function updatePriceFeed(bytes32 pairId, uint256 newPrice) external onlyAdmin {
       _updatePriceFeed(pairId, newPrice, msg.sender);
   }
   
   // Receive native tokens if needed
   receive() external payable {}
}