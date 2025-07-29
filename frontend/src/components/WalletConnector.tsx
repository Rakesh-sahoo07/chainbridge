import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';

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
  const [isConnecting, setIsConnecting] = useState<'ethereum' | 'aptos' | null>(null);

  // Check if wallets are installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  const isPetraInstalled = typeof window !== 'undefined' && typeof (window as any).aptos !== 'undefined';

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Debug function to check Petra network info
  const debugPetraNetwork = async () => {
    if (!(window as any).aptos) {
      console.log('Petra wallet not found');
      return;
    }

    console.log('=== Petra Network Debug ===');
    
    // Check all available methods and properties
    console.log('Available Petra methods:', Object.keys((window as any).aptos));
    
    // Try getChainId
    if ((window as any).aptos.getChainId) {
      try {
        const chainId = await (window as any).aptos.getChainId();
        console.log('getChainId():', chainId);
      } catch (e) {
        console.log('getChainId() error:', e);
      }
    }
    
    // Try network
    if ((window as any).aptos.network) {
      try {
        const network1 = await (window as any).aptos.network();
        console.log('network() as function:', network1);
      } catch (e) {
        console.log('network() as function error:', e);
        try {
          const network2 = (window as any).aptos.network;
          console.log('network as property:', network2);
        } catch (e2) {
          console.log('network as property error:', e2);
        }
      }
    }
    
    // Try getAccount
    if ((window as any).aptos.getAccount) {
      try {
        const account = await (window as any).aptos.getAccount();
        console.log('getAccount():', account);
      } catch (e) {
        console.log('getAccount() error:', e);
      }
    }
    
    console.log('=== End Debug ===');
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
      alert('MetaMask is not installed. Please install MetaMask extension first.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setIsConnecting('ethereum');
      
      // Check current network
      const chainId = await window.ethereum?.request({ method: 'eth_chainId' });
      
      // If not on Sepolia, prompt to switch
      if (chainId !== SEPOLIA_CHAIN_ID) {
        const switched = await switchToSepolia();
        if (!switched) {
          alert('Please switch to Sepolia testnet to use ChainBridge Protocol.');
          setIsConnecting(null);
          return;
        }
      }
      
      // Use context connect method
      await connectEthereum();
    } catch (error: any) {
      console.error('Failed to connect MetaMask:', error);
      if (error.code === 4001) {
        alert('Please connect to MetaMask.');
      } else {
        alert('An error occurred while connecting to MetaMask.');
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
            alert('Please switch Petra Wallet to Testnet for ChainBridge Protocol.\n\nGo to Petra Settings → Network → Select Testnet');
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
          alert('Please switch Petra Wallet to Testnet for ChainBridge Protocol.\n\nGo to Petra Settings → Network → Select Testnet');
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
      alert('Petra Wallet is not installed. Please install Petra Wallet extension first.');
      window.open('https://petra.app/', '_blank');
      return;
    }

    try {
      setIsConnecting('aptos');
      
      // Check/switch to testnet
      const isTestnet = await switchPetraToTestnet();
      if (!isTestnet) {
        setIsConnecting(null);
        return;
      }
      
      // Use context connect method
      await connectAptos();
    } catch (error: any) {
      console.error('Failed to connect Petra:', error);
      if (error.code === 4001) {
        alert('Please connect to Petra Wallet.');
      } else {
        alert('An error occurred while connecting to Petra Wallet.');
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
    <div className="flex space-x-4">
      {/* Ethereum Wallet */}
      <div className="flex flex-col items-end">
        {walletState.ethereum.connected ? (
          <div className="cyber-card p-3 min-w-140">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Ethereum</span>
              </div>
              <button
                onClick={disconnectEthereum}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm font-mono text-green-400">
              {formatAddress(walletState.ethereum.address!)}
            </p>
            <p className="text-xs text-gray-400">
              {walletState.ethereum.balance} ETH
            </p>
          </div>
        ) : (
          <button
            onClick={connectMetaMask}
            disabled={isConnecting === 'ethereum'}
            className={`cyber-button ${
              isConnecting === 'ethereum' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isConnecting === 'ethereum' ? (
              <span className="loading-dots">Connecting</span>
            ) : (
              'Connect MetaMask'
            )}
          </button>
        )}
      </div>

      {/* Aptos Wallet */}
      <div className="flex flex-col items-end">
        {walletState.aptos.connected ? (
          <div className="cyber-card p-3 min-w-140">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Aptos</span>
              </div>
              <button
                onClick={disconnectAptos}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm font-mono text-green-400">
              {formatAddress(walletState.aptos.address!)}
            </p>
            <p className="text-xs text-gray-400">
              {walletState.aptos.balance} APT
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <button
              onClick={connectPetra}
              disabled={isConnecting === 'aptos'}
              className={`cyber-button ${
                isConnecting === 'aptos' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isConnecting === 'aptos' ? (
                <span className="loading-dots">Connecting</span>
              ) : (
                'Connect Petra'
              )}
            </button>
            {isPetraInstalled && (
              <button
                onClick={debugPetraNetwork}
                className="text-xs text-gray-400 hover:text-green-400 transition-colors"
                style={{ fontSize: '10px', padding: '2px 4px' }}
              >
                Debug Network
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};