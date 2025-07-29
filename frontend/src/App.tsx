import React from 'react';
import './index.css';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { WalletConnector } from './components/WalletConnector';
import { SwapInterface } from './components/SwapInterface';

function AppContent() {
  const { walletState } = useWallet();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="matrix-bg"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="w-full p-6 border-b border-green-500-30 backdrop-blur-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-400 rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-bold text-lg">🌉</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-400">ChainBridge</h2>
                <p className="text-sm text-gray-400">Cross-chain DeFi Protocol</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8 mr-8">
              <a href="#swap" className="text-gray-300 hover:text-green-400 transition-colors">
                Swap
              </a>
              <a href="https://github.com/Rakesh-sahoo07/chainbridge" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-400 transition-colors">
                GitHub
              </a>
              <a href="https://sepolia.etherscan.io/address/0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-400 transition-colors">
                Contracts
              </a>
            </nav>
            
            <WalletConnector />
          </div>
        </header>
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent animate-pulse">
              ChainBridge Protocol
            </h1>
            <p className="text-xl text-gray-300 mb-2">
              Cross-chain atomic swaps between Ethereum and Aptos
            </p>
            <p className="text-sm text-green-400 neon-text">
              🌉 Bridging DeFi across chains with atomic swap technology
            </p>
          </div>
          
          {/* Swap Interface */}
          <SwapInterface walletState={walletState} />

          {/* Features Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="cyber-card p-6 text-center">
              <div className="text-4xl mb-4">⚛️</div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Atomic Swaps</h3>
              <p className="text-sm text-gray-400">Trustless cross-chain exchanges with cryptographic guarantees</p>
            </div>
            <div className="cyber-card p-6 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Secure Protocol</h3>
              <p className="text-sm text-gray-400">Hashlock/timelock mechanisms ensure complete security</p>
            </div>
            <div className="cyber-card p-6 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Fast Execution</h3>
              <p className="text-sm text-gray-400">Complete swaps in 2-5 minutes with minimal gas fees</p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">2</div>
              <div className="text-sm text-gray-400">Supported Chains</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">100%</div>
              <div className="text-sm text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">&lt;5min</div>
              <div className="text-sm text-gray-400">Avg Swap Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">$2.50</div>
              <div className="text-sm text-gray-400">Avg Gas Fee</div>
            </div>
          </div>

          {/* How it Works Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center text-green-400 mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900-10 border border-green-500-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">1️⃣</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Connect Wallets</h3>
                <p className="text-sm text-gray-400">Connect both MetaMask and Petra wallets to enable cross-chain functionality</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900-10 border border-green-500-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">2️⃣</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Initiate Swap</h3>
                <p className="text-sm text-gray-400">Lock your tokens on the source chain with hashlock protection</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900-10 border border-green-500-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">3️⃣</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Atomic Exchange</h3>
                <p className="text-sm text-gray-400">Smart contracts coordinate the exchange across both blockchains</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900-10 border border-green-500-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">4️⃣</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Receive Tokens</h3>
                <p className="text-sm text-gray-400">Get your tokens on the destination chain with atomic guarantees</p>
              </div>
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="mt-20 border-t border-green-500-30 backdrop-blur-md">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Built with ❤️ for the 1inch Cross-Chain Hackathon • 
                <span className="text-green-400 ml-1">Bridging the future of DeFi</span>
              </p>
              <div className="mt-4 flex justify-center space-x-6 text-xs">
                <a href="https://github.com/Rakesh-sahoo07/chainbridge" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                  GitHub Repository
                </a>
                <a href="https://sepolia.etherscan.io/address/0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                  Ethereum Contract
                </a>
                <a href="https://explorer.aptoslabs.com/account/0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4?network=testnet" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                  Aptos Contract
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;