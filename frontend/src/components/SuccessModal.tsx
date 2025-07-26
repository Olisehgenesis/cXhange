import React from 'react';
import { CheckCircle, ExternalLink, Copy, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionHash?: string;
  positionId?: string;
  poolSymbol: string;
  amount0: string;
  amount1: string;
  token0Symbol: string;
  token1Symbol: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  transactionHash,
  positionId,
  poolSymbol,
  amount0,
  amount1,
  token0Symbol,
  token1Symbol
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Position Minted Successfully!
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {poolSymbol} Position Created
          </h4>
          <p className="text-gray-600">
            Your liquidity position has been successfully minted
          </p>
        </div>

        {/* Position Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Position Details</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pool:</span>
              <span className="font-medium">{poolSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">
                {amount0} {token0Symbol} + {amount1} {token1Symbol}
              </span>
            </div>
            {positionId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Position ID:</span>
                <span className="font-medium font-mono">#{positionId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Info */}
        {transactionHash && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Transaction</h5>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-600 truncate flex-1 mr-2">
                {transactionHash}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(transactionHash)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Copy transaction hash"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={`https://celoscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-blue-600 hover:text-blue-700"
                  title="View on CeloScan"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            View My Positions
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Mint Another Position
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h6 className="text-sm font-medium text-yellow-800 mb-1">💡 Tips</h6>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Monitor your position's performance regularly</li>
            <li>• Consider rebalancing if prices move significantly</li>
            <li>• You can add more liquidity or remove it anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal; 