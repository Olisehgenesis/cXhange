import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useCXchangeGetAmountOut } from '../hooks/useMentoBroker';
import { MENTO_ASSETS as assets, MentoAsset } from '../constants/mentoAssets';
import { useBalance, useChainId, useAccount } from 'wagmi';
import { useCXchange } from '../hooks/useCXchange';
import { celoAlfajores } from 'viem/chains';

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
async function getAssetInfo(symbol: string) {
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
  const chainId = useChainId();const [tokenInAsset, setTokenInAsset] = useState<MentoAsset | undefined>();
  const [tokenOutAsset, setTokenOutAsset] = useState<MentoAsset | undefined>();
  const [loadingAssets, setLoadingAssets] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoadingAssets(true);
    Promise.all([
      getAssetInfo(tokenIn),
      getAssetInfo(tokenOut)
    ]).then(([inAsset, outAsset]) => {
      if (mounted) {
        setTokenInAsset(inAsset);
        setTokenOutAsset(outAsset);
        setLoadingAssets(false);
      }
    });
    return () => { mounted = false; };
  }, [tokenIn, tokenOut]);

  // Get contract address for current network
  const contractAddress = chainId === celoAlfajores.id 
    ? import.meta.env.VITE_CXCHANGE_ADDRESS_ALFAJORES as `0x${string}`
    : import.meta.env.VITE_CXCHANGE_ADDRESS_MAINNET as `0x${string}`;
  
  // Initialize cXchange hook for trading
  const { executeSwap, isSwapping, swapError } = useCXchange({
    contractAddress,
    account: address as `0x${string}`,
    chainId,
  });

  // FIXED: Proper token mapping based on action
  // For BUY action: user wants to buy tokenIn using tokenOut (spend tokenOut, receive tokenIn)
  // For SELL action: user wants to sell tokenIn for tokenOut (spend tokenIn, receive tokenOut)
  const spendTokenSymbol = action === 'buy' ? tokenOut : tokenIn;
  const receiveTokenSymbol = action === 'buy' ? tokenIn : tokenOut;
  const spendToken = action === 'buy' ? tokenOutAsset : tokenInAsset;
  const receiveToken = action === 'buy' ? tokenInAsset : tokenOutAsset;
  
  // Only cast to `0x${string}` if defined and starts with 0x
  const spendTokenAddress = spendToken?.address?.startsWith('0x') ? (spendToken.address as `0x${string}`) : undefined;
  const receiveTokenAddress = receiveToken?.address?.startsWith('0x') ? (receiveToken.address as `0x${string}`) : undefined;

  const spendTokenBalance = useBalance({ address: address as `0x${string}`, token: spendTokenAddress as `0x${string}`, chainId });
  const receiveTokenBalance = useBalance({ address: address as `0x${string}`, token: receiveTokenAddress as `0x${string}`, chainId });

  // Debug logging
  console.log('BuySellDialog Debug:', {
    action,
    tokenIn,
    tokenOut,
    spendTokenSymbol,
    receiveTokenSymbol,
    spendTokenAddress,
    receiveTokenAddress,
    spendTokenBalance: spendTokenBalance.data?.formatted,
    receiveTokenBalance: receiveTokenBalance.data?.formatted,
  });

  const [amount, setAmount] = useState('');
  const parsedAmount = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return 0n;
    try {
      return BigInt(Math.floor(Number(amount) * 10 ** DECIMALS));
    } catch {
      return 0n;
    }
  }, [amount]);

  // FIXED: Use the correct token addresses for the swap quote
  const { data: amountOutRaw, loading: loadingOut, error: amountOutError } = useCXchangeGetAmountOut({
    tokenIn: spendTokenAddress!,
    tokenOut: receiveTokenAddress!,
    amountIn: parsedAmount,
    enabled: !!spendTokenAddress && !!receiveTokenAddress && parsedAmount > 0n,
  });

  // Debugging logs for estimation
  React.useEffect(() => {
    console.log('[BuySellDialog] useCXchangeGetAmountOut params:', {
      tokenIn: spendTokenAddress,
      tokenOut: receiveTokenAddress,
      amountIn: parsedAmount.toString(),
      enabled: !!spendTokenAddress && !!receiveTokenAddress && parsedAmount > 0n,
    });
    console.log('[BuySellDialog] useCXchangeGetAmountOut result:', {
      amountOutRaw: amountOutRaw?.toString(),
      loadingOut,
      amountOutError,
    });
  }, [spendTokenAddress, receiveTokenAddress, parsedAmount, amountOutRaw, loadingOut, amountOutError]);

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
    if (!spendTokenAddress || !receiveTokenAddress || !amount || !action) {
      console.error('Missing required swap parameters');
      return;
    }

    try {
      console.log('Executing swap with params:', {
        tokenIn: spendTokenAddress,
        tokenOut: receiveTokenAddress,
        amountIn: amount,
        action,
      });

      const result = await executeSwap({
        tokenIn: spendTokenAddress,
        tokenOut: receiveTokenAddress,
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
                  <span className="font-outfit font-semibold text-sand-800">{spendTokenSymbol}</span>
                  <span className="text-sand-700 font-inter text-sm">
                    {spendTokenBalance.isLoading ? 'Loading...' : spendTokenBalance.data ? parseFloat(spendTokenBalance.data.formatted).toFixed(4) : '0.0000'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-sand-100 rounded-milo">
                  <span className="font-outfit font-semibold text-sand-800">{receiveTokenSymbol}</span>
                  <span className="text-sand-700 font-inter text-sm">
                    {receiveTokenBalance.isLoading ? 'Loading...' : receiveTokenBalance.data ? parseFloat(receiveTokenBalance.data.formatted).toFixed(4) : '0.0000'}
                  </span>
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
                    Amount to spend ({spendTokenSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-milo w-full text-lg font-mono"
                    placeholder={`0.00 ${spendTokenSymbol}`}
                  />
                  {inputError && <div className="text-burgundy-500 text-xs mt-1">Enter a valid amount</div>}
                  {insufficient && <div className="text-burgundy-500 text-xs mt-1">Insufficient balance</div>}
                </div>
                <div className="bg-sand-100 rounded-milo p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Price</span>
                    <span>{price ? `${price} ${spendTokenSymbol}/${receiveTokenSymbol}` : '--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>You spend</span>
                    <span>{amount || '--'} {spendTokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>You receive</span>
                    <span>
                      {loadingOut ? 'Calculating...' : amountOut || '--'} {receiveTokenSymbol}
                    </span>
                  </div>
                  {amountOutError && (
                    <div className="text-burgundy-500 text-xs mt-1">
                      Error getting quote: {amountOutError.message}
                    </div>
                  )}
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