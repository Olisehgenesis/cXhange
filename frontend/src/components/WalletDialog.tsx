import { Dialog } from '@headlessui/react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { MENTO_ASSETS } from '../constants/mentoAssets'
import { X } from 'lucide-react'

export default function WalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const networkKey = chainId === 44787 ? 'alfajores' : 'mainnet';
  const assets = MENTO_ASSETS;

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-sand-50 rounded-milo shadow-milo-lg p-8 w-full max-w-md mx-auto z-10">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-sand-200 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-sand-700" />
          </button>
          <Dialog.Title className="text-xl font-outfit font-bold text-sand-800 mb-4">My Wallet</Dialog.Title>
          {isConnected && address ? (
            <>
              <div className="mb-4">
                <div className="text-sand-700 font-inter text-xs">Address</div>
                <div className="font-mono text-sand-800 text-sm">{address.slice(0, 6)}...{address.slice(-4)}</div>
              </div>
              <div className="space-y-2">
                {assets.map(asset => {
                  const { data, isLoading } = useBalance({ address, token: asset.address as `0x${string}`, chainId });
                  return (
                    <div key={asset.symbol} className="flex justify-between items-center p-2 bg-sand-100 rounded-milo">
                      <span className="font-outfit font-semibold text-sand-800">{asset.symbol}</span>
                      <span className="text-sand-700 font-inter text-sm">{isLoading ? 'Loading...' : data ? parseFloat(data.formatted).toFixed(4) : '0.0000'}</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-sand-700 font-inter text-sm">Connect your wallet to view balances.</div>
          )}
        </div>
      </div>
    </Dialog>
  )
} 