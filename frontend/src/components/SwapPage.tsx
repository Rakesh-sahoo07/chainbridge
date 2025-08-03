import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { BridgeInterface } from './BridgeInterface';
import { WalletConnector } from './WalletConnector';

export const SwapPage: React.FC = () => {
  const { walletState } = useWallet();

  return (
    <div className="min-h-screen  text-white relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-green-900/20 opacity-80"></div>
      <div className="fixed inset-0 bg-gradient-radial from-green-400/5 via-transparent to-transparent"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="w-full p-6 backdrop-blur-sm border-b border-green-400/20">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Back Button */}
              <Link
                to="/"
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800/50 border border-green-400/30 hover:bg-gray-700/50 hover:border-green-400/50 transition-all duration-200"
                title="Back to Home"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                  <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
                </svg>
              </Link>
              
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-sm">S</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Swap</h2>
                </div>
              </div>
            </div>
            
            <WalletConnector />
          </div>
        </header>
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[80vh]">
          <BridgeInterface walletState={walletState} />
        </main>
      </div>
    </div>
  );
};