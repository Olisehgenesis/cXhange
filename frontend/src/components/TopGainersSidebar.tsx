import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingPairs, usePriceHistory } from '../hooks/useApi';

// Helper to calculate % change
function getPercentChange(latest: number, old: number): number {
  if (old === 0) return 0;
  return ((latest - old) / old) * 100;
}

function get24hAgoISOString() {
  const now = new Date();
  now.setHours(now.getHours() - 24);
  return now.toISOString();
}

const FIXED_AMOUNT = 1; // Amount to buy/sell

const TopGainersSidebar: React.FC = () => {
  const { data: pairs = [], isLoading: pairsLoading } = useTradingPairs();
  const before24h = get24hAgoISOString();

  // For each pair, fetch latest price and price as of 24h ago
  const priceData = pairs.map(pair => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: latest = [] } = usePriceHistory(pair.pair, 1);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: old = [] } = usePriceHistory(pair.pair, 1, before24h);
    return {
      pair,
      latestPrice: latest[0] ? parseFloat(latest[0].price) : null,
      oldPrice: old[0] ? parseFloat(old[0].price) : null,
    };
  });

  // Calculate % change for each pair
  const sortedGainers = useMemo(() => {
    return priceData
      .filter(pd => pd.latestPrice !== null && pd.oldPrice !== null)
      .map(pd => ({
        pair: pd.pair,
        percentChange: getPercentChange(pd.latestPrice!, pd.oldPrice!),
      }))
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 5);
  }, [priceData]);

  // Simulate buy/sell action for the top gainer
  const handleTrade = (type: 'buy' | 'sell') => {
    if (!sortedGainers.length) return;
    const topPair = sortedGainers[0].pair.pair;
    // Here you would call your trade API or smart contract
    // For now, just log the action
    alert(`${type === 'buy' ? 'Buying' : 'Selling'} ${FIXED_AMOUNT} of ${topPair}`);
  };

  return (
    <div className="hidden md:flex w-full h-16 items-stretch justify-between px-0 bg-sand-100 border-t border-b border-sand-300">
      {/* Buy Button */}
      <button
        className="h-full px-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-none focus:outline-none"
        style={{ minWidth: 100 }}
        onClick={() => handleTrade('buy')}
      >
        Buy
      </button>
      {/* Top Gainers List */}
      <div className="flex-1 flex flex-row items-center justify-center overflow-x-auto space-x-4">
        {pairsLoading ? (
          <div className="text-sand-600 text-sm">Loading...</div>
        ) : sortedGainers.length === 0 ? (
          <div className="text-sand-600 text-sm">No data</div>
        ) : (
          sortedGainers.map(({ pair, percentChange }) => (
            <div key={pair.pair} className="flex items-center space-x-2 px-3 py-1 bg-sand-50 rounded-milo min-w-max">
              <span className="font-semibold text-sand-800">{pair.pair.replace('_', '/')}</span>
              <span className={`flex items-center font-bold text-sm ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {percentChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
              </span>
            </div>
          ))
        )}
      </div>
      {/* Sell Button */}
      <button
        className="h-full px-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none focus:outline-none"
        style={{ minWidth: 100 }}
        onClick={() => handleTrade('sell')}
      >
        Sell
      </button>
    </div>
  );
};

export default TopGainersSidebar; 