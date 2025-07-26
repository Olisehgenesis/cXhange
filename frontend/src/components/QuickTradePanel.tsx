import React from 'react';

interface QuickTradePanelProps {
  onBuy: (quantity: number) => void;
  onSell: (quantity: number) => void;
  amount?: number;
  token: string;
}

const QuickTradePanel: React.FC<QuickTradePanelProps> = ({ onBuy, onSell, amount = 3.1, token }) => {
  const [qty, setQty] = React.useState(amount);
  const handleBuy = () => {
    if (qty > 0) {
      onBuy(qty);
    }
  };
  const handleSell = () => {
    if (qty > 0) {
      onSell(qty);
    }
  };
  const handleDecrement = () => {
    setQty(q => Math.max(1, q - 1));
  };
  const handleIncrement = () => {
    setQty(q => q + 1);
  };
  return (
    <div className="flex flex-row items-center justify-center gap-6 w-full mt-6 bg-sand-100 rounded-xl shadow-milo p-8">
      <button
        className="flex-1 px-8 py-6 rounded-milo font-bold text-2xl bg-forest-500 hover:bg-forest-600 text-white shadow-milo transition"
        onClick={handleBuy}
      >
        Buy
      </button>
      <div className="flex flex-row items-center gap-4 bg-sand-50 rounded-milo px-6 py-4">
        <button
          className="w-12 h-12 rounded-full bg-sand-200 hover:bg-sand-300 text-3xl font-bold flex items-center justify-center shadow"
          onClick={handleDecrement}
        >
          -
        </button>
        <span className="text-2xl font-semibold text-sand-800 min-w-[60px] text-center">{qty} {token}</span>
        <button
          className="w-12 h-12 rounded-full bg-sand-200 hover:bg-sand-300 text-3xl font-bold flex items-center justify-center shadow"
          onClick={handleIncrement}
        >
          +
        </button>
      </div>
      <button
        className="flex-1 px-8 py-6 rounded-milo font-bold text-2xl bg-burgundy-500 hover:bg-burgundy-600 text-white shadow-milo transition"
        onClick={handleSell}
      >
        Sell
      </button>
    </div>
  );
};

export default QuickTradePanel;
