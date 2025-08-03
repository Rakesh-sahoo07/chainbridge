import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { BridgeInterface } from './BridgeInterface';

export const HomePage: React.FC = () => {
  const { walletState } = useWallet();

  return (
    <div className="min-h-screen  text-white relative overflow-hidden" style={{ backgroundColor: '#000000', paddingLeft: '80px', paddingRight: '80px' }}>
      
      <div className="relative z-10 min-h-screen p-6 lg:p-8 xl:p-12">
        {/* Navbar */}
        <nav className="w-full mb-16 lg:mb-24">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-green-400">ChainShift</h2>
            </div>
            
            {/* Connect Wallet Button */}
            <Link
              to="/swap"
              className="connect-wallet-btn"
            >
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <span>Cross-Chain Swap</span>
            </Link>
          </div>
        </nav>

        {/* Split Layout Container */}
        <div className="flex lg:flex-row min-h-[calc(100vh-280px)] mt-16 justify-center">
          
          {/* Left Side - Marketing Content */}
          <div className="flex-1 flex items-center">
            <div className="max-w-2xl">
              <h1 className="clean-title">
                <span className="title-line">SEAMLESS</span>
                <span className="title-line">CROSS-CHAIN</span>
                <span className="title-line">SWAPS:</span>
                <span className="title-line title-green">ETHEREUM &</span>
                <span className="title-line title-green">APTOS</span>
              </h1>
              
              <p className="clean-subtitle">
                Swap tokens across chains in seconds, with deep liquidity and low slippage. The future of DeFi is here.
              </p>
            </div>
          </div>

          {/* Right Side - Swap Interface */}
          <div className="flex-1 flex items-center justify-center mt-8 lg:mt-0 lg:ml-8">
            <div className="w-full max-w-md">
              <BridgeInterface walletState={walletState} hideWalletStatus={true} />
            </div>
          </div>

        </div>

        {/* Analytics Section */}
        <div className="analytics-section">
          <div className="analytics-header">
            <h2 className="analytics-title">Swap Analytics & History</h2>
            <p className="analytics-description">
              Explore real-time data and review your past transactions on the network.
            </p>
          </div>
          
          <div className="bento-grid">
            {/* Chart Card - Large */}
            <div className="bento-card chart-card">
              <div className="card-header">
                <h3>ETH/USDC Price</h3>
                <span className="card-subtitle">Last 7 days mock data</span>
              </div>
              <div className="chart-container">
                <svg className="price-chart" viewBox="0 0 300 120">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#7FFB50', stopOpacity: 0.3 }} />
                      <stop offset="100%" style={{ stopColor: '#7FFB50', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  <path d="M0,100 L50,80 L100,60 L150,45 L200,55 L250,35 L300,25" 
                        stroke="#7FFB50" 
                        strokeWidth="2" 
                        fill="none" />
                  <path d="M0,100 L50,80 L100,60 L150,45 L200,55 L250,35 L300,25 L300,120 L0,120 Z" 
                        fill="url(#chartGradient)" />
                </svg>
              </div>
            </div>

            {/* Recent Transactions Card - Large */}
            <div className="bento-card transactions-card">
              <div className="card-header">
                <h3>Recent Transactions</h3>
              </div>
              <div className="transactions-table">
                <div className="transaction-row">
                  <span className="tx-type tx-swap">Swap</span>
                  <div className="tx-details">
                    <div>1.5 ETH → 4,500 USDC</div>
                    <div className="tx-hash">0x123...def</div>
                  </div>
                  <span className="tx-time">2m ago</span>
                </div>
                <div className="transaction-row">
                  <span className="tx-type tx-add-lp">Add LP</span>
                  <div className="tx-details">
                    <div>1,000 USDT → 1,000 USDC</div>
                    <div className="tx-hash">0x456...ghi</div>
                  </div>
                  <span className="tx-time">5m ago</span>
                </div>
                <div className="transaction-row">
                  <span className="tx-type tx-swap">Swap</span>
                  <div className="tx-details">
                    <div>250 MATIC → 0.05 WETH</div>
                    <div className="tx-hash">0x789...jkl</div>
                  </div>
                  <span className="tx-time">12m ago</span>
                </div>
                <div className="transaction-row">
                  <span className="tx-type tx-remove-lp">Remove LP</span>
                  <div className="tx-details">
                    <div>0.2 WBTC → 5 ETH</div>
                    <div className="tx-hash">0xabc...mno</div>
                  </div>
                  <span className="tx-time">25m ago</span>
                </div>
                <div className="transaction-row">
                  <span className="tx-type tx-swap">Swap</span>
                  <div className="tx-details">
                    <div>5,000 DAI → 4,995 USDC</div>
                    <div className="tx-hash">0xdef...pqr</div>
                  </div>
                  <span className="tx-time">30m ago</span>
                </div>
                <div className="transaction-row">
                  <span className="tx-type tx-swap">Swap</span>
                  <div className="tx-details">
                    <div>10 SOL → 1,500 USDC</div>
                    <div className="tx-hash">0xghi...stu</div>
                  </div>
                  <span className="tx-time">45m ago</span>
                </div>
              </div>
            </div>

            {/* Stat Cards - Small Grid */}
            <div className="stats-grid">
              <div className="bento-card stat-card">
                <h3>Total Volume</h3>
                <div className="stat-value">$125.43M</div>
                <div className="stat-change positive">+12.5%</div>
              </div>
              
              <div className="bento-card stat-card">
                <h3>24h Volume</h3>
                <div className="stat-value">$4.57M</div>
                <div className="stat-change positive">+8.2%</div>
              </div>
              
              <div className="bento-card stat-card">
                <h3>Active Users</h3>
                <div className="stat-value">12,876</div>
                <div className="stat-change negative">-1.4%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Green gradient patches */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-16 left-32 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.15)' }}></div>
        <div className="absolute top-64 right-24 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.12)' }}></div>
        <div className="absolute bottom-32 left-16 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.18)' }}></div>
        <div className="absolute top-32 left-1/2 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.10)' }}></div>
        <div className="absolute bottom-48 right-32 w-88 h-88 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.14)' }}></div>
        <div className="absolute top-80 left-1/4 w-56 h-56 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.16)' }}></div>
        <div className="absolute bottom-16 left-1/3 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.11)' }}></div>
        <div className="absolute top-48 right-1/3 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.13)' }}></div>
        <div className="absolute bottom-64 left-1/2 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.17)' }}></div>
        <div className="absolute top-96 right-16 w-60 h-60 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.12)' }}></div>
        <div className="absolute bottom-80 left-8 w-68 h-68 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.15)' }}></div>
        <div className="absolute top-40 left-3/4 w-76 h-76 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.14)' }}></div>
        <div className="absolute bottom-24 right-1/4 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.16)' }}></div>
        <div className="absolute top-72 left-16 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.13)' }}></div>
        <div className="absolute bottom-96 right-48 w-56 h-56 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.11)' }}></div>
        <div className="absolute top-24 right-64 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.18)' }}></div>
        <div className="absolute bottom-40 left-64 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.12)' }}></div>
        <div className="absolute top-88 right-8 w-68 h-68 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.15)' }}></div>
        <div className="absolute bottom-8 left-80 w-60 h-60 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.14)' }}></div>
        <div className="absolute top-56 left-96 w-76 h-76 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(127, 251, 80, 0.17)' }}></div>
      </div>
    </div>
  );
};