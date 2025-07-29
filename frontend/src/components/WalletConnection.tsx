import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { cn } from '../utils/cn';

export const WalletConnection: React.FC = () => {
  const { walletState, connectEthereum, connectAptos, disconnectEthereum, disconnectAptos } = useWallet();
  const [isConnecting, setIsConnecting] = useState<'ethereum' | 'aptos' | null>(null);

  const handleConnectEthereum = async () => {
    try {
      setIsConnecting('ethereum');
      await connectEthereum();
    } catch (error) {
      console.error('Failed to connect Ethereum wallet:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleConnectAptos = async () => {
    try {
      setIsConnecting('aptos');
      await connectAptos();
    } catch (error) {
      console.error('Failed to connect Aptos wallet:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Ethereum Wallet */}
      <div className="flex flex-col items-end">
        {walletState.ethereum.connected ? (
          <div className="cyber-card p-3 min-w-[160px]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Ethereum</span>
              </div>
              <button
                onClick={disconnectEthereum}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm font-mono text-primary-400">
              {formatAddress(walletState.ethereum.address!)}
            </p>
            <p className="text-xs text-gray-400">
              {parseFloat(walletState.ethereum.balance!).toFixed(4)} ETH
            </p>
          </div>
        ) : (
          <button
            onClick={handleConnectEthereum}
            disabled={isConnecting === 'ethereum'}
            className={cn(
              'cyber-button text-sm px-4 py-2',
              isConnecting === 'ethereum' && 'opacity-50 cursor-not-allowed'
            )}
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
          <div className="cyber-card p-3 min-w-[160px]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Aptos</span>
              </div>
              <button
                onClick={disconnectAptos}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm font-mono text-accent-green">
              {formatAddress(walletState.aptos.address!)}
            </p>
            <p className="text-xs text-gray-400">
              {parseFloat(walletState.aptos.balance!).toFixed(4)} APT
            </p>
          </div>
        ) : (
          <button
            onClick={handleConnectAptos}
            disabled={isConnecting === 'aptos'}
            className={cn(
              'cyber-button text-sm px-4 py-2',
              isConnecting === 'aptos' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isConnecting === 'aptos' ? (
              <span className="loading-dots">Connecting</span>
            ) : (
              'Connect Petra'
            )}
          </button>
        )}
      </div>
    </div>
  );
};