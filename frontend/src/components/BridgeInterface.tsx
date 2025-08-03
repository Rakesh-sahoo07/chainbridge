import React, { useState, useEffect } from 'react';
import { initiateBridgeTransfer, type BridgeParams, type BridgeResult } from '../services/bridgeService';
import { bridgeMonitor, type BridgeMonitorResult } from '../services/bridgeMonitor';
import { useToast } from '../contexts/ToastContext';
import './BridgeInterface.css';

interface WalletState {
  ethereum: {
    connected: boolean;
    address?: string;
    balance?: string;
  };
  aptos: {
    connected: boolean;
    address?: string;
    balance?: string;
  };
}

interface BridgeInterfaceProps {
  walletState: WalletState;
  hideWalletStatus?: boolean;
}

export const BridgeInterface: React.FC<BridgeInterfaceProps> = ({ walletState, hideWalletStatus = false }) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [selectedChain, setSelectedChain] = useState<'ethereum' | 'aptos'>('ethereum');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [monitorResult, setMonitorResult] = useState<BridgeMonitorResult | null>(null);
  const [ethMUSDCBalance, setEthMUSDCBalance] = useState<string>('0.00');
  const [aptosMUSDCBalance, setAptosMUSDCBalance] = useState<string>('0.00');

  // Format balance to 2 decimal places
  const formatBalance = (balance: string | undefined): string => {
    if (!balance || balance === '0' || balance === '0.0') return '0.00';
    const num = parseFloat(balance);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  // Fetch mUSDC balances
  const fetchMUSDCBalances = async () => {
    try {
      // Fetch Ethereum mUSDC balance
      if (walletState.ethereum.connected && (window as any).ethereum) {
        const provider = new (await import('ethers')).ethers.BrowserProvider((window as any).ethereum);
        const mUSDCContract = new (await import('ethers')).ethers.Contract(
          '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const balance = await mUSDCContract.balanceOf(walletState.ethereum.address);
        const formattedBalance = (await import('ethers')).ethers.formatUnits(balance, 6);
        setEthMUSDCBalance(formatBalance(formattedBalance));
      }

      // Fetch Aptos mUSDC balance
      if (walletState.aptos.connected && (window as any).aptos) {
        const { Aptos, AptosConfig, Network } = await import('@aptos-labs/ts-sdk');
        const config = new AptosConfig({ network: Network.TESTNET });
        const client = new Aptos(config);
        
        try {
          const resource = await client.getAccountResource({
            accountAddress: walletState.aptos.address!,
            resourceType: '0x1::coin::CoinStore<0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::MockUSDC>'
          });
          const balance = (resource as any).coin.value;
          const formattedBalance = (parseInt(balance) / 1000000).toString();
          setAptosMUSDCBalance(formatBalance(formattedBalance));
        } catch (error) {
          // Account might not have mUSDC yet
          setAptosMUSDCBalance('0.00');
        }
      }
    } catch (error) {
      console.log('Error fetching mUSDC balances:', error);
    }
  };

  // Fetch balances when wallets connect
  useEffect(() => {
    if (walletState.ethereum.connected || walletState.aptos.connected) {
      fetchMUSDCBalances();
    }
  }, [walletState.ethereum.connected, walletState.aptos.connected, walletState.ethereum.address, walletState.aptos.address]);

  // Token configurations based on selected chain
  const getTokenConfig = () => {
    if (selectedChain === 'ethereum') {
      return {
        fromToken: {
          name: 'mUSDC',
          chain: 'ethereum' as const,
          symbol: 'mUSDC ETH',
          decimals: 6,
          address: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
          balance: ethMUSDCBalance
        },
        toToken: {
          name: 'mUSDC',
          chain: 'aptos' as const,
          symbol: 'mUSDC APT',
          decimals: 6,
          address: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::MockUSDC',
          balance: aptosMUSDCBalance
        }
      };
    } else {
      return {
        fromToken: {
          name: 'mUSDC',
          chain: 'aptos' as const,
          symbol: 'mUSDC APT',
          decimals: 6,
          address: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::MockUSDC',
          balance: aptosMUSDCBalance
        },
        toToken: {
          name: 'mUSDC',
          chain: 'ethereum' as const,
          symbol: 'mUSDC ETH',
          decimals: 6,
          address: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
          balance: ethMUSDCBalance
        }
      };
    }
  };

  const { fromToken, toToken } = getTokenConfig();

  // Check if bridge is valid
  const isValidBridge = () => {
    // Must have valid amount
    if (!fromAmount || parseFloat(fromAmount) <= 0) return false;
    
    // Must have both wallets connected
    return walletState.ethereum.connected && walletState.aptos.connected;
  };

  // Update quote when amount changes (1:1 for mUSDC bridge)
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
      return;
    }
    // Always 1:1 for mUSDC bridge
    setToAmount(fromAmount);
  }, [fromAmount]);

  // Handle bridge transfer
  const handleBridge = async () => {
    if (!isValidBridge()) {
      showWarning('Invalid Bridge Parameters', 'Please check your wallet connections and bridge amount');
      return;
    }

    setBridgeStatus('Preparing bridge transfer...');
    setIsBridging(true);
    setBridgeResult(null);
    showInfo('Initializing Bridge', 'Preparing cross-chain transfer...');

    try {
      // Get providers
      const ethereumProvider = (window as any).ethereum ? 
        new (await import('ethers')).ethers.BrowserProvider((window as any).ethereum) : null;
      
      const aptosProvider = (window as any).aptos;

      if (!ethereumProvider && fromToken.chain === 'ethereum') {
        throw new Error('MetaMask not found');
      }
      
      if (!aptosProvider && fromToken.chain === 'aptos') {
        throw new Error('Petra wallet not found');
      }

      const bridgeParams: BridgeParams = {
        fromToken: fromToken.name,
        toToken: toToken.name,
        fromAmount,
        fromChain: fromToken.chain,
        toChain: toToken.chain,
        walletState,
      };

      setBridgeStatus('Executing bridge transfer...');
      showInfo('Executing Transfer', 'Please confirm the transaction in your wallet');
      
      const result = await initiateBridgeTransfer(
        bridgeParams,
        ethereumProvider,
        aptosProvider
      );

      setBridgeResult(result);
      
      if (result.status === 'pending' && result.sourceChainTx) {
        const shortTxHash = result.sourceChainTx.slice(0, 10) + '...';
        setBridgeStatus(`Bridge transfer initiated! Transaction: ${shortTxHash}`);
        showSuccess('Bridge Initiated', `Transaction submitted: ${shortTxHash}`);
        
        // Start real-time monitoring
        await bridgeMonitor.startMonitoring(
          result.requestId,
          fromToken.chain,
          result.sourceChainTx,
          (monitorUpdate) => {
            setMonitorResult(monitorUpdate);
            setBridgeStatus(monitorUpdate.currentStep);
            
            // Show toast updates for key milestones
            if (monitorUpdate.sourceChainConfirmed && !monitorUpdate.destinationChainConfirmed) {
              showInfo('Processing', 'Source transaction confirmed, processing cross-chain transfer...');
            }
            
            // Refresh balances when bridge completes
            if (monitorUpdate.destinationChainConfirmed) {
              showSuccess('Bridge Complete', 'Cross-chain transfer completed successfully!');
              setTimeout(() => {
                fetchMUSDCBalances();
              }, 2000);
            }
          }
        );
        
      } else if (result.status === 'failed') {
        const errorMsg = result.errorMessage || 'Unknown error occurred';
        setBridgeStatus(`❌ Bridge failed: ${errorMsg}`);
        showError('Bridge Failed', errorMsg);
      }

    } catch (error) {
      console.error('Bridge failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setBridgeStatus(`❌ Bridge failed: ${errorMessage}`);
      showError('Bridge Failed', errorMessage);
    } finally {
      setIsBridging(false);
    }
  };

  // Swap chains
  const handleSwapChains = () => {
    setSelectedChain(selectedChain === 'ethereum' ? 'aptos' : 'ethereum');
    setFromAmount('');
    setToAmount('');
  };

  return (
    <div className="bridge-container">
      {/* Main Swap Card */}
      <div className="bridge-card">
        {/* Header */}
        <div className="bridge-header">
          <h2 className="bridge-title">SWAP</h2>
          <button className="settings-button">
            <svg className="settings-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Chain Selector */}
        <div className="chain-selector">
          <button
            onClick={() => setSelectedChain('ethereum')}
            className={`chain-button ${selectedChain === 'ethereum' ? 'active' : 'inactive'}`}
          >
            Ethereum
          </button>
          <button
            onClick={() => setSelectedChain('aptos')}
            className={`chain-button ${selectedChain === 'aptos' ? 'active' : 'inactive'}`}
          >
            Aptos
          </button>
        </div>

        {/* You Pay Section */}
        <div className="input-section">
          <div className="input-label-row">
            <span className="input-label">You Pay</span>
            <span className="balance-text">Balance: {fromToken.balance}</span>
          </div>
          
          <div className="input-container">
            <div className="input-row">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="amount-input"
              />
              <div className="token-info">
                <div className="token-icon blue">₿</div>
                <div className="token-details">
                  <div className="token-name-container">
                    <div className="token-name">mUSDC</div>
                    <div className="token-chain">{selectedChain === 'ethereum' ? 'ETH' : 'APT'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="swap-button-container">
          <button onClick={handleSwapChains} className="swap-button">
            <svg className="swap-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* You Receive Section */}
        <div className="input-section">
          <div className="input-label-row">
            <span className="input-label">You Receive</span>
            <span className="balance-text">Balance: {toToken.balance}</span>
          </div>
          
          <div className="input-container">
            <div className="input-row">
              <div className="amount-input" style={{ cursor: 'default' }}>
                {toAmount || '0.0'}
              </div>
              <div className="token-info">
                <div className="token-icon blue-light">💎</div>
                <div className="token-details">
                  <div className="token-name-container">
                    <div className="token-name">mUSDC</div>
                    <div className="token-chain">{selectedChain === 'ethereum' ? 'APT' : 'ETH'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet / Bridge Button */}
        {!walletState.ethereum.connected || !walletState.aptos.connected ? (
          <button className="bridge-button connect">
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleBridge}
            disabled={!isValidBridge() || isBridging}
            className={`bridge-button ${
              isValidBridge() && !isBridging ? 'active' : 'disabled'
            }`}
          >
            {isBridging ? 'Bridging...' : 'Bridge Tokens'}
          </button>
        )}
      </div>

      {/* Bridge Status */}
      {bridgeStatus && (
        <div className="status-card">
          <p className="status-text">{bridgeStatus}</p>
        </div>
      )}

      {/* Bridge Progress Monitoring */}
      {monitorResult && (
        <div className="progress-card">
          <h3 className="progress-title">Bridge Progress</h3>
          
          {/* Progress Steps */}
          <div className="progress-steps">
            <div className="progress-step">
              <div className={`step-indicator ${
                monitorResult.sourceChainConfirmed ? 'completed' : 
                monitorResult.status === 'pending' ? 'pending' : 'waiting'
              }`}>
                {monitorResult.sourceChainConfirmed ? '✓' : '1'}
              </div>
              <div className="step-content">
                <div className="step-title">Source Chain Lock</div>
                <div className="step-description">
                  {monitorResult.sourceChainConfirmed ? 'Tokens locked successfully' : 'Confirming transaction...'}
                </div>
              </div>
            </div>

            <div className="progress-step">
              <div className={`step-indicator ${
                monitorResult.destinationChainConfirmed ? 'completed' : 
                monitorResult.status === 'processing' ? 'pending' : 'waiting'
              }`}>
                {monitorResult.destinationChainConfirmed ? '✓' : '2'}
              </div>
              <div className="step-content">
                <div className="step-title">Relayer Processing</div>
                <div className="step-description">
                  {monitorResult.destinationChainConfirmed ? 'Tokens released successfully' : 
                   monitorResult.status === 'processing' ? 'Processing cross-chain transfer...' : 'Waiting for lock confirmation'}
                </div>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="current-status">
            <div className="current-status-text">{monitorResult.currentStep}</div>
            {monitorResult.estimatedCompletionTime > 0 && (
              <div className="time-remaining">
                Estimated time remaining: {monitorResult.estimatedCompletionTime}s
              </div>
            )}
          </div>

          {/* Transaction Links */}
          {monitorResult.transactionHashes.source && (
            <div className="transaction-link">
              <a 
                href={`https://sepolia.etherscan.io/tx/${monitorResult.transactionHashes.source}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                View source transaction ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Wallet Connection Status */}
      {!hideWalletStatus && (
        <div className="wallet-status-card">
          <h3 className="wallet-status-title">Wallet Status</h3>
          <div className="wallet-status-list">
            <div className="wallet-status-item">
              <span className="wallet-name">🦊 Ethereum (MetaMask):</span>
              <span className={`wallet-status ${walletState.ethereum.connected ? 'connected' : 'disconnected'}`}>
                {walletState.ethereum.connected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            <div className="wallet-status-item">
              <span className="wallet-name">🟣 Aptos (Petra):</span>
              <span className={`wallet-status ${walletState.aptos.connected ? 'connected' : 'disconnected'}`}>
                {walletState.aptos.connected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};