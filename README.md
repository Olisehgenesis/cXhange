# cXchange - Advanced DEX for Mento Labs Assets

A sophisticated decentralized exchange (DEX) built for the Celo ecosystem, integrating directly with Mento Labs' infrastructure for seamless trading of stable assets and CELO.

## 🚀 Features

### Core Trading Features
- **Order Book Trading**: Full-featured order book with market, limit, stop-loss, and take-profit orders
- **Mento Integration**: Direct integration with Mento's BiPoolManager and SortedOracles
- **AMM Liquidity Pools**: Internal AMM pools for enhanced liquidity
- **Real-time Price Feeds**: Oracle-powered price discovery with fallback mechanisms
- **Advanced Order Types**: Support for partial fills, order expiry, and maker/taker fees

### Technical Features
- **Gas Optimization**: Efficient smart contracts with minimal gas consumption
- **Security**: Reentrancy protection, access controls, and comprehensive error handling
- **Analytics**: Built-in price candles, volume tracking, and trading statistics
- **Arbitrage Detection**: Automatic arbitrage opportunities between internal pools and Mento
- **Multi-token Support**: Extensible architecture for adding new tokens

### User Experience
- **Modern UI**: React-based frontend with real-time updates
- **Multi-swap**: Batch token swaps for efficient portfolio management
- **Trading Analytics**: Comprehensive charts and trading history
- **Mobile Responsive**: Optimized for all device sizes

## 🏗️ Architecture

### Smart Contract Architecture
```
cXchange.sol
├── Order Management
│   ├── placeOrder()
│   ├── cancelOrder()
│   ├── fillOrder()
│   └── getOrderBook()
├── Mento Integration
│   ├── getTokenPriceFromOracle()
│   ├── updateTokenPrice()
│   └── syncPricesWithOracles()
├── AMM Pools
│   ├── createLiquidityPool()
│   ├── addLiquidity()
│   ├── removeLiquidity()
│   └── swapViaAMM()
└── Admin Functions
    ├── addSupportedToken()
    ├── addTradingPair()
    └── setTradingFee()
```

### Frontend Architecture
```
react-app/
├── components/
│   ├── pages/
│   │   ├── Trade.tsx          # Main trading interface
│   │   ├── MultiSwap.tsx      # Batch swap functionality
│   │   └── Analytics.tsx      # Trading analytics
│   ├── ui/                    # Reusable UI components
│   └── layout/                # Layout components
├── hooks/                     # Custom React hooks
├── utils/                     # Utility functions
└── types/                     # TypeScript type definitions
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and pnpm
- Hardhat development environment
- Celo Alfajores testnet access
- Environment variables configured

### 1. Clone and Install
```bash
git clone <repository-url>
cd c-switch
pnpm install
```

### 2. Environment Configuration
Create a `.env` file in the `hardhat/` directory:
```env
# Contract addresses (Alfajores testnet)
CONTRACT_ADDRESS=0x338f8fee558bbf8ec1f1c29f3265ae94016c47a6
BI_POOL_MANAGER=0x9ac7ce7cc4b381d8e226b8f5b8e4f2d8b5b8e4f2
SORTED_ORACLES=0x9ac7ce7cc4b381d8e226b8f5b8e4f2d8b5b8e4f2
MENTO_TOKEN_BROKER=0x9ac7ce7cc4b381d8e226b8f5b8e4f2d8b5b8e4f2

# Your wallet
PRIVATE_KEY=your_private_key_here

