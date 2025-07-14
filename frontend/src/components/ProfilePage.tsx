import { useAccount } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-300 via-sand-200 to-sand-100 flex flex-col items-center justify-center p-8">
      <div className="bg-sand-50 rounded-milo shadow-milo-lg p-8 w-full max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="mb-6 btn-secondary">&larr; Back to Trading</button>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-14 h-14 bg-forest-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-forest-500" />
          </div>
          <div>
            <h2 className="text-2xl font-outfit font-bold text-sand-800">My Profile</h2>
            {isConnected && address && (
              <p className="text-sand-700 font-mono text-xs mt-1">{address.slice(0, 6)}...{address.slice(-4)}</p>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-sand-100 rounded-milo p-4">
            <h3 className="font-outfit font-semibold text-sand-800 mb-2">My Trades</h3>
            <div className="text-sand-700 font-inter text-sm">(Your recent trades will appear here.)</div>
          </div>
          <div className="bg-sand-100 rounded-milo p-4">
            <h3 className="font-outfit font-semibold text-sand-800 mb-2">Account</h3>
            <div className="text-sand-700 font-inter text-sm">(Account details and settings will appear here.)</div>
          </div>
        </div>
      </div>
    </div>
  )
} 