import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../contexts/ToastContext';

// Network configurations
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Test Network',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

export const WalletConnector: React.FC = () => {
  const { walletState, connectEthereum, connectAptos, disconnectEthereum, disconnectAptos } = useWallet();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [isConnecting, setIsConnecting] = useState<'ethereum' | 'aptos' | null>(null);

  // Check if wallets are installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  const isPetraInstalled = typeof window !== 'undefined' && typeof (window as any).aptos !== 'undefined';

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };


  // Switch to Sepolia network
  const switchToSepolia = async () => {
    if (!window.ethereum) return false;
    
    try {
      // Try to switch to Sepolia
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_CONFIG],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          return false;
        }
      } else {
        console.error('Failed to switch to Sepolia:', switchError);
        return false;
      }
    }
  };

  // Connect to MetaMask
  const connectMetaMask = async () => {
    if (!isMetaMaskInstalled || !window.ethereum) {
      showError('MetaMask Not Found', 'Please install MetaMask extension first.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setIsConnecting('ethereum');
      showInfo('Connecting...', 'Please approve the connection in MetaMask');
      
      // Check current network
      const chainId = await window.ethereum?.request({ method: 'eth_chainId' });
      
      // If not on Sepolia, prompt to switch
      if (chainId !== SEPOLIA_CHAIN_ID) {
        showWarning('Network Switch Required', 'Switching to Sepolia testnet...');
        const switched = await switchToSepolia();
        if (!switched) {
          showError('Network Switch Failed', 'Please manually switch to Sepolia testnet in MetaMask.');
          setIsConnecting(null);
          return;
        }
      }
      
      // Use context connect method
      await connectEthereum();
      showSuccess('MetaMask Connected', 'Successfully connected to Ethereum wallet');
    } catch (error: any) {
      console.error('Failed to connect MetaMask:', error);
      if (error.code === 4001) {
        showWarning('Connection Cancelled', 'Please approve the connection in MetaMask to continue.');
      } else {
        showError('Connection Failed', 'An error occurred while connecting to MetaMask.');
      }
    } finally {
      setIsConnecting(null);
    }
  };

  // Switch Petra to testnet
  const switchPetraToTestnet = async () => {
    try {
      // Try to get network info using different Petra API methods
      let networkInfo = null;
      
      // Method 1: Try getChainId (most reliable)
      if ((window as any).aptos?.getChainId) {
        try {
          const chainId = await (window as any).aptos.getChainId();
          console.log('Petra chainId:', chainId);
          
          // Aptos testnet chainId is typically 2
          if (chainId && chainId.chainId === 2) {
            return true; // Testnet confirmed
          } else if (chainId && chainId.chainId !== 2) {
            showWarning('Wrong Network', 'Please switch Petra Wallet to Testnet. Go to Petra Settings → Network → Select Testnet');
            return false;
          }
        } catch (e) {
          console.warn('Could not get chainId:', e);
        }
      }
      
      // Method 2: Try network property/function
      if ((window as any).aptos?.network) {
        try {
          networkInfo = await (window as any).aptos.network();
        } catch (e) {
          try {
            networkInfo = (window as any).aptos.network;
          } catch (e2) {
            console.warn('Could not get network info:', e2);
          }
        }
      }
      
      console.log('Petra network info:', networkInfo);
      
      // Method 3: Check network name if available
      if (networkInfo) {
        const networkName = networkInfo.name || networkInfo.chainId || networkInfo;
        const networkStr = String(networkName).toLowerCase();
        
        // Accept testnet variations (testnet, test, devnet might also work)
        if (networkStr.includes('testnet') || networkStr.includes('test') || networkStr.includes('devnet')) {
          return true;
        } else if (networkStr.includes('mainnet') || networkStr.includes('main')) {
          showWarning('Wrong Network', 'Please switch Petra Wallet to Testnet. Go to Petra Settings → Network → Select Testnet');
          return false;
        }
      }
      
      // If we can't determine network reliably, proceed with warning
      console.warn('Could not verify Aptos network, proceeding anyway');
      return true;
    } catch (error) {
      console.warn('Error checking Aptos network:', error);
      return true; // Proceed if we can't check
    }
  };

  // Connect to Petra Wallet
  const connectPetra = async () => {
    if (!isPetraInstalled || !(window as any).aptos) {
      showError('Petra Wallet Not Found', 'Please install Petra Wallet extension first.');
      window.open('https://petra.app/', '_blank');
      return;
    }

    try {
      setIsConnecting('aptos');
      showInfo('Connecting...', 'Please approve the connection in Petra Wallet');
      
      // Check/switch to testnet
      const isTestnet = await switchPetraToTestnet();
      if (!isTestnet) {
        setIsConnecting(null);
        return;
      }
      
      // Use context connect method
      await connectAptos();
      showSuccess('Petra Wallet Connected', 'Successfully connected to Aptos wallet');
    } catch (error: any) {
      console.error('Failed to connect Petra:', error);
      if (error.code === 4001) {
        showWarning('Connection Cancelled', 'Please approve the connection in Petra Wallet to continue.');
      } else {
        showError('Connection Failed', 'An error occurred while connecting to Petra Wallet.');
      }
    } finally {
      setIsConnecting(null);
    }
  };

  // Disconnect functions use context methods directly

  // Check for existing connections on load
  useEffect(() => {
    const checkExistingConnections = async () => {
      // Check MetaMask
      if (isMetaMaskInstalled && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            connectMetaMask();
          }
        } catch (error) {
          console.error('Error checking MetaMask connection:', error);
        }
      }

      // Check Petra
      if (isPetraInstalled && (window as any).aptos) {
        try {
          const isConnected = await (window as any).aptos.isConnected();
          if (isConnected) {
            connectPetra();
          }
        } catch (error) {
          console.error('Error checking Petra connection:', error);
        }
      }
    };

    checkExistingConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetaMaskInstalled, isPetraInstalled]);

  return (
    <div className="flex space-x-3">
      {/* Ethereum Wallet */}
      <div className="flex flex-col items-end">
        {walletState.ethereum.connected ? (
          <div className="modern-wallet-card">
            <div className="wallet-header">
              <div className="wallet-status">
                <div className="status-dot ethereum"></div>
                <span className="wallet-chain-label">Ethereum</span>
              </div>
              <button
                onClick={disconnectEthereum}
                className="disconnect-btn"
                title="Disconnect"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="wallet-address">
              {formatAddress(walletState.ethereum.address!)}
            </div>
            <div className="wallet-balance">
              {walletState.ethereum.balance} ETH
            </div>
          </div>
        ) : (
          <button
            onClick={connectMetaMask}
            disabled={isConnecting === 'ethereum'}
            className={`modern-connect-btn ethereum ${
              isConnecting === 'ethereum' ? 'connecting' : ''
            }`}
          >
            <div className="btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.6"/>
                <path d="m2 17 10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <span>
              {isConnecting === 'ethereum' ? 'Connecting...' : 'Connect Ethereum'}
            </span>
          </button>
        )}
      </div>

      {/* Aptos Wallet */}
      <div className="flex flex-col items-end">
        {walletState.aptos.connected ? (
          <div className="modern-wallet-card">
            <div className="wallet-header">
              <div className="wallet-status">
                <div className="status-dot aptos"></div>
                <span className="wallet-chain-label">Aptos</span>
              </div>
              <button
                onClick={disconnectAptos}
                className="disconnect-btn"
                title="Disconnect"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="wallet-address">
              {formatAddress(walletState.aptos.address!)}
            </div>
            <div className="wallet-balance">
              {walletState.aptos.balance} APT
            </div>
          </div>
        ) : (
          <button
            onClick={connectPetra}
            disabled={isConnecting === 'aptos'}
            className={`modern-connect-btn aptos ${
              isConnecting === 'aptos' ? 'connecting' : ''
            }`}
          >
            <div className="btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>
            <span>
              {isConnecting === 'aptos' ? 'Connecting...' : 'Connect Aptos'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};