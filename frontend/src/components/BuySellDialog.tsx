import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useCXchangeGetAmountOut } from '../hooks/useMentoBroker';
import { MENTO_ASSETS as assets, MentoAsset } from '../constants/mentoAssets';
import { useBalance, useChainId, useAccount } from 'wagmi';
import { useCXchange } from '../hooks/useCXchange';

interface BuySellDialogProps {
  open: boolean;
  onClose: () => void;
  action: 'buy' | 'sell' | null;
  tokenIn: string;
  tokenOut: string;
  address?: string;
  isConnected: boolean;
  fonbankLink: string;
}

// Helper to get asset info (address, decimals)
async function getAssetInfo(symbol: string, networkKey: 'mainnet' | 'alfajores') {
    return assets.find(a => a.symbol === symbol);
}

const DECIMALS = 18; // All Mento tokens are 18 decimals

const BuySellDialog: React.FC<BuySellDialogProps> = ({
  open,
  onClose,
  action,
  tokenIn,
  tokenOut,
  address,
  isConnected,
  fonbankLink,
}) => {
  const chainId = useChainId();
  const networkKey: 'mainnet' | 'alfajores' = chainId === 44787 ? 'alfajores' : 'mainnet';
  const [tokenInAsset, setTokenInAsset] = useState<MentoAsset | undefined>();
  const [tokenOutAsset, setTokenOutAsset] = useState<MentoAsset | undefined>();
  const [loadingAssets, setLoadingAssets] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoadingAssets(true);
    Promise.all([
      getAssetInfo(tokenIn, networkKey),
      getAssetInfo(tokenOut, networkKey)
    ]).then(([inAsset, outAsset]) => {
      if (mounted) {
        setTokenInAsset(inAsset);
        setTokenOutAsset(outAsset);
        setLoadingAssets(false);
      }
    });
    return () => { mounted = false; };
  }, [tokenIn, tokenOut, networkKey]);

  // Get contract address for current network
  const contractAddress = networkKey === 'alfajores' 
    ? import.meta.env.VITE_CXCHANGE_ADDRESS_ALFAJORES as `0x${string}`
    : import.meta.env.VITE_CXCHANGE_ADDRESS_MAINNET as `0x${string}`;
  
  // Initialize cXchange hook for trading
  const { executeSwap, isSwapping, swapError } = useCXchange({
    contractAddress,
    account: address,
    chainId,
  });

  // Determine which token is being spent and which is being received based on action
  // For BUY: spend tokenOut (e.g., cUSD) to receive tokenIn (e.g., CELO)
  // For SELL: spend tokenIn (e.g., CELO) to receive tokenOut (e.g., cUSD)
  const spendToken = action === 'buy' ? tokenOutAsset : tokenInAsset;
  const receiveToken = action === 'buy' ? tokenInAsset : tokenOutAsset;
  
  // Only cast to `0x${string}` if defined and starts with 0x
  const spendTokenAddress = spendToken?.address?.startsWith('0x') ? (spendToken.address as `0x${string}`) : undefined;
  const receiveTokenAddress = receiveToken?.address?.startsWith('0x') ? (receiveToken.address as `0x${string}`) : undefined;

  const spendTokenBalance = useBalance({ address, token: spendTokenAddress, chainId });
  const receiveTokenBalance = useBalance({ address, token: receiveTokenAddress, chainId });

  //log spendTokenBalance and receiveTokenBalance
  console.log('spendTokenBalance', spendTokenBalance);
  console.log('receiveTokenBalance', receiveTokenBalance);

  const [amount, setAmount] = useState('');
  const parsedAmount = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return 0n;
    try {
      return BigInt(Math.floor(Number(amount) * 10 ** DECIMALS));
    } catch {
      return 0n;
    }
  }, [amount]);

  // Live price calculation - use spend token as input, receive token as output
  const { data: amountOutRaw, loading: loadingOut } = useCXchangeGetAmountOut({
    tokenIn: spendToken?.address as `0x${string}`,
    tokenOut: receiveToken?.address as `0x${string}`,
    amountIn: parsedAmount,
    enabled: !!spendToken && !!receiveToken && parsedAmount > 0n,
  });

  const amountOut = useMemo(() => {
    if (!amountOutRaw) return '';
    return (Number(amountOutRaw) / 10 ** DECIMALS).toFixed(6);
  }, [amountOutRaw]);

  const price = useMemo(() => {
    if (!amount || !amountOutRaw || Number(amount) === 0) return '';
    const amt = Number(amount);
    const out = Number(amountOutRaw) / 10 ** DECIMALS;
    if (out === 0) return '';
    return (amt / out).toFixed(6);
  }, [amount, amountOutRaw]);

  const balance = Number(spendTokenBalance.data?.formatted || '0');
  const insufficient = Number(amount) > balance;
  const inputError = amount && (isNaN(Number(amount)) || Number(amount) <= 0);

  // Handle swap execution
  const handleSwap = async () => {
    if (!spendToken?.address || !receiveToken?.address || !amount || !action) {
      return;
    }

    try {
      const result = await executeSwap({
        tokenIn: spendToken.address,
        tokenOut: receiveToken.address,
        amountIn: amount,
        slippagePercent: 0.5, // 0.5% slippage tolerance
      });
      
      console.log('Swap executed successfully:', result);
      // Close dialog and reset form
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Swap failed:', error);
      // Error is already handled by the useCXchange hook
    }
  };

  if (loadingAssets) {
    return (
      <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="relative bg-sand-50 rounded-milo shadow-milo-lg p-8 w-full max-w-md mx-auto z-10 flex items-center justify-center">
            <span className="text-sand-700 font-inter text-lg">Loading assets...</span>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-sand-50 rounded-milo shadow-milo-lg p-8 w-full max-w-md mx-auto z-10">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-sand-200 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-sand-700" />
          </button>
          <Dialog.Title className="text-xl font-outfit font-bold text-sand-800 mb-4">
            {action === 'buy' ? `Buy ${tokenIn}` : action === 'sell' ? `Sell ${tokenIn}` : ''}
          </Dialog.Title>
          {isConnected && address ? (
            <>
              <div className="mb-4">
                <div className="text-sand-700 font-inter text-xs">Address</div>
                <div className="font-mono text-sand-800 text-sm">{address.slice(0, 6)}...{address.slice(-4)}</div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center p-2 bg-sand-100 rounded-milo">
                  <span className="font-outfit font-semibold text-sand-800">{tokenIn}</span>
                  <span className="text-sand-700 font-inter text-sm">{action === 'buy' ? receiveTokenBalance.isLoading ? 'Loading...' : receiveTokenBalance.data ? parseFloat(receiveTokenBalance.data.formatted).toFixed(4) : '0.0000' : spendTokenBalance.isLoading ? 'Loading...' : spendTokenBalance.data ? parseFloat(spendTokenBalance.data.formatted).toFixed(4) : '0.0000'}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-sand-100 rounded-milo">
                  <span className="font-outfit font-semibold text-sand-800">{tokenOut}</span>
                  <span className="text-sand-700 font-inter text-sm">{action === 'buy' ? spendTokenBalance.isLoading ? 'Loading...' : spendTokenBalance.data ? parseFloat(spendTokenBalance.data.formatted).toFixed(4) : '0.0000' : receiveTokenBalance.isLoading ? 'Loading...' : receiveTokenBalance.data ? parseFloat(receiveTokenBalance.data.formatted).toFixed(4) : '0.0000'}</span>
                </div>
              </div>
              {parseFloat(spendTokenBalance.data?.formatted || '0') === 0 && parseFloat(receiveTokenBalance.data?.formatted || '0') === 0 && tokenIn === 'cUSD' && (
                <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 rounded-milo mb-4">
                  <p className="text-sand-800 font-inter text-sm mb-2">Your cUSD and {tokenOut} wallets are empty. You can buy cUSD directly from Fonbank to get started.</p>
                  <a href={fonbankLink} target="_blank" rel="noopener noreferrer" className="text-forest-600 font-bold underline">Buy cUSD from Fonbank</a>
                </div>
              )}
              <form className="space-y-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-milo-secondary mb-1">
                    Amount to {action}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-milo w-full text-lg font-mono"
                    placeholder={`0.00 (${action === 'buy' ? tokenIn : tokenIn})`}
                  />
                  {inputError && <div className="text-burgundy-500 text-xs mt-1">Enter a valid amount</div>}
                  {insufficient && <div className="text-burgundy-500 text-xs mt-1">Insufficient balance</div>}
                </div>
                <div className="bg-sand-100 rounded-milo p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Price</span>
                    <span>{price ? `${price} ${action === 'buy' ? tokenOut : tokenIn}/${action === 'buy' ? tokenIn : tokenOut}` : '--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>You {action === 'buy' ? 'pay' : 'pay'}</span>
                    <span>{amount || '--'} {action === 'buy' ? tokenOut : tokenIn}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>You {action === 'buy' ? 'receive' : 'receive'}</span>
                    <span>{loadingOut ? 'Calculating...' : amountOut || '--'} {action === 'buy' ? tokenIn : tokenOut}</span>
                  </div>
                </div>
                {swapError && (
                  <div className="text-burgundy-500 text-xs mt-1 bg-burgundy-50 p-2 rounded-milo">
                    {swapError}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-primary w-full py-2 text-lg font-bold mt-2 disabled:opacity-60"
                  disabled={inputError || insufficient || !amount || loadingOut || !amountOutRaw || isSwapping}
                  onClick={handleSwap}
                >
                  {isSwapping ? 'Processing...' : `Confirm ${action === 'buy' ? 'Buy' : 'Sell'}`}
                </button>
              </form>
            </>
          ) : (
            <div className="text-sand-700 font-inter text-sm">Connect your wallet to view balances.</div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default BuySellDialog; 