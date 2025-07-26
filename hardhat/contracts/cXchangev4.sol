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

interface IBiPoolManager {
    struct Exchange {
        bytes32 exchangeId;
        address[] assets;
    }
    
    function getExchanges() external view returns (Exchange[] memory exchanges);
}

/**
 * @title cXchangev4
 * @notice A streamlined DEX that routes all trades through Mento protocol
 * @dev Provides a clean interface for multi-currency swaps with professional fee management
 * @author cXchange Team
 */
contract cXchangev4 is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% maximum fee
    uint256 public constant DEFAULT_FEE_BPS = 10; // 0.1% default fee (0.001 * 100)

    // Core configuration
    address public immutable mentoBroker;
    address public immutable biPoolManager;
    uint256 public protocolFeeBps;
    
    // Access control
    mapping(address => bool) public superAdmins;
    mapping(address => bool) public contractAdmins;
    
    // Asset and pair management
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => bool) public supportedPairs;
    mapping(bytes32 => address) public pairExchangeProvider;
    mapping(bytes32 => bytes32) public pairExchangeId;
    mapping(address => uint256) public protocolFees;
    
    // Data structures for enumeration
    address[] public tokenList;
    bytes32[] public pairList;
    
    // Protocol statistics
    uint256 public totalSwaps;
    uint256 public totalVolume;
    uint256 public totalFeesCollected;
    mapping(address => uint256) public tokenVolume;
    mapping(address => uint256) public tokenSwapCount;
    
    // Events
    event TokenAdded(address indexed token, uint256 timestamp);
    event PairAdded(bytes32 indexed pairId, address indexed tokenA, address indexed tokenB, bytes32 exchangeId);
    event SwapExecuted(
        address indexed user, 
        address indexed tokenIn, 
        address indexed tokenOut, 
        uint256 amountIn, 
        uint256 amountOut, 
        uint256 protocolFee,
        uint256 timestamp
    );
    event ProtocolFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps, address updatedBy);
    event ProtocolFeesWithdrawn(address indexed token, uint256 amount, address withdrawnBy);
    event SuperAdminAdded(address indexed admin, address addedBy);
    event SuperAdminRemoved(address indexed admin, address removedBy);
    event ContractAdminAdded(address indexed admin, address addedBy);
    event ContractAdminRemoved(address indexed admin, address removedBy);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address withdrawnBy, string reason);
    
    // Modifiers
    modifier onlySuperAdmin() {
        require(superAdmins[msg.sender] || msg.sender == owner(), "Unauthorized: SuperAdmin access required");
        _;
    }
    
    modifier onlyAuthorizedAdmin() {
        require(
            superAdmins[msg.sender] || contractAdmins[msg.sender] || msg.sender == owner(),
            "Unauthorized: Admin access required"
        );
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address: Cannot be zero address");
        _;
    }
    
    modifier supportedToken(address token) {
        require(supportedTokens[token], "Unsupported token");
        _;
    }
    
    constructor(
        address _mentoBroker,
        address _biPoolManager
    ) validAddress(_mentoBroker) validAddress(_biPoolManager) {
        mentoBroker = _mentoBroker;
        biPoolManager = _biPoolManager;
        protocolFeeBps = DEFAULT_FEE_BPS;
        
        // Set deployer as initial super admin
        superAdmins[msg.sender] = true;
        emit SuperAdminAdded(msg.sender, msg.sender);
    }
    
    /**
     * @notice Automatically discovers and registers all available Mento trading pairs
     * @dev Reads from BiPoolManager to get all exchanges and their assets
     */
    function discoverAndAddAllMentoAssets() external onlySuperAdmin {
        IBiPoolManager.Exchange[] memory exchanges = IBiPoolManager(biPoolManager).getExchanges();
        
        uint256 tokensAdded = 0;
        uint256 pairsAdded = 0;
        
        for (uint256 i = 0; i < exchanges.length; i++) {
            // Register all unique tokens from this exchange
            for (uint256 j = 0; j < exchanges[i].assets.length; j++) {
                address token = exchanges[i].assets[j];
                if (!supportedTokens[token]) {
                    _addToken(token);
                    tokensAdded++;
                }
            }
            
            // Register trading pair if it has exactly two assets
            if (exchanges[i].assets.length == 2) {
                address tokenA = exchanges[i].assets[0];
                address tokenB = exchanges[i].assets[1];
                bytes32 pairId = _generatePairId(tokenA, tokenB);
                
                if (!supportedPairs[pairId]) {
                    _addTradingPair(pairId, tokenA, tokenB, exchanges[i].exchangeId);
                    pairsAdded++;
                }
            }
        }
        
        require(tokensAdded > 0 || pairsAdded > 0, "No new assets discovered");
    }
    
    /**
     * @notice Executes a token swap through Mento protocol
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum acceptable output amount for slippage protection
     * @return amountOut Actual amount of tokens received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant supportedToken(tokenIn) supportedToken(tokenOut) returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input: Amount must be greater than zero");
        require(tokenIn != tokenOut, "Invalid input: Cannot swap identical tokens");
        
        bytes32 pairId = _generatePairId(tokenIn, tokenOut);
        require(supportedPairs[pairId], "Trading pair not available");
        
        // Transfer input tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Calculate protocol fee
        uint256 protocolFee = (amountIn * protocolFeeBps) / BASIS_POINTS;
        uint256 swapAmount = amountIn - protocolFee;
        
        // Execute swap through Mento
        amountOut = IMentoBroker(mentoBroker).swapIn(
            pairExchangeProvider[pairId],
            pairExchangeId[pairId],
            tokenIn,
            tokenOut,
            swapAmount,
            amountOutMin
        );
        
        require(amountOut >= amountOutMin, "Slippage exceeded: Output below minimum");
        
        // Transfer output tokens to user
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        // Record protocol fee
        if (protocolFee > 0) {
            protocolFees[tokenIn] += protocolFee;
            totalFeesCollected += protocolFee;
        }
        
        // Update protocol statistics
        _updateSwapStatistics(tokenIn, tokenOut, amountIn, amountOut);
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, protocolFee, block.timestamp);
        
        return amountOut;
    }
    
    /**
     * @notice Provides a quote for potential swap without execution
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @return amountOut Expected output amount after fees
     * @return protocolFee Fee that would be charged
     */
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view supportedToken(tokenIn) supportedToken(tokenOut) returns (uint256 amountOut, uint256 protocolFee) {
        require(amountIn > 0, "Invalid input: Amount must be greater than zero");
        
        bytes32 pairId = _generatePairId(tokenIn, tokenOut);
        require(supportedPairs[pairId], "Trading pair not available");
        
        protocolFee = (amountIn * protocolFeeBps) / BASIS_POINTS;
        uint256 swapAmount = amountIn - protocolFee;
        
        amountOut = IMentoBroker(mentoBroker).getAmountOut(
            pairExchangeProvider[pairId],
            pairExchangeId[pairId],
            tokenIn,
            tokenOut,
            swapAmount
        );
        
        return (amountOut, protocolFee);
    }
    
    /**
     * @notice Updates the protocol fee rate
     * @param newFeeBps New fee in basis points (1 basis point = 0.01%)
     */
    function updateProtocolFee(uint256 newFeeBps) external onlySuperAdmin {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum allowed");
        
        uint256 oldFeeBps = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        
        emit ProtocolFeeUpdated(oldFeeBps, newFeeBps, msg.sender);
    }
    
    /**
     * @notice Withdraws accumulated protocol fees
     * @param token Token address for fee withdrawal
     * @param amount Amount to withdraw (0 for all available)
     */
    function withdrawProtocolFees(address token, uint256 amount) external onlyAuthorizedAdmin {
        uint256 availableFees = protocolFees[token];
        require(availableFees > 0, "No fees available for withdrawal");
        
        uint256 withdrawAmount = (amount == 0) ? availableFees : amount;
        require(withdrawAmount <= availableFees, "Insufficient fee balance");
        
        protocolFees[token] -= withdrawAmount;
        IERC20(token).safeTransfer(msg.sender, withdrawAmount);
        
        emit ProtocolFeesWithdrawn(token, withdrawAmount, msg.sender);
    }
    
    /**
     * @notice Adds a new super admin
     * @param newAdmin Address of the new super admin
     */
    function addSuperAdmin(address newAdmin) external onlySuperAdmin validAddress(newAdmin) {
        require(!superAdmins[newAdmin], "Address is already a super admin");
        
        superAdmins[newAdmin] = true;
        emit SuperAdminAdded(newAdmin, msg.sender);
    }
    
    /**
     * @notice Removes a super admin
     * @param admin Address of the super admin to remove
     */
    function removeSuperAdmin(address admin) external onlySuperAdmin {
        require(admin != owner(), "Cannot remove contract owner");
        require(superAdmins[admin], "Address is not a super admin");
        
        superAdmins[admin] = false;
        emit SuperAdminRemoved(admin, msg.sender);
    }
    
    /**
     * @notice Adds a new contract admin
     * @param newAdmin Address of the new contract admin
     */
    function addContractAdmin(address newAdmin) external onlySuperAdmin validAddress(newAdmin) {
        require(!contractAdmins[newAdmin], "Address is already a contract admin");
        
        contractAdmins[newAdmin] = true;
        emit ContractAdminAdded(newAdmin, msg.sender);
    }
    
    /**
     * @notice Removes a contract admin
     * @param admin Address of the contract admin to remove
     */
    function removeContractAdmin(address admin) external onlySuperAdmin {
        require(contractAdmins[admin], "Address is not a contract admin");
        
        contractAdmins[admin] = false;
        emit ContractAdminRemoved(admin, msg.sender);
    }
    
    /**
     * @notice Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover (0 for all)
     * @param reason Reason for emergency withdrawal
     */
    function emergencyWithdraw(
        address token, 
        uint256 amount, 
        string calldata reason
    ) external onlySuperAdmin {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 withdrawAmount = (amount == 0) ? balance : amount;
        
        require(withdrawAmount <= balance, "Insufficient token balance");
        require(bytes(reason).length > 0, "Reason required for emergency withdrawal");
        
        IERC20(token).safeTransfer(owner(), withdrawAmount);
        
        emit EmergencyWithdrawal(token, withdrawAmount, msg.sender, reason);
    }
    
    // View functions
    
    /**
     * @notice Returns all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }
    
    /**
     * @notice Returns all supported trading pairs
     */
    function getSupportedPairs() external view returns (bytes32[] memory) {
        return pairList;
    }
    
    /**
     * @notice Checks if a trading pair is supported
     * @param tokenA First token address
     * @param tokenB Second token address
     */
    function isPairSupported(address tokenA, address tokenB) external view returns (bool) {
        bytes32 pairId = _generatePairId(tokenA, tokenB);
        return supportedPairs[pairId];
    }
    
    /**
     * @notice Returns detailed information about a trading pair
     * @param pairId Unique identifier for the trading pair
     */
    function getPairInfo(bytes32 pairId) external view returns (
        bool supported,
        address exchangeProvider,
        bytes32 exchangeId
    ) {
        return (
            supportedPairs[pairId],
            pairExchangeProvider[pairId],
            pairExchangeId[pairId]
        );
    }
    
    /**
     * @notice Returns comprehensive protocol statistics
     */
    function getProtocolStats() external view returns (
        uint256 _totalSwaps,
        uint256 _totalVolume,
        uint256 _totalFeesCollected,
        uint256 _supportedTokensCount,
        uint256 _supportedPairsCount,
        uint256 _currentFeeBps
    ) {
        return (
            totalSwaps,
            totalVolume,
            totalFeesCollected,
            tokenList.length,
            pairList.length,
            protocolFeeBps
        );
    }
    
    /**
     * @notice Returns token-specific statistics
     * @param token Token address
     */
    function getTokenStats(address token) external view returns (
        uint256 volume,
        uint256 swapCount,
        uint256 accumulatedFees
    ) {
        return (
            tokenVolume[token],
            tokenSwapCount[token],
            protocolFees[token]
        );
    }
    
    /**
     * @notice Generates a unique identifier for a trading pair
     * @param tokenA First token address
     * @param tokenB Second token address
     */
    function generatePairId(address tokenA, address tokenB) external pure returns (bytes32) {
        return _generatePairId(tokenA, tokenB);
    }
    
    // Internal functions
    
    function _addToken(address token) internal {
        supportedTokens[token] = true;
        tokenList.push(token);
        
        // Approve token for Mento broker
        IERC20(token).approve(mentoBroker, type(uint256).max);
        
        emit TokenAdded(token, block.timestamp);
    }
    
    function _addTradingPair(
        bytes32 pairId,
        address tokenA,
        address tokenB,
        bytes32 exchangeId
    ) internal {
        supportedPairs[pairId] = true;
        pairExchangeProvider[pairId] = biPoolManager;
        pairExchangeId[pairId] = exchangeId;
        pairList.push(pairId);
        
        emit PairAdded(pairId, tokenA, tokenB, exchangeId);
    }
    
    function _updateSwapStatistics(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal {
        totalSwaps++;
        totalVolume += amountIn;
        tokenVolume[tokenIn] += amountIn;
        tokenSwapCount[tokenIn]++;
        tokenSwapCount[tokenOut]++;
    }
    
    function _generatePairId(address tokenA, address tokenB) internal pure returns (bytes32) {
        return tokenA < tokenB 
            ? keccak256(abi.encodePacked(tokenA, tokenB))
            : keccak256(abi.encodePacked(tokenB, tokenA));
    }
}