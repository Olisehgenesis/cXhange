-- Fix database schema issues
-- Run this script in your Supabase SQL editor

-- 1. Fix column lengths for trading_pairs table
ALTER TABLE trading_pairs 
ALTER COLUMN pair TYPE VARCHAR(50),
ALTER COLUMN token_in_symbol TYPE VARCHAR(20),
ALTER COLUMN token_out_symbol TYPE VARCHAR(20);

-- 2. Add missing RLS policies for trading_pairs
DROP POLICY IF EXISTS "Allow insert on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow insert on trading_pairs" ON trading_pairs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on trading_pairs" ON trading_pairs;
CREATE POLICY "Allow update on trading_pairs" ON trading_pairs FOR UPDATE USING (true);

-- 3. Verify the changes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'trading_pairs'
ORDER BY ordinal_position;

-- 4. Check policies
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
WHERE tablename = 'trading_pairs'; 