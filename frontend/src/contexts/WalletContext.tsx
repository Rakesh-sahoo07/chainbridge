import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { WalletState } from '../types';

interface WalletContextType {
  walletState: WalletState;
  connectEthereum: () => Promise<void>;
  connectAptos: () => Promise<void>;
  disconnectEthereum: () => void;
  disconnectAptos: () => void;
  ethProvider: ethers.BrowserProvider | null;
  aptosClient: Aptos | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    ethereum: { connected: false },
    aptos: { connected: false },
  });

  const [ethProvider, setEthProvider] = useState<ethers.BrowserProvider | null>(null);
  const [aptosClient, setAptosClient] = useState<Aptos | null>(null);

  // Initialize Aptos client
  useEffect(() => {
    const config = new AptosConfig({ network: Network.TESTNET });
    const client = new Aptos(config);
    setAptosClient(client);
  }, []);

  const connectEthereum = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const balance = await provider.getBalance(address);
          
          setEthProvider(provider);
          setWalletState(prev => ({
            ...prev,
            ethereum: {
              connected: true,
              address,
              balance: ethers.formatEther(balance),
            },
          }));

          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
              disconnectEthereum();
            } else {
              connectEthereum();
            }
          });
        }
      } else {
        throw new Error('MetaMask not installed');
      }
    } catch (error) {
      console.error('Failed to connect to Ethereum:', error);
      throw error;
    }
  };

  const connectAptos = async () => {
    try {
      if (typeof window.aptos !== 'undefined') {
        const response = await window.aptos.connect();
        
        if (response && aptosClient) {
          const address = response.address;
          const balance = await aptosClient.getAccountAPTAmount({
            accountAddress: address
          });
          
          setWalletState(prev => ({
            ...prev,
            aptos: {
              connected: true,
              address,
              balance: (balance / 100000000).toString(),
            },
          }));

          // Listen for account changes
          window.aptos.onAccountChange((account: any) => {
            if (account) {
              connectAptos();
            } else {
              disconnectAptos();
            }
          });
        }
      } else {
        throw new Error('Petra Wallet not installed');
      }
    } catch (error) {
      console.error('Failed to connect to Aptos:', error);
      throw error;
    }
  };

  const disconnectEthereum = () => {
    setEthProvider(null);
    setWalletState(prev => ({
      ...prev,
      ethereum: { connected: false },
    }));
  };

  const disconnectAptos = () => {
    setWalletState(prev => ({
      ...prev,
      aptos: { connected: false },
    }));
  };

  const value: WalletContextType = {
    walletState,
    connectEthereum,
    connectAptos,
    disconnectEthereum,
    disconnectAptos,
    ethProvider,
    aptosClient,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};