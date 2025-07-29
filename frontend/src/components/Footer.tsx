import React from 'react';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-primary-900/30 backdrop-blur-md">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Project Info */}
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-4">ChainBridge Protocol</h3>
            <p className="text-sm text-gray-400 mb-4">
              Trustless cross-chain atomic swaps between Ethereum and Aptos networks.
              Built for the 1inch Cross-Chain Hackathon.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com/Rakesh-sahoo07/chainbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-accent-green transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://1inch.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-accent-green transition-colors"
              >
                1inch
              </a>
            </div>
          </div>

          {/* Contract Addresses */}
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Smart Contracts</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-300">Ethereum (Sepolia)</p>
                <p className="text-xs text-gray-500 font-mono">
                  {CONTRACT_ADDRESSES.ethereum.crossChainSwap}
                </p>
              </div>
              <div>
                <p className="text-gray-300">Aptos (Testnet)</p>
                <p className="text-xs text-gray-500 font-mono break-all">
                  {CONTRACT_ADDRESSES.aptos.crossChainSwap}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Network Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Ethereum Sepolia</span>
                <span className="status-success">Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Aptos Testnet</span>
                <span className="status-success">Online</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-dark-800/50 rounded-lg">
              <p className="text-xs text-gray-400">
                ⚠️ Testnet only. Do not use with mainnet funds.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary-900/30 text-center">
          <p className="text-sm text-gray-400">
            Built with ❤️ for the 1inch Cross-Chain Hackathon • 
            <span className="text-primary-400 ml-1">Bridging the future of DeFi</span>
          </p>
        </div>
      </div>
    </footer>
  );
};