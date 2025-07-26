import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, ArrowLeftRight, Coins, PiggyBank } from 'lucide-react';
import WalletConnectButton from './WalletConnectButton';

const navLinks = [
  { to: '/trade', label: 'Trade', icon: TrendingUp },
  { to: '/swap', label: 'Swap', icon: ArrowLeftRight },
  { to: '/stake', label: 'Stake', icon: Coins },
  { to: '/earn', label: 'Earn', icon: PiggyBank },
];

const Header: React.FC = () => {
  const location = useLocation();
  
  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                MiloFX
              </span>
              <div className="text-xs text-gray-500 font-medium">Next-Gen DeFi</div>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50 px-4 py-2 rounded-xl' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Wallet Connect */}
          <div className="flex items-center gap-3">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 