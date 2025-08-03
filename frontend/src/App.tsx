import React from 'react';
import './index.css';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { WalletConnector } from './components/WalletConnector';
import { BridgeInterface } from './components/BridgeInterface';

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
              <a href="#bridge" className="text-gray-300 hover:text-green-400 transition-colors">
                Bridge
              </a>
              <a href="https://github.com/Rakesh-sahoo07/chainbridge" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-400 transition-colors">
                GitHub
              </a>
              <a href="https://sepolia.etherscan.io/address/0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-400 transition-colors">
                Bridge
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
              Single-transaction cross-chain bridge between Ethereum and Aptos
            </p>
            <p className="text-sm text-green-400 neon-text">
              🌉 Simple liquidity bridge with 1:1 mUSDC transfers
            </p>
          </div>
          
          {/* Bridge Interface */}
          <BridgeInterface walletState={walletState} />

          {/* Features Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="cyber-card p-6 text-center">
              <div className="text-4xl mb-4">🌉</div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Liquidity Bridge</h3>
              <p className="text-sm text-gray-400">Single-transaction cross-chain transfers with pre-funded reserves</p>
            </div>
            <div className="cyber-card p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">1:1 Direct</h3>
              <p className="text-sm text-gray-400">Perfect 1:1 mUSDC transfers with no slippage</p>
            </div>
            <div className="cyber-card p-6 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Single Transaction</h3>
              <p className="text-sm text-gray-400">Complete bridge in 1 minute with one wallet approval</p>
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
              <div className="text-3xl font-bold text-green-400 mb-2">&lt;1min</div>
              <div className="text-sm text-gray-400">Bridge Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">$1.25</div>
              <div className="text-sm text-gray-400">Bridge Fee</div>
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
                <h3 className="text-lg font-semibold text-white mb-2">Initiate Bridge</h3>
                <p className="text-sm text-gray-400">Deposit tokens to bridge contract with single wallet approval</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900-10 border border-green-500-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">3️⃣</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Relayer Processing</h3>
                <p className="text-sm text-gray-400">Automated relayer monitors events and processes cross-chain transfer</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900-10 border border-green-500-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">4️⃣</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Receive Tokens</h3>
                <p className="text-sm text-gray-400">Get your tokens instantly from destination bridge reserves</p>
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
                <a href="https://sepolia.etherscan.io/address/0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                  Ethereum Bridge
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