# RPC endpoints
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
```

### 3. Deploy Contracts
```bash
cd hardhat
pnpm run deploy:testnet
```

### 4. Setup cXchange
```bash
pnpm run setup:cxchange:testnet
```

### 5. Start Frontend
```bash
cd react-app
pnpm run dev
```

## 📊 Supported Tokens

### Currently Supported
- **CELO** (`0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9`) - Native Celo token
- **cUSD** (`0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`) - Celo Dollar stablecoin
- **cEUR** (`0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F`) - Celo Euro stablecoin
- **cREAL** (`0xE4D517785D091D3c54818832dB6094bcc2744545`) - Celo Real stablecoin

### Adding New Tokens
To add a new token, use the `addSupportedToken` function:
```solidity
function addSupportedToken(
    address token,
    address exchangeProvider,
    bytes32 exchangeId,
    address rateFeedId
) external onlyOwner
```

## 🔄 Trading Pairs

### Available Pairs
- CELO/cUSD
- CELO/cEUR
- cUSD/cEUR
- cUSD/cREAL
- CELO/cREAL

### Creating New Pairs
```solidity
function addTradingPair(
    address tokenA,
    address tokenB,
    uint256 minOrderSize,
    uint256 tickSize,
    bytes32 rateFeedId
) external onlyOwner
```

## 💱 Trading Features

### Order Types
1. **Market Orders**: Immediate execution at best available price
2. **Limit Orders**: Execution at specified price or better
3. **Stop-Loss Orders**: Triggered when price reaches stop level
4. **Take-Profit Orders**: Triggered when price reaches target level

### Fee Structure
- **Trading Fee**: 0.3% (30 bps) for takers
- **Maker Rebate**: 0.1% (10 bps) for makers
- **Configurable**: Fees can be adjusted by contract owner

### Liquidity Pools
- **AMM Integration**: Internal liquidity pools for enhanced trading
- **LP Rewards**: Earn fees by providing liquidity
- **Impermanent Loss Protection**: Advanced risk management

## 🔗 Mento Integration

### Oracle Price Feeds
- **SortedOracles**: Primary price source for stable assets
- **BiPoolManager**: Exchange rate discovery for token pairs
- **Fallback Mechanisms**: Multiple price sources for reliability

### Direct Swaps
- **Mento Broker**: Direct integration for instant swaps
- **Slippage Protection**: Configurable slippage tolerance
- **Gas Optimization**: Efficient routing through Mento infrastructure

## 📈 Analytics & Monitoring

### Price Data
- **Real-time Candles**: 1m, 5m, 1h, 1d timeframes
- **Volume Tracking**: 24h volume and price change metrics
- **Trade History**: Complete transaction history

### Performance Metrics
- **Total Volume**: Cumulative trading volume
- **Active Orders**: Current order book depth
- **Liquidity Metrics**: Pool utilization and efficiency

## 🧪 Testing

### Smart Contract Tests
```bash
cd hardhat
pnpm test
```

### Integration Tests
```bash
pnpm run test:integration
```

### Frontend Tests
```bash
cd react-app
pnpm test
```

## 🚀 Deployment

### Testnet Deployment
```bash
cd hardhat
pnpm run deploy:testnet
```

### Mainnet Deployment
```bash
cd hardhat
pnpm run deploy:mainnet
```

### Frontend Deployment
```bash
cd react-app
pnpm run build
pnpm run deploy
```

## 🔧 Configuration

### Contract Parameters
- `tradingFeeBps`: Trading fee in basis points (default: 30)
- `makerRebateBps`: Maker rebate in basis points (default: 10)
- `minLiquidityThreshold`: Minimum liquidity for AMM pools
- `ORDER_EXPIRY_TIME`: Order expiry time (default: 7 days)
- `PRICE_STALENESS_THRESHOLD`: Oracle price staleness threshold (1 hour)

### Frontend Configuration
- `REACT_APP_CONTRACT_ADDRESS`: Deployed contract address
- `REACT_APP_RPC_URL`: Celo RPC endpoint
- `REACT_APP_CHAIN_ID`: Network chain ID

## 📚 API Reference

### Core Functions
```solidity
// Trading
function placeOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, OrderType orderType, bool isPartialFillAllowed, uint256 expiresAt) external returns (uint256 orderId)
function cancelOrder(uint256 orderId) external
function fillOrder(uint256 orderId, uint256 amountToFill) external

// Liquidity
function createLiquidityPool(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (bytes32 poolId)
function addLiquidity(bytes32 poolId, uint256 amountA, uint256 amountB) external returns (uint256 shares)
function removeLiquidity(bytes32 poolId, uint256 shares) external returns (uint256 amountA, uint256 amountB)

// Price Discovery
function getTokenPrice(address token) external returns (uint256 price, uint256 timestamp)
function updateTokenPrice(address token) external returns (uint256 price)
function syncPricesWithOracles() external

// View Functions
function getOrderBook(bytes32 pairId, uint256 depth) external view returns (uint256[] memory buyPrices, uint256[] memory buyAmounts, uint256[] memory sellPrices, uint256[] memory sellAmounts)
function getTradingPairs() external view returns (bytes32[] memory)
function getSupportedTokens() external view returns (address[] memory)
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- Follow Solidity style guide
- Use TypeScript for frontend code
- Write comprehensive tests
- Document all public functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Smart Contract Documentation](./docs/contracts.md)
- [Frontend Documentation](./docs/frontend.md)
- [API Reference](./docs/api.md)

### Community
- [Discord](https://discord.gg/celo)
- [Telegram](https://t.me/celocommunity)
- [Forum](https://forum.celo.org)

### Issues
Report bugs and request features through [GitHub Issues](https://github.com/your-repo/issues).

---

**Built with ❤️ for the Celo ecosystem** 