// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Uniswap V3 interfaces for Celo
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface INonfungiblePositionManager is IERC721Receiver {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function mint(MintParams calldata params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
    function increaseLiquidity(IncreaseLiquidityParams calldata params) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1);
    function decreaseLiquidity(DecreaseLiquidityParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
    function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}

/**
 * @title UnicелoPools - Dynamic Celo Edition
 * @notice Liquidity provision and rewards system for Mento assets using Uniswap V3 on Celo
 * @dev Users can stake existing V3 NFT positions or create new ones to earn rewards
 * @author cXchange Team - Dynamic Configuration
 */
contract UniceloPools is Ownable(msg.sender), ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant REWARD_PRECISION = 1e12;
    
    // Fee tiers (commonly used on Celo DEXs)
    uint24 public constant FEE_LOW = 500;      // 0.05% - for stablecoin pairs
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3% - standard pairs
    uint24 public constant FEE_HIGH = 10000;   // 1% - exotic pairs
    
    // Core addresses
    address public immutable uniswapV3Factory;
    address public immutable positionManager;
    address public immutable rewardToken; // Reward token (typically CELO)

    // Structs
    struct TokenPair {
        address token0;
        address token1;
    }

    struct DiscoveryResult {
        uint24 fee;
        bytes32 poolId;
        address poolAddress;
        bool exists;
        bool wasAdded;
    }

    struct PoolInfo {
        address token0;
        address token1;
        uint24 fee;
        address poolAddress;
        bool isActive;
        uint256 totalRewardAllocation;
        uint256 rewardPerSecond;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
        uint256 totalLiquidity;
        uint256 startTime;
        uint256 endTime;
        uint256 multiplier; // 100 = 1x, 200 = 2x rewards
    }
    
    struct UserPosition {
        uint256 tokenId;
        uint256 liquidity;
        uint256 rewardDebt;
        uint256 pendingRewards;
        uint256 lastStakeTime;
        int24 tickLower;
        int24 tickUpper;
        bool isStaked;
        bool ownedByContract; // true if we created it, false if user transferred existing NFT
    }
    
    // Storage
    mapping(bytes32 => PoolInfo) public pools;
    mapping(address => mapping(bytes32 => UserPosition[])) public userPositions;
    mapping(uint256 => bytes32) public tokenIdToPoolId;
    mapping(uint256 => address) public tokenIdToOwner;
    mapping(address => bool) public supportedTokens;
    
    bytes32[] public poolIds;
    address[] public supportedTokensList;
    
    // Rewards tracking
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public totalRewardsClaimed;
    uint256 public totalRewardsDistributed;
    
    // Admin controls
    mapping(address => bool) public poolManagers;
    
    // Events
    event PoolCreated(bytes32 indexed poolId, address indexed token0, address indexed token1, uint24 fee, address pool, uint256 multiplier);
    event ExistingPoolAdded(bytes32 indexed poolId, address indexed poolAddress, uint256 multiplier);
    event PoolDiscovered(bytes32 indexed poolId, address indexed token0, address indexed token1, uint24 fee, address poolAddress, bool wasAdded);
    event BatchDiscoveryCompleted(uint256 totalPairsChecked, uint256 totalPoolsAdded);
    event LiquidityAdded(address indexed user, bytes32 indexed poolId, uint256 tokenId, uint256 liquidity, uint256 amount0, uint256 amount1);
    event ExistingPositionStaked(address indexed user, bytes32 indexed poolId, uint256 tokenId, uint256 liquidity);
    event LiquidityRemoved(address indexed user, bytes32 indexed poolId, uint256 tokenId, uint256 liquidity);
    event PositionUnstaked(address indexed user, bytes32 indexed poolId, uint256 tokenId);
    event RewardsClaimed(address indexed user, bytes32 indexed poolId, uint256 amount);
    event RewardRateUpdated(bytes32 indexed poolId, uint256 newRate);
    event PoolManagerAdded(address indexed manager);
    event PoolManagerRemoved(address indexed manager);
    event MentoAssetsConfigured(address[] assets);
    
    modifier onlyPoolManager() {
        require(poolManagers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier validPool(bytes32 poolId) {
        require(pools[poolId].isActive, "Pool not active");
        _;
    }
    
    constructor(
        address _uniswapV3Factory,
        address _positionManager,
        address _rewardToken
    ) {
        require(_uniswapV3Factory != address(0), "Invalid factory address");
        require(_positionManager != address(0), "Invalid position manager address");
        require(_rewardToken != address(0), "Invalid reward token address");
        
        uniswapV3Factory = _uniswapV3Factory;
        positionManager = _positionManager;
        rewardToken = _rewardToken;
        poolManagers[msg.sender] = true;
    }
    
    /**
     * @notice Configure all Mento asset addresses dynamically
     * @param assets Array of Mento asset addresses
     */
    function configureMentoAssets(address[] calldata assets) external onlyOwner {
        require(assets.length > 0, "No assets provided");
        for (uint256 i = 0; i < assets.length; i++) {
            require(assets[i] != address(0), "Invalid asset address");
            _addSupportedTokenIfNew(assets[i]);
        }
        emit MentoAssetsConfigured(assets);
    }

    /**
     * @notice Create a new Uniswap V3 pool for rewards (if it doesn't exist)
     */
    function createRewardPool(
        address token0,
        address token1,
        uint24 fee,
        uint256 rewardAllocation,
        uint256 durationDays,
        uint256 multiplier
    ) external onlyPoolManager returns (bytes32 poolId) {
        require(token0 != token1, "Identical tokens");
        require(supportedTokens[token0] && supportedTokens[token1], "Unsupported tokens");
        require(fee == FEE_LOW || fee == FEE_MEDIUM || fee == FEE_HIGH, "Invalid fee tier");
        
        // Ensure token0 < token1
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        poolId = keccak256(abi.encodePacked(token0, token1, fee));
        require(!pools[poolId].isActive, "Pool already exists");
        
        // Get or create Uniswap pool
        address poolAddress = IUniswapV3Factory(uniswapV3Factory).getPool(token0, token1, fee);
        if (poolAddress == address(0)) {
            poolAddress = IUniswapV3Factory(uniswapV3Factory).createPool(token0, token1, fee);
        }
        
        _createPoolInfo(poolId, token0, token1, fee, poolAddress, rewardAllocation, durationDays, multiplier);
        
        emit PoolCreated(poolId, token0, token1, fee, poolAddress, multiplier);
        return poolId;
    }
    
    /**
     * @notice Smart pool discovery: Query if pool exists and add it if found
     */
    function discoverAndAddPool(
        address token0,
        address token1,
        uint24 fee,
        uint256 rewardAllocation,
        uint256 durationDays,
        uint256 multiplier
    ) external onlyPoolManager returns (bytes32 poolId, address poolAddress, bool wasAdded) {
        require(token0 != token1, "Identical tokens");
        require(supportedTokens[token0] && supportedTokens[token1], "Unsupported tokens");
        require(fee == FEE_LOW || fee == FEE_MEDIUM || fee == FEE_HIGH, "Invalid fee tier");
        
        // Ensure token0 < token1
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        // Check if pool exists on Uniswap
        poolAddress = IUniswapV3Factory(uniswapV3Factory).getPool(token0, token1, fee);
        
        if (poolAddress == address(0)) {
            // Pool doesn't exist
            return (bytes32(0), address(0), false);
        }
        
        // Pool exists, check if we already added it
        poolId = keccak256(abi.encodePacked(token0, token1, fee));
        if (pools[poolId].isActive) {
            // Pool already added to rewards
            return (poolId, poolAddress, false);
        }
        
        // Add the existing pool
        _createPoolInfo(poolId, token0, token1, fee, poolAddress, rewardAllocation, durationDays, multiplier);
        
        emit ExistingPoolAdded(poolId, poolAddress, multiplier);
        emit PoolDiscovered(poolId, token0, token1, fee, poolAddress, true);
        return (poolId, poolAddress, true);
    }

    /**
     * @notice Batch discover and add multiple pools with different fee tiers
     */
    function discoverAndAddAllFeeTiers(
        address token0,
        address token1,
        uint256 rewardAllocation,
        uint256 durationDays,
        uint256 multiplier
    ) external onlyPoolManager returns (DiscoveryResult[] memory results) {
        require(token0 != token1, "Identical tokens");
        require(supportedTokens[token0] && supportedTokens[token1], "Unsupported tokens");
        
        uint24[3] memory feeTiers = [FEE_LOW, FEE_MEDIUM, FEE_HIGH];
        results = new DiscoveryResult[](3);
        
        for (uint256 i = 0; i < 3; i++) {
            (bytes32 poolId, address poolAddress, bool wasAdded) = this.discoverAndAddPool(
                token0,
                token1,
                feeTiers[i],
                rewardAllocation,
                durationDays,
                multiplier
            );
            
            results[i] = DiscoveryResult({
                fee: feeTiers[i],
                poolId: poolId,
                poolAddress: poolAddress,
                exists: poolAddress != address(0),
                wasAdded: wasAdded
            });
        }
        
        return results;
    }

    /**
     * @notice Auto-discover pools for multiple token pairs
     */
    function batchDiscoverPools(
        TokenPair[] memory tokenPairs,
        uint256 rewardAllocation,
        uint256 durationDays,
        uint256 multiplier
    ) public onlyPoolManager returns (uint256 totalAdded) {
        totalAdded = 0;
        
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            TokenPair memory pair = tokenPairs[i];
            
            // Try all fee tiers for this pair
            uint24[3] memory feeTiers = [FEE_LOW, FEE_MEDIUM, FEE_HIGH];
            
            for (uint256 j = 0; j < 3; j++) {
                try this.discoverAndAddPool(
                    pair.token0,
                    pair.token1,
                    feeTiers[j],
                    rewardAllocation,
                    durationDays,
                    multiplier
                ) returns (bytes32 poolId, address poolAddress, bool wasAdded) {
                    if (wasAdded) {
                        totalAdded++;
                    }
                } catch {
                    // Skip if tokens not supported or other errors
                    continue;
                }
            }
        }
        
        emit BatchDiscoveryCompleted(tokenPairs.length * 3, totalAdded);
        return totalAdded;
    }
    
    /**
     * @notice Add liquidity to create a new position and stake it
     */
    function addLiquidityAndStake(
        bytes32 poolId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        int24 tickLower,
        int24 tickUpper
    ) external nonReentrant validPool(poolId) returns (uint256 tokenId, uint128 liquidity) {
        PoolInfo storage pool = pools[poolId];
        updatePool(poolId);
        
        // Transfer tokens from user
        IERC20(pool.token0).safeTransferFrom(msg.sender, address(this), amount0Desired);
        IERC20(pool.token1).safeTransferFrom(msg.sender, address(this), amount1Desired);
        
        // Approve position manager
        IERC20(pool.token0).approve(positionManager, amount0Desired);
        IERC20(pool.token1).approve(positionManager, amount1Desired);
        
        // Mint position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: pool.token0,
            token1: pool.token1,
            fee: pool.fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            recipient: address(this),
            deadline: block.timestamp + 300
        });
        
        uint256 amount0Used;
        uint256 amount1Used;
        (tokenId, liquidity, amount0Used, amount1Used) = INonfungiblePositionManager(positionManager).mint(params);
        
        // Refund unused tokens
        if (amount0Desired > amount0Used) {
            IERC20(pool.token0).safeTransfer(msg.sender, amount0Desired - amount0Used);
        }
        if (amount1Desired > amount1Used) {
            IERC20(pool.token1).safeTransfer(msg.sender, amount1Desired - amount1Used);
        }
        
        // Create and stake position
        _createUserPosition(msg.sender, poolId, tokenId, liquidity, tickLower, tickUpper, true);
        
        emit LiquidityAdded(msg.sender, poolId, tokenId, liquidity, amount0Used, amount1Used);
        return (tokenId, liquidity);
    }
    
    /**
     * @notice Stake an existing Uniswap V3 NFT position
     */
    function stakeExistingPosition(uint256 tokenId) external nonReentrant returns (bytes32 poolId) {
        // Verify ownership
        require(INonfungiblePositionManager(positionManager).ownerOf(tokenId) == msg.sender, "Not NFT owner");
        
        // Get position info
        (,, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity,,,,) = 
            INonfungiblePositionManager(positionManager).positions(tokenId);
        
        require(liquidity > 0, "No liquidity in position");
        
        // Generate pool ID
        poolId = keccak256(abi.encodePacked(token0, token1, fee));
        require(pools[poolId].isActive, "Pool not supported");
        
        updatePool(poolId);
        
        // Transfer NFT to contract
        INonfungiblePositionManager(positionManager).transferFrom(msg.sender, address(this), tokenId);
        
        // Create user position
        _createUserPosition(msg.sender, poolId, tokenId, liquidity, tickLower, tickUpper, false);
        
        emit ExistingPositionStaked(msg.sender, poolId, tokenId, liquidity);
        return poolId;
    }
    
    /**
     * @notice Remove liquidity from a position we created
     */
    function removeLiquidity(
        bytes32 poolId,
        uint256 positionIndex,
        uint128 liquidityToRemove,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant validPool(poolId) {
        updatePool(poolId);
        
        UserPosition storage position = userPositions[msg.sender][poolId][positionIndex];
        require(position.isStaked && position.ownedByContract, "Position not available for liquidity removal");
        require(liquidityToRemove <= position.liquidity, "Insufficient liquidity");
        
        // Claim pending rewards first
        _claimRewards(msg.sender, poolId, positionIndex);
        
        // Decrease liquidity in Uniswap position
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: position.tokenId,
            liquidity: liquidityToRemove,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            deadline: block.timestamp + 300
        });
        
        (uint256 amount0, uint256 amount1) = INonfungiblePositionManager(positionManager).decreaseLiquidity(params);
        
        // Collect the tokens
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: position.tokenId,
            recipient: msg.sender,
            amount0Max: uint128(amount0),
            amount1Max: uint128(amount1)
        });
        
        INonfungiblePositionManager(positionManager).collect(collectParams);
        
        // Update position
        position.liquidity -= liquidityToRemove;
        pools[poolId].totalLiquidity -= liquidityToRemove;
        
        if (position.liquidity == 0) {
            position.isStaked = false;
            delete tokenIdToPoolId[position.tokenId];
            delete tokenIdToOwner[position.tokenId];
        }
        
        emit LiquidityRemoved(msg.sender, poolId, position.tokenId, liquidityToRemove);
    }
    
    /**
     * @notice Unstake an existing position (return NFT to user)
     */
    function unstakePosition(bytes32 poolId, uint256 positionIndex) external nonReentrant {
        updatePool(poolId);
        
        UserPosition storage position = userPositions[msg.sender][poolId][positionIndex];
        require(position.isStaked && !position.ownedByContract, "Position not available for unstaking");
        
        // Claim pending rewards first
        _claimRewards(msg.sender, poolId, positionIndex);
        
        // Transfer NFT back to user
        INonfungiblePositionManager(positionManager).transferFrom(address(this), msg.sender, position.tokenId);
        
        // Update state
        pools[poolId].totalLiquidity -= position.liquidity;
        position.isStaked = false;
        
        delete tokenIdToPoolId[position.tokenId];
        delete tokenIdToOwner[position.tokenId];
        
        emit PositionUnstaked(msg.sender, poolId, position.tokenId);
    }
    
    /**
     * @notice Claim pending rewards for a position
     */
    function claimRewards(bytes32 poolId, uint256 positionIndex) external nonReentrant {
        updatePool(poolId);
        _claimRewards(msg.sender, poolId, positionIndex);
    }
    
    /**
     * @notice Claim rewards for all positions in a pool
     */
    function claimAllRewards(bytes32 poolId) external nonReentrant {
        updatePool(poolId);
        UserPosition[] storage positions = userPositions[msg.sender][poolId];
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].isStaked) {
                _claimRewards(msg.sender, poolId, i);
            }
        }
    }
    
    /**
     * @notice Update pool rewards
     */
    function updatePool(bytes32 poolId) public {
        PoolInfo storage pool = pools[poolId];
        
        if (block.timestamp <= pool.lastRewardTime || pool.totalLiquidity == 0) {
            return;
        }
        
        uint256 timeElapsed = Math.min(block.timestamp, pool.endTime) - pool.lastRewardTime;
        uint256 baseReward = timeElapsed * pool.rewardPerSecond;
        uint256 multipliedReward = (baseReward * pool.multiplier) / 100;
        
        pool.accRewardPerShare += (multipliedReward * REWARD_PRECISION) / pool.totalLiquidity;
        pool.lastRewardTime = block.timestamp;
    }
    
    /**
     * @notice Add supported token for liquidity provision
     */
    function addSupportedToken(address token) external onlyPoolManager {
        require(token != address(0), "Invalid token address");
        _addSupportedTokenIfNew(token);
    }
    
    /**
     * @notice Batch add multiple supported tokens
     */
    function addSupportedTokensBatch(address[] calldata tokens) external onlyPoolManager {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] != address(0)) {
                _addSupportedTokenIfNew(tokens[i]);
            }
        }
    }
    
    // View functions
    
    /**
     * @notice Get pending rewards for a specific position
     */
    function pendingRewards(address user, bytes32 poolId, uint256 positionIndex) external view returns (uint256) {
        if (positionIndex >= userPositions[user][poolId].length) return 0;
        
        UserPosition storage position = userPositions[user][poolId][positionIndex];
        PoolInfo storage pool = pools[poolId];
        
        if (!position.isStaked || position.liquidity == 0) {
            return position.pendingRewards;
        }
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastRewardTime && pool.totalLiquidity > 0) {
            uint256 timeElapsed = Math.min(block.timestamp, pool.endTime) - pool.lastRewardTime;
            uint256 baseReward = timeElapsed * pool.rewardPerSecond;
            uint256 multipliedReward = (baseReward * pool.multiplier) / 100;
            accRewardPerShare += (multipliedReward * REWARD_PRECISION) / pool.totalLiquidity;
        }
        
        return ((position.liquidity * accRewardPerShare) / REWARD_PRECISION) - position.rewardDebt + position.pendingRewards;
    }
    
    /**
     * @notice Get total pending rewards for all positions in a pool
     */
    function pendingRewardsTotal(address user, bytes32 poolId) external view returns (uint256 total) {
        UserPosition[] storage positions = userPositions[user][poolId];
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].isStaked) {
                total += this.pendingRewards(user, poolId, i);
            }
        }
        
        return total;
    }
    
    /**
     * @notice Check if a pool exists without adding it
     */
    function checkPoolExists(
        address token0,
        address token1,
        uint24 fee
    ) external view returns (bool exists, address poolAddress, bool alreadyAdded) {
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        poolAddress = IUniswapV3Factory(uniswapV3Factory).getPool(token0, token1, fee);
        exists = poolAddress != address(0);
        
        if (exists) {
            bytes32 poolId = keccak256(abi.encodePacked(token0, token1, fee));
            alreadyAdded = pools[poolId].isActive;
        }
        
        return (exists, poolAddress, alreadyAdded);
    }

    /**
     * @notice Check all fee tiers for a token pair
     */
    function checkAllFeeTiers(
        address token0,
        address token1
    ) external view returns (DiscoveryResult[] memory results) {
        uint24[3] memory feeTiers = [FEE_LOW, FEE_MEDIUM, FEE_HIGH];
        results = new DiscoveryResult[](3);
        
        for (uint256 i = 0; i < 3; i++) {
            (bool exists, address poolAddress, bool alreadyAdded) = this.checkPoolExists(token0, token1, feeTiers[i]);
            
            bytes32 poolId = bytes32(0);
            if (exists) {
                if (token0 > token1) {
                    (token0, token1) = (token1, token0);
                }
                poolId = keccak256(abi.encodePacked(token0, token1, feeTiers[i]));
            }
            
            results[i] = DiscoveryResult({
                fee: feeTiers[i],
                poolId: poolId,
                poolAddress: poolAddress,
                exists: exists,
                wasAdded: alreadyAdded
            });
        }
        
        return results;
    }

    /**
     * @notice Get detailed pool information including Uniswap data
     */
    function getDetailedPoolInfo(bytes32 poolId) external view returns (
        PoolInfo memory poolInfo,
        uint128 uniswapLiquidity,
        int24 currentTick,
        uint160 sqrtPriceX96
    ) {
        poolInfo = pools[poolId];
        
        if (poolInfo.isActive && poolInfo.poolAddress != address(0)) {
            IUniswapV3Pool pool = IUniswapV3Pool(poolInfo.poolAddress);
            uniswapLiquidity = pool.liquidity();
            (sqrtPriceX96, currentTick, , , , , ) = pool.slot0();
        }
        
        return (poolInfo, uniswapLiquidity, currentTick, sqrtPriceX96);
    }
    
    /**
     * @notice Get user positions for a pool
     */
    function getUserPositions(address user, bytes32 poolId) external view returns (UserPosition[] memory) {
        return userPositions[user][poolId];
    }
    
    /**
     * @notice Get user's active position count
     */
    function getUserActivePositionCount(address user, bytes32 poolId) external view returns (uint256 count) {
        UserPosition[] storage positions = userPositions[user][poolId];
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].isStaked) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @notice Get all active pools
     */
    function getActivePools() external view returns (bytes32[] memory) {
        return poolIds;
    }
    
    /**
     * @notice Get pool info with additional stats
     */
    function getPoolStats(bytes32 poolId) external view returns (
        PoolInfo memory poolInfo,
        uint256 totalActivePositions,
        uint256 averagePositionSize,
        uint256 timeRemaining
    ) {
        poolInfo = pools[poolId];
        // Note: totalActivePositions would need additional tracking for efficiency
        averagePositionSize = poolInfo.totalLiquidity > 0 ? poolInfo.totalLiquidity / Math.max(1, totalActivePositions) : 0;
        timeRemaining = block.timestamp < poolInfo.endTime ? poolInfo.endTime - block.timestamp : 0;
        
        return (poolInfo, totalActivePositions, averagePositionSize, timeRemaining);
    }
    
    /**
     * @notice Get supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    /**
     * @notice Check if a pool exists for given tokens and fee
     */
    function getPoolId(address token0, address token1, uint24 fee) external pure returns (bytes32) {
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        return keccak256(abi.encodePacked(token0, token1, fee));
    }
    
    // Internal functions
    
    function _createPoolInfo(
        bytes32 poolId,
        address token0,
        address token1,
        uint24 fee,
        address poolAddress,
        uint256 rewardAllocation,
        uint256 durationDays,
        uint256 multiplier
    ) internal {
        uint256 duration = durationDays * 1 days;
        uint256 rewardPerSecond = rewardAllocation / duration;
        
        pools[poolId] = PoolInfo({
            token0: token0,
            token1: token1,
            fee: fee,
            poolAddress: poolAddress,
            isActive: true,
            totalRewardAllocation: rewardAllocation,
            rewardPerSecond: rewardPerSecond,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0,
            totalLiquidity: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            multiplier: multiplier
        });
        
        poolIds.push(poolId);
    }
    
    function _createUserPosition(
        address user,
        bytes32 poolId,
        uint256 tokenId,
        uint256 liquidity,
        int24 tickLower,
        int24 tickUpper,
        bool ownedByContract
    ) internal {
        UserPosition memory newPosition = UserPosition({
            tokenId: tokenId,
            liquidity: liquidity,
            rewardDebt: (liquidity * pools[poolId].accRewardPerShare) / REWARD_PRECISION,
            pendingRewards: 0,
            lastStakeTime: block.timestamp,
            tickLower: tickLower,
            tickUpper: tickUpper,
            isStaked: true,
            ownedByContract: ownedByContract
        });
        
        userPositions[user][poolId].push(newPosition);
        tokenIdToPoolId[tokenId] = poolId;
        tokenIdToOwner[tokenId] = user;
        pools[poolId].totalLiquidity += liquidity;
    }
    
    function _claimRewards(address user, bytes32 poolId, uint256 positionIndex) internal {
        UserPosition storage position = userPositions[user][poolId][positionIndex];
        PoolInfo storage pool = pools[poolId];
        
        if (!position.isStaked || position.liquidity == 0) {
            return;
        }
        
        uint256 pending = ((position.liquidity * pool.accRewardPerShare) / REWARD_PRECISION) - position.rewardDebt + position.pendingRewards;
        
        if (pending > 0) {
            position.pendingRewards = 0;
            position.rewardDebt = (position.liquidity * pool.accRewardPerShare) / REWARD_PRECISION;
            
            totalRewardsEarned[user] += pending;
            totalRewardsClaimed[user] += pending;
            totalRewardsDistributed += pending;
            
            IERC20(rewardToken).safeTransfer(user, pending);
            
            emit RewardsClaimed(user, poolId, pending);
        }
    }

    function _addSupportedTokenIfNew(address token) internal {
        if (!supportedTokens[token]) {
            supportedTokens[token] = true;
            supportedTokensList.push(token);
        }
    }
    
    // Admin functions
    
    function addPoolManager(address manager) external onlyOwner {
        require(manager != address(0), "Invalid manager address");
        poolManagers[manager] = true;
        emit PoolManagerAdded(manager);
    }
    
    function removePoolManager(address manager) external onlyOwner {
        poolManagers[manager] = false;
        emit PoolManagerRemoved(manager);
    }
    
    function updateRewardRate(bytes32 poolId, uint256 newRewardPerSecond) external onlyPoolManager {
        updatePool(poolId);
        pools[poolId].rewardPerSecond = newRewardPerSecond;
        emit RewardRateUpdated(poolId, newRewardPerSecond);
    }
    
    function updatePoolMultiplier(bytes32 poolId, uint256 newMultiplier) external onlyPoolManager {
        require(newMultiplier >= 50 && newMultiplier <= 1000, "Invalid multiplier range"); // 0.5x to 10x
        updatePool(poolId);
        pools[poolId].multiplier = newMultiplier;
    }
    
    function extendPoolDuration(bytes32 poolId, uint256 additionalDays) external onlyPoolManager {
        pools[poolId].endTime += additionalDays * 1 days;
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (amount == 0) {
            amount = IERC20(token).balanceOf(address(this));
        }
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    // Required for receiving NFTs
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}