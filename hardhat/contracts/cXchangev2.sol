// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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
 * @title cXchange v2
 * @notice Admin-managed order book DEX with backend execution
 * @dev Orders are placed by users, executed by admins via backend systems
 */
contract cXchangev2 is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant ORDER_EXPIRY_TIME = 7 days;
    
    // Configuration
    address public mentoBroker;
    address public baseToken; // cUSD
    uint256 public tradingFeeBps = 30; // 0.3%
    bool public adminExecutionMode = true; // Admin controls execution
    
    // Order System
    enum OrderType { MARKET, LIMIT }
    enum OrderSide { BUY, SELL }
    enum OrderStatus { PENDING, EXECUTED, CANCELLED, EXPIRED, FAILED }
    
    struct Order {
        uint256 orderId;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 limitPrice; // Price per token in base token units (0 for market orders)
        uint256 minAmountOut; // Minimum acceptable output
        OrderType orderType;
        OrderSide side;
        OrderStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 executedAmount; // Amount actually traded
        uint256 executedPrice; // Actual execution price
        string executionNote; // Admin notes for execution
        address executedBy; // Which admin executed this
        uint256 executedAt; // When was it executed
    }
    
    struct TradingPair {
        address tokenA;
        address tokenB;
        bool active;
        uint256 lastPrice;
        uint256 volume24h;
        uint256 lastTradeTimestamp;
        address exchangeProvider; // BiPoolManager
        bytes32 exchangeId; // Mento exchange ID
        uint256 minOrderSize; // Minimum order size
    }
    
    // Admin Management
    mapping(address => bool) public admins;
    mapping(address => uint256) public adminExecutionCount;
    
    // Order Management  
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => TradingPair) public tradingPairs;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(bytes32 => uint256[]) public pairOrders; // Orders for each pair
    mapping(address => uint256) public collectedFees;
    
    address[] public supportedTokensList;
    bytes32[] public activePairs;
    uint256 public nextOrderId = 1;
    uint256 public totalTrades;
    uint256 public totalVolume;
    uint256 public pendingOrdersCount;
    
    // Events
    event OrderPlaced(uint256 indexed orderId, address indexed trader, bytes32 indexed pair, OrderType orderType, OrderSide side, uint256 amountIn, uint256 limitPrice);
    event OrderExecuted(uint256 indexed orderId, address indexed executedBy, uint256 executedAmount, uint256 executedPrice, string note);
    event OrderCancelled(uint256 indexed orderId, address indexed cancelledBy, string reason);
    event OrderFailed(uint256 indexed orderId, address indexed admin, string reason);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event TradingPairAdded(bytes32 indexed pairId, address indexed tokenA, address indexed tokenB);
    event TokenAdded(address indexed token);
    event ExecutionModeChanged(bool adminMode, address changedBy);
    event PriceFeedUpdate(bytes32 indexed pairId, uint256 newPrice, uint256 timestamp);
    
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
    
    constructor(
        address _mentoBroker,
        address _baseToken
    ) {
        require(_mentoBroker != address(0), "Invalid broker address");
        require(_baseToken != address(0), "Invalid base token address");
        
        mentoBroker = _mentoBroker;
        baseToken = _baseToken;
        
        // Add deployer as admin
        admins[msg.sender] = true;
        
        // Add base token as supported
        supportedTokens[_baseToken] = true;
        supportedTokensList.push(_baseToken);
        emit TokenAdded(_baseToken);
    }
    
    // Admin Management
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
    
    function setExecutionMode(bool _adminMode) external onlyOwner {
        adminExecutionMode = _adminMode;
        emit ExecutionModeChanged(_adminMode, msg.sender);
    }
    
    // Token & Pair Management
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
        uint256 minOrderSize
    ) external onlyOwner {
        require(supportedTokens[tokenA] && supportedTokens[tokenB], "Tokens not supported");
        require(tokenA != tokenB, "Cannot pair token with itself");
        
        bytes32 pairId = getPairId(tokenA, tokenB);
        require(!tradingPairs[pairId].active, "Pair already exists");
        
        tradingPairs[pairId] = TradingPair({
            tokenA: tokenA,
            tokenB: tokenB,
            active: true,
            lastPrice: 0,
            volume24h: 0,
            lastTradeTimestamp: 0,
            exchangeProvider: exchangeProvider,
            exchangeId: exchangeId,
            minOrderSize: minOrderSize
        });
        
        activePairs.push(pairId);
        emit TradingPairAdded(pairId, tokenA, tokenB);
    }
    
    // User Order Placement
    function placeOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 limitPrice, // 0 for market orders
        uint256 minAmountOut, // Slippage protection
        uint256 expiresAt
    ) external nonReentrant onlySupportedToken(tokenIn) onlySupportedToken(tokenOut) returns (uint256 orderId) {
        require(amountIn > 0, "Invalid amount");
        require(tokenIn != tokenOut, "Cannot trade same token");
        
        bytes32 pairId = getPairId(tokenIn, tokenOut);
        require(tradingPairs[pairId].active, "Trading pair not active");
        require(amountIn >= tradingPairs[pairId].minOrderSize, "Order below minimum size");
        
        if (expiresAt == 0) {
            expiresAt = block.timestamp + ORDER_EXPIRY_TIME;
        }
        require(expiresAt > block.timestamp, "Invalid expiry time");
        
        OrderType orderType = limitPrice == 0 ? OrderType.MARKET : OrderType.LIMIT;
        OrderSide side = tokenOut == baseToken ? OrderSide.SELL : OrderSide.BUY;
        
        orderId = nextOrderId++;
        
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            limitPrice: limitPrice,
            minAmountOut: minAmountOut,
            orderType: orderType,
            side: side,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            executedAmount: 0,
            executedPrice: 0,
            executionNote: "",
            executedBy: address(0),
            executedAt: 0
        });
        
        userOrders[msg.sender].push(orderId);
        pairOrders[pairId].push(orderId);
        pendingOrdersCount++;
        
        // Transfer tokens to contract (DEX holds user funds)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        emit OrderPlaced(orderId, msg.sender, pairId, orderType, side, amountIn, limitPrice);
        
        return orderId;
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
        IERC20(order.tokenIn).safeTransfer(order.trader, order.amountIn);
        
        emit OrderCancelled(orderId, msg.sender, reason);
    }
    
    // Admin Execution Functions
    function executeOrder(
        uint256 orderId,
        string calldata executionNote
    ) external onlyAdmin nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Order not pending");
        require(order.expiresAt > block.timestamp, "Order expired");
        
        bytes32 pairId = getPairId(order.tokenIn, order.tokenOut);
        TradingPair storage pair = tradingPairs[pairId];
        
        try this.executeViaMento(
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.minAmountOut,
            pair.exchangeProvider,
            pair.exchangeId
        ) returns (uint256 amountOut) {
            
            // Calculate execution price
            uint256 executionPrice = _calculatePrice(order.tokenIn, order.tokenOut, order.amountIn, amountOut);
            
            // Check if limit order price is acceptable
            if (order.orderType == OrderType.LIMIT && order.limitPrice > 0) {
                bool priceAcceptable = order.side == OrderSide.BUY 
                    ? executionPrice <= order.limitPrice 
                    : executionPrice >= order.limitPrice;
                require(priceAcceptable, "Execution price not acceptable for limit order");
            }
            
            // Calculate and collect fees
            uint256 fee = (amountOut * tradingFeeBps) / 10000;
            uint256 netAmountOut = amountOut - fee;
            
            // Transfer tokens to trader
            IERC20(order.tokenOut).safeTransfer(order.trader, netAmountOut);
            
            // Collect fees
            if (fee > 0) {
                collectedFees[order.tokenOut] += fee;
            }
            
            // Update order
            order.status = OrderStatus.EXECUTED;
            order.executedAmount = order.amountIn;
            order.executedPrice = executionPrice;
            order.executionNote = executionNote;
            order.executedBy = msg.sender;
            order.executedAt = block.timestamp;
            
            // Update pair stats
            pair.lastPrice = executionPrice;
            pair.lastTradeTimestamp = block.timestamp;
            pair.volume24h += order.amountIn;
            
            // Update global stats
            totalTrades++;
            totalVolume += order.amountIn;
            pendingOrdersCount--;
            adminExecutionCount[msg.sender]++;
            
            emit OrderExecuted(orderId, msg.sender, order.amountIn, executionPrice, executionNote);
            
        } catch Error(string memory reason) {
            // Mark order as failed but don't revert (allow admin to handle)
            order.status = OrderStatus.FAILED;
            order.executionNote = reason;
            order.executedBy = msg.sender;
            order.executedAt = block.timestamp;
            pendingOrdersCount--;
            
            // Refund tokens to trader
            IERC20(order.tokenIn).safeTransfer(order.trader, order.amountIn);
            
            emit OrderFailed(orderId, msg.sender, reason);
        }
    }
    
    function executeViaMento(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address exchangeProvider,
        bytes32 exchangeId
    ) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "Internal only");
        
        // Execute swap via Mento
        amountOut = IMentoBroker(mentoBroker).swapIn(
            exchangeProvider,
            exchangeId,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut
        );
        
        return amountOut;
    }
    
    // Batch Admin Operations
    function batchExecuteOrders(
        uint256[] calldata orderIds,
        string[] calldata notes
    ) external onlyAdmin {
        require(orderIds.length == notes.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            try this.executeOrder(orderIds[i], notes[i]) {
                // Order executed successfully
            } catch {
                // Continue with next order if this one fails
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
                IERC20(order.tokenIn).safeTransfer(order.trader, order.amountIn);
                
                emit OrderCancelled(orderId, msg.sender, "Expired");
            }
        }
    }
    
    // Price Feed Updates (for backend monitoring)
    function updatePriceFeed(bytes32 pairId, uint256 newPrice) external onlyAdmin activePair(pairId) {
        TradingPair storage pair = tradingPairs[pairId];
        pair.lastPrice = newPrice;
        
        emit PriceFeedUpdate(pairId, newPrice, block.timestamp);
    }
    
    // View Functions for Backend
    function getPendingOrders(uint256 offset, uint256 limit) external view returns (Order[] memory) {
        uint256 pendingCount = 0;
        
        // Count pending orders
        for (uint256 i = 1; i < nextOrderId; i++) {
            if (orders[i].status == OrderStatus.PENDING && orders[i].expiresAt > block.timestamp) {
                pendingCount++;
            }
        }
        
        // Create array of pending orders
        uint256 resultSize = pendingCount > limit ? limit : pendingCount;
        if (offset >= pendingCount) return new Order[](0);
        
        Order[] memory result = new Order[](resultSize);
        uint256 resultIndex = 0;
        uint256 currentOffset = 0;
        
        for (uint256 i = 1; i < nextOrderId && resultIndex < resultSize; i++) {
            if (orders[i].status == OrderStatus.PENDING && orders[i].expiresAt > block.timestamp) {
                if (currentOffset >= offset) {
                    result[resultIndex] = orders[i];
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
    
    function getMarketPrice(bytes32 pairId) external view returns (uint256) {
        TradingPair storage pair = tradingPairs[pairId];
        
        // Try to get live price from Mento
        try IMentoBroker(mentoBroker).getAmountOut(
            pair.exchangeProvider,
            pair.exchangeId,
            pair.tokenA,
            pair.tokenB,
            PRECISION
        ) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            // Return last known price
            return pair.lastPrice;
        }
    }
    
    // Utility Functions
    function getPairId(address tokenA, address tokenB) public pure returns (bytes32) {
        return tokenA < tokenB 
            ? keccak256(abi.encodePacked(tokenA, tokenB)) 
            : keccak256(abi.encodePacked(tokenB, tokenA));
    }
    
    function _calculatePrice(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal view returns (uint256) {
        if (tokenOut == baseToken) {
            return (amountOut * PRECISION) / amountIn;
        } else if (tokenIn == baseToken) {
            return (amountIn * PRECISION) / amountOut;
        } else {
            // Both tokens need to be priced in base token
            return PRECISION; // Simplified for now
        }
    }
    
    // Admin Fee Management
    function withdrawFees(address token, uint256 amount) external onlyOwner {
        uint256 balance = collectedFees[token];
        require(balance > 0, "No fees to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient fee balance");
        
        collectedFees[token] -= withdrawAmount;
        IERC20(token).safeTransfer(owner(), withdrawAmount);
    }
    
    // Emergency Functions
    function emergencyPause(bytes32 pairId) external onlyOwner {
        tradingPairs[pairId].active = false;
    }
    
    function emergencyResume(bytes32 pairId) external onlyOwner {
        tradingPairs[pairId].active = true;
    }
    
    // Receive native tokens if needed
    receive() external payable {}
}