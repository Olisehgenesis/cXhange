-- Database setup script for c-switch backend
-- Run this script in your Supabase SQL editor

-- Prices table for storing real-time price data
CREATE TABLE IF NOT EXISTS prices (
  id BIGSERIAL PRIMARY KEY,
  pair VARCHAR(50) NOT NULL,
  token_in VARCHAR(42) NOT NULL,
  token_out VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(20) NOT NULL,
  token_out_symbol VARCHAR(20) NOT NULL,
  price DECIMAL(36,18) NOT NULL,
  inverse_price DECIMAL(36,18) NOT NULL,
  volume_24h DECIMAL(36,18) DEFAULT 0,
  source VARCHAR(10) NOT NULL DEFAULT 'MENTO',
  timestamp TIMESTAMPTZ NOT NULL,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candles table for different timeframes
CREATE TABLE IF NOT EXISTS candles (
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
CREATE TABLE IF NOT EXISTS trading_pairs (
  id SERIAL PRIMARY KEY,
  pair VARCHAR(50) NOT NULL UNIQUE,
  token_in VARCHAR(42) NOT NULL,
  token_out VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(20) NOT NULL,
  token_out_symbol VARCHAR(20) NOT NULL,
  exchange_id VARCHAR(66) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prices_pair_timestamp ON prices(pair, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_candles_pair_timeframe_timestamp ON candles(pair, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_candles_timestamp ON candles(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_active ON trading_pairs(is_active);

-- Enable Row Level Security
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_pairs ENABLE ROW LEVEL SECURITY;

-- Policies for public read access
DROP POLICY IF EXISTS "Allow public read on prices" ON prices;
CREATE POLICY "Allow public read on prices" ON prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on candles" ON candles;
CREATE POLICY "Allow public read on candles" ON candles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow public read on trading_pairs" ON trading_pairs FOR SELECT USING (true);

-- Policies for insert/update access (needed for the service)
DROP POLICY IF EXISTS "Allow insert on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow insert on trading_pairs" ON trading_pairs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow update on trading_pairs" ON trading_pairs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow insert on prices" ON prices;
CREATE POLICY "Allow insert on prices" ON prices FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on prices" ON prices;
CREATE POLICY "Allow update on prices" ON prices FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow insert on candles" ON candles;
CREATE POLICY "Allow insert on candles" ON candles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on candles" ON candles;
CREATE POLICY "Allow update on candles" ON candles FOR UPDATE USING (true);

-- Insert some sample trading pairs (optional)
INSERT INTO trading_pairs (pair, token_in, token_out, token_in_symbol, token_out_symbol, exchange_id, is_active) 
VALUES 
  ('CELO_USDC', '0x471EcE3750Da237f93B8E339c536989b8978a438', '0x765DE816845861e75A25fCA122bb6898B8B1282a', 'CELO', 'USDC', '0x123456789012345678901234567890123456789012345678901234567890123456', true),
  ('CELO_USDT', '0x471EcE3750Da237f93B8E339c536989b8978a438', '0x765DE816845861e75A25fCA122bb6898B8B1282a', 'CELO', 'USDT', '0x123456789012345678901234567890123456789012345678901234567890123457', true)
ON CONFLICT (pair) DO NOTHING;

-- Verify tables were created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('prices', 'candles', 'trading_pairs')
ORDER BY table_name, ordinal_position; 