// Auto-generated Mento assets - Updated: 2025-07-14T10:45:27.324Z
// This file is dynamically generated from on-chain data

export interface MentoAsset {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export const MENTO_ASSETS = {
  mainnet: [

  ],
  alfajores: [

  ],
} as const;

// Helper functions
export function getMentoAssetBySymbol(symbol: string, network: 'mainnet' | 'alfajores'): MentoAsset | undefined {
  return MENTO_ASSETS[network].find(asset => asset.symbol.toLowerCase() === symbol.toLowerCase());
}

export function getMentoAssetByAddress(address: string, network: 'mainnet' | 'alfajores'): MentoAsset | undefined {
  return MENTO_ASSETS[network].find(asset => asset.address.toLowerCase() === address.toLowerCase());
}

export function getAllMentoAssets(network: 'mainnet' | 'alfajores'): MentoAsset[] {
  return MENTO_ASSETS[network];
}
