import React, { useState, useEffect } from 'react';
import { initiateBridgeTransfer, type BridgeParams, type BridgeResult } from '../services/bridgeService';
import { bridgeMonitor, type BridgeMonitorResult } from '../services/bridgeMonitor';

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
}

export const BridgeInterface: React.FC<BridgeInterfaceProps> = ({ walletState }) => {
  const [fromToken, setFromToken] = useState('mUSDC-ETH');
  const [toToken, setToToken] = useState('mUSDC-APT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [monitorResult, setMonitorResult] = useState<BridgeMonitorResult | null>(null);

  // Token options - mUSDC cross-chain bridge
  const tokens = {
    'mUSDC-ETH': { 
      name: 'Mock USDC (Ethereum)', 
      chain: 'ethereum', 
      decimals: 6,
      address: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
      symbol: 'mUSDC',
      displayName: 'mUSDC'
    },
    'mUSDC-APT': { 
      name: 'Mock USDC (Aptos)', 
      chain: 'aptos', 
      decimals: 6,
      address: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::MockUSDC',
      symbol: 'mUSDC',
      displayName: 'mUSDC'
    },
  };

  // Check if bridge is valid
  const isValidBridge = () => {
    const fromTokenData = tokens[fromToken as keyof typeof tokens];
    const toTokenData = tokens[toToken as keyof typeof tokens];
    
    // Must be cross-chain bridge
    if (fromTokenData.chain === toTokenData.chain) return false;
    
    // Must be same token (mUSDC ↔ mUSDC)
    if (fromTokenData.symbol !== toTokenData.symbol) return false;
    
    // Must have valid amount
    if (!fromAmount || parseFloat(fromAmount) <= 0) return false;
    
    // Must have source wallet connected
    const sourceWalletConnected = 
      (fromTokenData.chain === 'ethereum' && walletState.ethereum.connected) ||
      (fromTokenData.chain === 'aptos' && walletState.aptos.connected);
    
    // Must have destination wallet connected
    const destWalletConnected = 
      (toTokenData.chain === 'ethereum' && walletState.ethereum.connected) ||
      (toTokenData.chain === 'aptos' && walletState.aptos.connected);
    
    return sourceWalletConnected && destWalletConnected;
  };

  // Update quote when amount changes (1:1 for mUSDC bridge)
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
      return;
    }

    const fromTokenData = tokens[fromToken as keyof typeof tokens];
    const toTokenData = tokens[toToken as keyof typeof tokens];

    // Must be cross-chain and same token
    if (fromTokenData.chain === toTokenData.chain || fromTokenData.symbol !== toTokenData.symbol) {
      setToAmount('');
      return;
    }

    // Always 1:1 for mUSDC bridge
    setToAmount(fromAmount);
  }, [fromAmount, fromToken, toToken, tokens]);

  // Handle bridge transfer
  const handleBridge = async () => {
    if (!isValidBridge()) {
      alert('Please check your wallet connections and bridge parameters');
      return;
    }

    const fromTokenData = tokens[fromToken as keyof typeof tokens];
    const toTokenData = tokens[toToken as keyof typeof tokens];

    setBridgeStatus('Preparing bridge transfer...');
    setIsBridging(true);
    setBridgeResult(null);

    try {
      // Get providers
      const ethereumProvider = (window as any).ethereum ? 
        new (await import('ethers')).ethers.BrowserProvider((window as any).ethereum) : null;
      
      const aptosProvider = (window as any).aptos;

      if (!ethereumProvider && fromTokenData.chain === 'ethereum') {
        throw new Error('MetaMask not found');
      }
      
      if (!aptosProvider && fromTokenData.chain === 'aptos') {
        throw new Error('Petra wallet not found');
      }

      const bridgeParams: BridgeParams = {
        fromToken: fromTokenData.symbol,
        toToken: toTokenData.symbol,
        fromAmount,
        fromChain: fromTokenData.chain as 'ethereum' | 'aptos',
        toChain: toTokenData.chain as 'ethereum' | 'aptos',
        walletState,
      };

      setBridgeStatus('Executing bridge transfer...');
      
      const result = await initiateBridgeTransfer(
        bridgeParams,
        ethereumProvider,
        aptosProvider
      );

      setBridgeResult(result);
      
      if (result.status === 'pending' && result.sourceChainTx) {
        setBridgeStatus(`Bridge transfer initiated! Transaction: ${result.sourceChainTx?.slice(0, 10)}...`);
        
        // Start real-time monitoring
        await bridgeMonitor.startMonitoring(
          result.requestId,
          fromTokenData.chain as 'ethereum' | 'aptos',
          result.sourceChainTx,
          (monitorUpdate) => {
            setMonitorResult(monitorUpdate);
            setBridgeStatus(monitorUpdate.currentStep);
          }
        );
        
      } else if (result.status === 'failed') {
        setBridgeStatus(`❌ Bridge failed: ${result.errorMessage}`);
      }

    } catch (error) {
      console.error('Bridge failed:', error);
      setBridgeStatus(`❌ Bridge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBridging(false);
    }
  };

  // Swap token positions
  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const fromTokenData = tokens[fromToken as keyof typeof tokens];
  const toTokenData = tokens[toToken as keyof typeof tokens];
  const isSameToken = fromTokenData.symbol === toTokenData.symbol;
  const isCrossChain = fromTokenData.chain !== toTokenData.chain;

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Cross-Chain Bridge</h2>
        <p className="text-sm text-gray-600 mt-1">Single-transaction mUSDC bridge</p>
        {isSameToken && isCrossChain && (
          <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            🎯 1:1 DIRECT BRIDGE
          </div>
        )}
      </div>

      {/* From Token */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none outline-none"
            >
              {Object.entries(tokens).map(([key, token]) => (
                <option key={key} value={key}>{token.displayName} ({token.chain})</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {fromTokenData.chain === 'ethereum' ? '🦊' : '🟣'} {fromTokenData.chain}
            </span>
          </div>
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.00"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            Balance: {fromTokenData.chain === 'ethereum' ? walletState.ethereum.balance : walletState.aptos.balance || '0.00'}
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwapTokens}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none outline-none"
            >
              {Object.entries(tokens).map(([key, token]) => (
                <option key={key} value={key}>{token.displayName} ({token.chain})</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {toTokenData.chain === 'ethereum' ? '🦊' : '🟣'} {toTokenData.chain}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {toAmount || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isSameToken && isCrossChain ? '1:1 Direct Bridge' : 'Invalid bridge pair'}
          </div>
        </div>
      </div>

      {/* Bridge Details */}
      {isValidBridge() && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Bridge Details</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-700">Bridge Fee:</span>
              <span className="text-blue-900">0.1%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Processing Time:</span>
              <span className="text-blue-900">~1 minute</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Type:</span>
              <span className="text-blue-900">Single Transaction</span>
            </div>
          </div>
        </div>
      )}

      {/* Bridge Button */}
      <button
        onClick={handleBridge}
        disabled={!isValidBridge() || isBridging}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
          isValidBridge() && !isBridging
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isBridging ? 'Bridging...' : 'Bridge Tokens'}
      </button>

      {/* Bridge Status */}
      {bridgeStatus && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm font-medium text-gray-700">{bridgeStatus}</p>
        </div>
      )}

      {/* Bridge Progress Monitoring */}
      {monitorResult && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">Bridge Progress</h3>
          
          {/* Progress Steps */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                monitorResult.sourceChainConfirmed ? 'bg-green-500 text-white' : 
                monitorResult.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {monitorResult.sourceChainConfirmed ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Source Chain Lock</div>
                <div className="text-xs text-gray-600">
                  {monitorResult.sourceChainConfirmed ? 'Tokens locked successfully' : 'Confirming transaction...'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                monitorResult.destinationChainConfirmed ? 'bg-green-500 text-white' : 
                monitorResult.status === 'processing' ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {monitorResult.destinationChainConfirmed ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Relayer Processing</div>
                <div className="text-xs text-gray-600">
                  {monitorResult.destinationChainConfirmed ? 'Tokens released successfully' : 
                   monitorResult.status === 'processing' ? 'Processing cross-chain transfer...' : 'Waiting for lock confirmation'}
                </div>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-500">
            <div className="text-sm font-medium text-blue-900">{monitorResult.currentStep}</div>
            {monitorResult.estimatedCompletionTime > 0 && (
              <div className="text-xs text-blue-700 mt-1">
                Estimated time remaining: {monitorResult.estimatedCompletionTime}s
              </div>
            )}
          </div>

          {/* Transaction Links */}
          {monitorResult.transactionHashes.source && (
            <div className="mt-3 text-xs">
              <a 
                href={`https://sepolia.etherscan.io/tx/${monitorResult.transactionHashes.source}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                View source transaction ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Bridge Result (Fallback) */}
      {bridgeResult && !monitorResult && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Bridge Result</h3>
          <div className="text-sm space-y-1">
            <div><strong>Status:</strong> {bridgeResult.status}</div>
            <div><strong>Amount:</strong> {bridgeResult.amount} mUSDC</div>
            {bridgeResult.sourceChainTx && (
              <div><strong>Transaction:</strong> <code className="text-xs">{bridgeResult.sourceChainTx}</code></div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Connection Status */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Wallet Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>🦊 Ethereum (MetaMask):</span>
            <span className={walletState.ethereum.connected ? 'text-green-600' : 'text-red-600'}>
              {walletState.ethereum.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>🟣 Aptos (Petra):</span>
            <span className={walletState.aptos.connected ? 'text-green-600' : 'text-red-600'}>
              {walletState.aptos.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};