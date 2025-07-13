# C-Switch Backend

A complete backend system for collecting and serving price feed data from Celo's Mento protocol.

## Features

- 🔄 **Real-time Price Collection**: Automatically fetches prices from Mento Token Broker
- 📊 **OHLC Candle Generation**: Generates candlestick data for multiple timeframes
- 🗄️ **Supabase Integration**: Stores data in PostgreSQL with real-time capabilities
- 🌐 **RESTful API**: Complete API endpoints for frontend consumption
- ⚡ **High Performance**: Optimized for real-time trading data

## Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── services/        # Core business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── abis/           # Smart contract ABIs
├── scripts/            # Standalone service scripts
└── dist/              # Compiled JavaScript (generated)
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Celo Network Configuration
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_CHAIN_ID=44787

# Contract Addresses
MENTO_TOKEN_BROKER=0xD3Dff18E465bCa6241A244144765b4421Ac14D09
BI_POOL_MANAGER=0x9B64E8EaBD1a035b148cE970d3319c5C3Ad53EC3
SIMPLE_DEX_ADDRESS=your_contract_address

# Server Configuration
PORT=3001
NODE_ENV=development

# Price Collection Settings
PRICE_COLLECTION_INTERVAL=5000
CANDLE_GENERATION_INTERVAL=60000
```

### 3. Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Prices table for 5-second snapshots
CREATE TABLE prices (
  id BIGSERIAL PRIMARY KEY,
  pair VARCHAR(20) NOT NULL,
  token_in VARCHAR(42) NOT NULL,
  token_out VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(10) NOT NULL,
  token_out_symbol VARCHAR(10) NOT NULL,
  price DECIMAL(36,18) NOT NULL,
  inverse_price DECIMAL(36,18) NOT NULL,
  volume_24h DECIMAL(36,18) DEFAULT 0,
  source VARCHAR(10) NOT NULL DEFAULT 'MENTO',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candles table for different timeframes
CREATE TABLE candles (
  id BIGSERIAL PRIMARY KEY,
  pair VARCHAR(20) NOT NULL,
  timeframe VARCHAR(5) NOT NULL,
  open_price DECIMAL(36,18) NOT NULL,
  high_price DECIMAL(36,18) NOT NULL,
  low_price DECIMAL(36,18) NOT NULL,
  close_price DECIMAL(36,18) NOT NULL,
  volume DECIMAL(36,18) NOT NULL DEFAULT 0,
  trades INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pair, timeframe, timestamp)
);

-- Trading pairs metadata
CREATE TABLE trading_pairs (
  id SERIAL PRIMARY KEY,
  pair VARCHAR(20) NOT NULL UNIQUE,
  token_in VARCHAR(42) NOT NULL,
  token_out VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(10) NOT NULL,
  token_out_symbol VARCHAR(10) NOT NULL,
  exchange_id VARCHAR(66) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prices_pair_timestamp ON prices(pair, timestamp DESC);
CREATE INDEX idx_prices_timestamp ON prices(timestamp DESC);
CREATE INDEX idx_candles_pair_timeframe_timestamp ON candles(pair, timeframe, timestamp DESC);
CREATE INDEX idx_candles_timestamp ON candles(timestamp DESC);
CREATE INDEX idx_trading_pairs_active ON trading_pairs(is_active);

-- Enable Row Level Security
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_pairs ENABLE ROW LEVEL SECURITY;

-- Policies for public read access
CREATE POLICY "Allow public read on prices" ON prices FOR SELECT USING (true);
CREATE POLICY "Allow public read on candles" ON candles FOR SELECT USING (true);
CREATE POLICY "Allow public read on trading_pairs" ON trading_pairs FOR SELECT USING (true);
```

### 4. Build and Run

```bash
# Build the project
npm run build

# Start the server
npm start

# Or run in development mode
npm run dev
```

## Running Services

### Start All Services Together

```bash
npm run start-tracking
```

### Run Services Individually

```bash
# Price collector only
npm run price-collector

# Candle generator only
npm run candle-generator
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Price Data
- `GET /api/prices/latest` - Get latest prices
- `GET /api/prices/:pair/history` - Get price history for a pair

### Candle Data
- `GET /api/candles/:pair` - Get candles for a specific pair

### Trading Pairs
- `GET /api/pairs` - Get all active trading pairs

### Market Statistics
- `GET /api/market/stats` - Get market statistics

### Admin Endpoints
- `POST /api/admin/start-price-collection` - Start price collection
- `POST /api/admin/start-candle-generation` - Start candle generation

## API Examples

### Get Latest Prices
```bash
curl http://localhost:3001/api/prices/latest
```

### Get Candles for CELO/USDC
```bash
curl "http://localhost:3001/api/candles/CELO_USDC?timeframe=1h&limit=50"
```

### Get Trading Pairs
```bash
curl http://localhost:3001/api/pairs
```

## Development

### Project Structure

- **`src/config/`**: Configuration files for Supabase, Viem, etc.
- **`src/services/`**: Core business logic (PriceCollector, CandleGenerator)
- **`src/types/`**: TypeScript type definitions
- **`src/abis/`**: Smart contract ABIs
- **`scripts/`**: Standalone service scripts

### Adding New Features

1. Create new service in `src/services/`
2. Add types in `src/types/`
3. Create API endpoints in `src/index.ts`
4. Update documentation

### Testing

```bash
# Run tests (when implemented)
npm test
```

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Make sure to set all required environment variables in production:

- `NODE_ENV=production`
- All Supabase credentials
- Celo RPC URL
- Contract addresses

### Process Management

For production, consider using PM2:

```bash
npm install -g pm2
pm2 start dist/index.js --name "c-switch-backend"
```

## Troubleshooting

### Common Issues

1. **Database Connection**: Check Supabase credentials
2. **Blockchain Connection**: Verify Celo RPC URL
3. **Contract Addresses**: Ensure all addresses are correct
4. **Environment Variables**: Verify all required vars are set

### Logs

The application uses structured logging. Check console output for:
- 🚀 Initialization messages
- 📊 Price collection updates
- 🕯️ Candle generation
- ❌ Error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License 