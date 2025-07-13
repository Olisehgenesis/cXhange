-- Fix database schema issues
-- Run this script in your Supabase SQL editor

-- 1. Fix column lengths for trading_pairs table
ALTER TABLE trading_pairs 
ALTER COLUMN pair TYPE VARCHAR(50),
ALTER COLUMN token_in_symbol TYPE VARCHAR(20),
ALTER COLUMN token_out_symbol TYPE VARCHAR(20);

-- 2. Fix prices table schema to match the code
ALTER TABLE prices 
ALTER COLUMN pair TYPE VARCHAR(50);

-- Add missing columns to prices table if they don't exist
DO $$ 
BEGIN
    -- Add token_in column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'token_in') THEN
        ALTER TABLE prices ADD COLUMN token_in VARCHAR(42);
    END IF;
    
    -- Add token_out column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'token_out') THEN
        ALTER TABLE prices ADD COLUMN token_out VARCHAR(42);
    END IF;
    
    -- Add token_in_symbol column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'token_in_symbol') THEN
        ALTER TABLE prices ADD COLUMN token_in_symbol VARCHAR(20);
    END IF;
    
    -- Add token_out_symbol column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'token_out_symbol') THEN
        ALTER TABLE prices ADD COLUMN token_out_symbol VARCHAR(20);
    END IF;
    
    -- Add inverse_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'inverse_price') THEN
        ALTER TABLE prices ADD COLUMN inverse_price DECIMAL(36,18);
    END IF;
    
    -- Add volume_24h column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'volume_24h') THEN
        ALTER TABLE prices ADD COLUMN volume_24h DECIMAL(36,18) DEFAULT 0;
    END IF;
    
    -- Add source column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'source') THEN
        ALTER TABLE prices ADD COLUMN source VARCHAR(10) DEFAULT 'MENTO';
    END IF;
    
    -- Add block_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'block_number') THEN
        ALTER TABLE prices ADD COLUMN block_number BIGINT;
    END IF;
END $$;

-- 2. Add missing RLS policies for trading_pairs
DROP POLICY IF EXISTS "Allow insert on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow insert on trading_pairs" ON trading_pairs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow update on trading_pairs" ON trading_pairs FOR UPDATE USING (true);

-- 3. Add missing RLS policies for prices table
DROP POLICY IF EXISTS "Allow insert on prices" ON prices;
CREATE POLICY "Allow insert on prices" ON prices FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on prices" ON prices;
CREATE POLICY "Allow update on prices" ON prices FOR UPDATE USING (true);

-- 4. Add missing RLS policies for candles table
DROP POLICY IF EXISTS "Allow insert on candles" ON candles;
CREATE POLICY "Allow insert on candles" ON candles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on candles" ON candles;
CREATE POLICY "Allow update on candles" ON candles FOR UPDATE USING (true);

-- 4. Verify the changes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'trading_pairs'
ORDER BY ordinal_position;

-- 5. Check policies for both tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('trading_pairs', 'prices')
ORDER BY tablename, policyname; 