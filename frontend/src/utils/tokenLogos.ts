// Token logo fetching utility with multiple fallback sources

export interface TokenLogoInfo {
  logoUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

// Cache for token logos to avoid repeated requests
const logoCache = new Map<string, TokenLogoInfo>();

// Known token logos for Celo ecosystem
const KNOWN_TOKENS: Record<string, string> = {
  // CELO
  '0x471EcE3750Da237f93B8E339c536989b8978a438': 'https://assets.coingecko.com/coins/images/11090/large/InjXBNx9_400x400.jpg',
  
  // cUSD
  '0x765DE816845861e75A25fCA122bb6898B8B1282a': 'https://assets.coingecko.com/coins/images/13161/large/icon-celo-dollar-color-500.png',
  
  // cEUR
  '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73': 'https://assets.coingecko.com/coins/images/16756/large/CEUR.png',
  
  // cREAL
  '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787': 'https://assets.coingecko.com/coins/images/16757/large/CREAL.png',
  
  // USDT
  '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
};

export const getTokenLogo = async (
  tokenAddress: string,
  tokenSymbol?: string
): Promise<TokenLogoInfo> => {
  const normalizedAddress = tokenAddress.toLowerCase();
  
  // Check cache first
  if (logoCache.has(normalizedAddress)) {
    return logoCache.get(normalizedAddress)!;
  }
  
  // Initialize cache entry
  const cacheEntry: TokenLogoInfo = {
    logoUrl: null,
    isLoading: true,
    error: null
  };
  logoCache.set(normalizedAddress, cacheEntry);
  
  try {
    // 1. Check known tokens first
    if (KNOWN_TOKENS[tokenAddress]) {
      cacheEntry.logoUrl = KNOWN_TOKENS[tokenAddress];
      cacheEntry.isLoading = false;
      return cacheEntry;
    }
    
    // 2. Try CoinGecko API
    if (tokenSymbol) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${tokenSymbol.toLowerCase()}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const token = data.coins?.find((coin: any) => 
            coin.symbol.toLowerCase() === tokenSymbol.toLowerCase()
          );
          
          if (token?.thumb) {
            cacheEntry.logoUrl = token.thumb;
            cacheEntry.isLoading = false;
            return cacheEntry;
          }
        }
      } catch (e) {
        console.warn('CoinGecko API failed:', e);
      }
    }
    
    // 3. Try Trust Wallet assets
    try {
      const trustWalletUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/${normalizedAddress}/logo.png`;
      const response = await fetch(trustWalletUrl, { method: 'HEAD' });
      
      if (response.ok) {
        cacheEntry.logoUrl = trustWalletUrl;
        cacheEntry.isLoading = false;
        return cacheEntry;
      }
    } catch (e) {
      console.warn('Trust Wallet assets failed:', e);
    }
    
    // 4. Try Uniswap token list
    try {
      const response = await fetch('https://tokens.uniswap.org/');
      if (response.ok) {
        const data = await response.json();
        const token = data.tokens?.find((t: any) => 
          t.address.toLowerCase() === normalizedAddress
        );
        
        if (token?.logoURI) {
          cacheEntry.logoUrl = token.logoURI;
          cacheEntry.isLoading = false;
          return cacheEntry;
        }
      }
    } catch (e) {
      console.warn('Uniswap token list failed:', e);
    }
    
    // No logo found
    cacheEntry.isLoading = false;
    return cacheEntry;
    
  } catch (error) {
    cacheEntry.error = error instanceof Error ? error.message : 'Unknown error';
    cacheEntry.isLoading = false;
    return cacheEntry;
  }
};

export const getTokenLogoUrl = (tokenAddress: string): string | null => {
  const normalizedAddress = tokenAddress.toLowerCase();
  const cached = logoCache.get(normalizedAddress);
  
  if (cached && !cached.isLoading) {
    return cached.logoUrl;
  }
  
  // Return known token logo immediately
  return KNOWN_TOKENS[tokenAddress] || null;
};

export const clearLogoCache = () => {
  logoCache.clear();
};

export const preloadTokenLogos = async (tokens: Array<{ address: string; symbol: string }>) => {
  const promises = tokens.map(token => getTokenLogo(token.address, token.symbol));
  await Promise.allSettled(promises);
}; 