import { Dialog } from '@headlessui/react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { MENTO_ASSETS } from '../constants/mentoAssets'
import { X, PieChart, ListFilter } from 'lucide-react'
import { useState } from 'react'
import { Pie, PieChart as RePieChart, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899']

export default function WalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const networkKey = chainId === 44787 ? 'alfajores' : 'mainnet'
  const assets = MENTO_ASSETS

  const [showHidden, setShowHidden] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list')

  const balances = assets.map(asset => {
    const { data, isLoading } = useBalance({
      address,
      token: asset.address as `0x${string}`,
      chainId,
    })

    return {
      symbol: asset.symbol,
      amount: isLoading ? null : data?.value,
      formatted: isLoading ? null : parseFloat(data?.formatted || '0'),
    }
  })

  const visibleAssets = balances.filter(b => showHidden || (b.formatted ?? 0) > 0)

  const chartData = visibleAssets.map((asset, index) => ({
    name: asset.symbol,
    value: asset.formatted || 0,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10 transform rotate-1">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">My Wallet</Dialog.Title>

          {isConnected && address ? (
            <>
              <div className="text-xs text-gray-500 mb-4">
                Address: <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setShowHidden(prev => !prev)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showHidden ? 'Hide Zero Balances' : 'Show Hidden Assets'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded hover:bg-gray-200 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                  >
                    <ListFilter className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`p-1 rounded hover:bg-gray-200 ${viewMode === 'chart' ? 'bg-gray-100' : ''}`}
                  >
                    <PieChart className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-2">
                  {visibleAssets.map(asset => (
                    <div
                      key={asset.symbol}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-sm text-gray-700">
                        {asset.formatted?.toFixed(4) ?? 'Loading...'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-600">Connect your wallet to view balances.</div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
