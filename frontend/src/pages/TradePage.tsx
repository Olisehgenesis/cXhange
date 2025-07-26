import React, { useState } from 'react';
import { TradeChart } from '../components/TradeChart';
import QuickTradePanel from '../components/QuickTradePanel';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { MENTO_ASSETS } from '../constants/mentoAssets';
import { useCXchange } from '../hooks/useCXchange';
import ErrorBoundary from '../components/ErrorBoundary';
import { MENTO_TOKENS } from '../constants/addresses';
import { useERC20Allowance } from '../hooks/useERC20Allowance';

const CELO_MAINNET_CHAIN_ID = 42220;
const CXCHANGE_MAINNET_ADDRESS = import.meta.env.VITE_CXCHANGE_ADDRESS_MAINNET as `0x${string}`;

const TradePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<number>(3.1);
  const [approxQuote, setApproxQuote] = useState<{ amountOut: string; protocolFee: string } | null>(null);
  const pair = 'CELO_cUSD'; // In a real app, this should come from global state or props
  const token = pair.split('_')[0];
  const tokenOut = pair.split('_')[1];

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isOnCeloMainnet = chainId === CELO_MAINNET_CHAIN_ID;

  // Get token asset info
  const tokenInAsset = MENTO_ASSETS.find(a => a.symbol === token);
  const tokenOutAsset = MENTO_ASSETS.find(a => a.symbol === tokenOut);

  // Always use mainnet address mapping (fallback to asset address if not found)
  const tokenInAddress = MENTO_TOKENS[token.toLowerCase()] || tokenInAsset?.address;
  const tokenOutAddress = MENTO_TOKENS[tokenOut.toLowerCase()] || tokenOutAsset?.address;

  // Set up swap hook for Celo mainnet
  const { executeSwap, isSwapping } = useCXchange({
    contractAddress: CXCHANGE_MAINNET_ADDRESS,
    account: address,
    chainId: CELO_MAINNET_CHAIN_ID,
  });

  // Get quote for preview
  const { getSwapQuote } = useCXchange({
    contractAddress: CXCHANGE_MAINNET_ADDRESS,
    account: address,
    chainId: CELO_MAINNET_CHAIN_ID,
  });

  // Update quote when amount changes
  React.useEffect(() => {
    if (!tokenInAddress || !tokenOutAddress || !tradeAmount) return;
    getSwapQuote(tokenInAddress, tokenOutAddress, tradeAmount.toString())
      .then(setApproxQuote)
      .catch(() => setApproxQuote(null));
    // eslint-disable-next-line
  }, [tokenInAddress, tokenOutAddress, tradeAmount]);

  // Approve and swap logic
  const { approve } = useERC20Allowance({
    token: tradeType === 'buy' ? tokenOutAddress as `0x${string}` : tokenInAddress as `0x${string}`,
    owner: address as `0x${string}`,
    spender: CXCHANGE_MAINNET_ADDRESS,
  });

  // Helper to detect native CELO
  const isNativeCelo = (addr: string | undefined) =>
    addr?.toLowerCase() === '0x471ece3750da237f93b8e339c536989b8978a438';

  // Unified buy/sell handler
  const handleTrade = async (qty: number, type: 'buy' | 'sell') => {
    setMessage(null);
    const tokenIn = type === 'buy' ? tokenOutAddress : tokenInAddress;
    const tokenOut = type === 'buy' ? tokenInAddress : tokenOutAddress;
    if (!isConnected || !tokenIn || !tokenOut) {
      setMessage({ type: 'error', text: 'Wallet not connected or token info missing' });
      return;
    }
    // Always approve for ERC20 tokens (skip only for native CELO)
    if (!isNativeCelo(tokenIn) && typeof approve === 'function') {
      try {
        setMessage({ type: 'success', text: 'Requesting approval for token spending...' });
        await approve({ args: [CXCHANGE_MAINNET_ADDRESS, (BigInt(qty * 1e18)).toString()] });
        setMessage({ type: 'success', text: 'Approval successful. Proceeding to swap...' });
      } catch (e: any) {
        setMessage({ type: 'error', text: `Approval failed: ${e.message || e}` });
        return;
      }
    }
    // Now swap
    try {
      await executeSwap({
        tokenIn,
        tokenOut,
        amountIn: qty.toString(),
        slippagePercent: 0.5,
      });
      setMessage({ type: 'success', text: `${type === 'buy' ? 'Buy' : 'Sell'} successful: ${qty} ${token}` });
    } catch (e: any) {
      setMessage({ type: 'error', text: `${type === 'buy' ? 'Buy' : 'Sell'} failed: ${e.message || e}` });
    }
  };

  // Buy/Sell panel handlers
  const handlePanelBuy = (qty: number) => {
    setTradeType('buy');
    setTradeAmount(qty);
    handleTrade(qty, 'buy');
  };
  const handlePanelSell = (qty: number) => {
    setTradeType('sell');
    setTradeAmount(qty);
    handleTrade(qty, 'sell');
  };

  // Error if token addresses are missing
  const addressError = !tokenInAddress || !tokenOutAddress;

  if (addressError) {
    console.error('Token address missing:', { token, tokenOut, tokenInAddress, tokenOutAddress });
    return (
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-sand-300 via-sand-200 to-sand-100">
          
          <div className="mt-24 p-8 bg-burgundy-100 text-burgundy-800 rounded-milo shadow-milo text-center max-w-lg">
            <h2 className="text-2xl font-bold mb-2">Token Address Error</h2>
            <p className="mb-2">Unable to find the contract address for <b>{token}</b> or <b>{tokenOut}</b> on Celo mainnet.</p>
            <p className="mb-2">Please check your token list or contact support.</p>
            <div className="text-xs mt-4">Debug info: {String(tokenInAddress)} / {String(tokenOutAddress)}</div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-sand-300 via-sand-200 to-sand-100 relative">
       
        {/* Spinner overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand-200 bg-opacity-80">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-forest-500"></div>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl p-8">
            {!isOnCeloMainnet && (
              <div className="mb-6 px-6 py-4 rounded-milo shadow-milo font-bold text-lg flex items-center justify-between gap-4 bg-burgundy-100 text-burgundy-800">
                <span>
                  You are connected to the wrong network. Please switch to <b>Celo Mainnet</b> to trade.
                </span>
                <button
                  className="ml-4 px-4 py-2 rounded-milo bg-forest-500 text-white font-bold hover:bg-forest-600 transition disabled:opacity-60"
                  onClick={() => switchChain({ chainId: CELO_MAINNET_CHAIN_ID })}
                  disabled={isSwitching}
                >
                  {isSwitching ? 'Switching...' : 'Switch to Celo Mainnet'}
                </button>
              </div>
            )}
            <TradeChart pair={pair} onChartReady={() => setLoading(false)} />
            {/* Remove TradeStepDialog and just show feedback below */}
            {approxQuote && (
              <div className="mb-4 text-sand-700 text-sm text-center">
                Expected conversion: <span className="font-bold">{Number(approxQuote.amountOut).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span> (fee: {Number(approxQuote.protocolFee).toLocaleString(undefined, { maximumFractionDigits: 3 })})
              </div>
            )}
            <QuickTradePanel
              token={token}
              onBuy={handlePanelBuy}
              onSell={handlePanelSell}
              amount={tradeAmount || 1}
            />
            {message && (
              <div className={`mt-6 px-6 py-4 rounded-milo shadow-milo font-bold text-lg flex items-center justify-between gap-4 ${message.type === 'success' ? 'bg-forest-100 text-forest-800' : 'bg-burgundy-100 text-burgundy-800'}`}>
                <span>{message.text}</span>
                <button
                  className="ml-4 px-3 py-1 rounded-milo bg-sand-300 text-sand-800 font-medium hover:bg-sand-400 transition"
                  onClick={() => setMessage(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TradePage; 