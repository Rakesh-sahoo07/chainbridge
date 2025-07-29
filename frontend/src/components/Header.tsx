import React from 'react';
import { WalletConnection } from './WalletConnection';

export const Header: React.FC = () => {
  return (
    <header className="w-full p-6 border-b border-primary-900/30 backdrop-blur-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-green rounded-lg flex items-center justify-center">
            <span className="text-dark-900 font-bold text-lg">🌉</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-400">ChainBridge</h2>
            <p className="text-sm text-gray-400">Cross-chain DeFi Protocol</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <a href="#swap" className="text-gray-300 hover:text-primary-400 transition-colors">
            Swap
          </a>
          <a href="#docs" className="text-gray-300 hover:text-primary-400 transition-colors">
            Docs
          </a>
          <a href="#github" className="text-gray-300 hover:text-primary-400 transition-colors">
            GitHub
          </a>
        </nav>

        <WalletConnection />
      </div>
    </header>
  );
};