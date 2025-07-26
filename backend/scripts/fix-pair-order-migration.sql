-- Migration: Fix trading pair order to always have CELO (or volatile) as token_in and cUSD (or stable) as token_out
-- Run this in your Supabase SQL editor or psql

-- Define which symbols are considered stable
DO $$
DECLARE
  stable_symbols text[] := ARRAY['cUSD', 'cUSDC', 'USDC', 'cUSDT', 'USDT'];
  celo_symbol text := 'CELO';
BEGIN
  -- Update trading_pairs table
  UPDATE trading_pairs
  SET 
    pair = token_out_symbol || '_' || token_in_symbol,
    token_in = token_out,
    token_out = token_in,
    token_in_symbol = token_out_symbol,
    token_out_symbol = token_in_symbol
  WHERE 
    (token_in_symbol = ANY(stable_symbols) AND token_out_symbol = celo_symbol)
    OR (token_in_symbol = ANY(stable_symbols) AND token_out_symbol NOT IN (SELECT unnest(stable_symbols)));

  -- Update prices table
  UPDATE prices
  SET 
    pair = token_out_symbol || '_' || token_in_symbol,
    token_in = token_out,
    token_out = token_in,
    token_in_symbol = token_out_symbol,
    token_out_symbol = token_in_symbol
  WHERE 
    (token_in_symbol = ANY(stable_symbols) AND token_out_symbol = celo_symbol)
    OR (token_in_symbol = ANY(stable_symbols) AND token_out_symbol NOT IN (SELECT unnest(stable_symbols)));
END $$; 