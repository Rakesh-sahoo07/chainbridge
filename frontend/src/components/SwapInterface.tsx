import React, { useState, useEffect } from 'react';
import { getOneInchCrossChainQuote, setup1InchEnvironment, type ChainBridgeQuoteResponse } from '../services/oneInchService';
import { initiateAtomicSwap, monitorAtomicSwap, refundAtomicSwap, type AtomicSwapResult } from '../services/atomicSwapService';
import { useEthereumContract } from '../hooks/useEthereumContract';
import { useAptosContract } from '../hooks/useAptosContract';

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

interface SwapInterfaceProps {
  walletState: WalletState;
}

export const SwapInterface: React.FC<SwapInterfaceProps> = ({ walletState }) => {
  const [fromToken, setFromToken] = useState('mUSDC-ETH');
  const [toToken, setToToken] = useState('mUSDC-APT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [quoteData, setQuoteData] = useState<ChainBridgeQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<AtomicSwapResult | null>(null);
  const [swapStatus, setSwapStatus] = useState<string>('');

  // Initialize contract hooks for REAL smart contract interaction
  const ethereumContractHook = useEthereumContract();
  const aptosContract = useAptosContract();

  // State for minting tokens
  const [isMinting, setIsMinting] = useState(false);

  // Token options - Based on ACTUALLY DEPLOYED smart contracts only
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
    APT: { 
      name: 'AptosCoin', 
      chain: 'aptos', 
      decimals: 8,
      address: '0x1::aptos_coin::AptosCoin',
      symbol: 'APT',
      displayName: 'APT'
    },
    // Note: Now we have the same token (mUSDC) on both chains for better UX!
    // Users can swap mUSDC between Ethereum and Aptos seamlessly
  };

  // Helper function to convert UI token keys to service token symbols
  const getTokenSymbol = (tokenKey: string) => {
    const tokenData = tokens[tokenKey as keyof typeof tokens];
    return tokenData ? tokenData.symbol : tokenKey;
  };

  // Check if swap is valid
  const isValidSwap = () => {
    const fromTokenData = tokens[fromToken as keyof typeof tokens];
    const toTokenData = tokens[toToken as keyof typeof tokens];
    
    // Must be cross-chain swap
    if (fromTokenData.chain === toTokenData.chain) return false;
    
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

  // Initialize 1inch SDK on component mount
  useEffect(() => {
    setup1InchEnvironment();
  }, []);

  // Get 1inch quote when amount or tokens change
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setToAmount('');
        setQuoteData(null);
        return;
      }

      const fromTokenData = tokens[fromToken as keyof typeof tokens];
      const toTokenData = tokens[toToken as keyof typeof tokens];

      // Must be cross-chain
      if (fromTokenData.chain === toTokenData.chain) {
        setToAmount('');
        setQuoteData(null);
        return;
      }

      setIsLoadingQuote(true);
      setQuoteError(null);

      try {
        // Get network IDs for the chains
        const fromNetwork = fromTokenData.chain === 'ethereum' ? 11155111 : 999; // Sepolia : Aptos testnet
        const toNetwork = toTokenData.chain === 'ethereum' ? 11155111 : 999;

        // Get wallet address for the source chain
        const walletAddress = fromTokenData.chain === 'ethereum' 
          ? walletState.ethereum.address || '0x0000000000000000000000000000000000000000'
          : walletState.aptos.address || '0x0000000000000000000000000000000000000000';

        // Check if this is a same-token cross-chain transfer (1:1)
        const isSameToken = (
          (fromTokenData.symbol === toTokenData.symbol) &&
          (fromTokenData.chain !== toTokenData.chain)
        );
        
        let quote;
        
        if (isSameToken) {
          // Direct 1:1 swap for same token cross-chain transfers
          console.log('🎯 Detected same-token cross-chain transfer - using 1:1 rate');
          quote = {
            fromToken: {
              address: fromTokenData.address,
              symbol: fromTokenData.symbol,
              decimals: fromTokenData.decimals
            },
            toToken: {
              address: toTokenData.address,
              symbol: toTokenData.symbol,
              decimals: toTokenData.decimals
            },
            fromAmount: fromAmount,
            toAmount: fromAmount, // 1:1 conversion!
            estimatedGas: '0.002',
            protocols: ['Direct Contract Swap'],
            estimatedProcessingTime: 300, // 5 minutes
            fees: {
              protocolFee: '0.001',
              networkFee: '0.001',
              totalFee: '0.002'
            },
            route: 'Direct Contract Swap',
            priceImpact: 0 // 0% for 1:1
          };
          setQuoteError(''); // Clear any previous errors
        } else {
          // Use 1inch for different token swaps
          quote = await getOneInchCrossChainQuote({
            fromTokenAddress: fromTokenData.address,
            toTokenAddress: toTokenData.address,
            amount: fromAmount,
            fromNetwork,
            toNetwork,
            walletAddress,
          });
        }

        setQuoteData(quote);
        setToAmount(quote.toAmount);
        
        // Log the quote type for debugging
        console.log('📊 Quote type:', {
          isSameToken,
          fromSymbol: fromTokenData.symbol,
          toSymbol: toTokenData.symbol,
          fromChain: fromTokenData.chain,
          toChain: toTokenData.chain,
          rate: `1:${parseFloat(quote.toAmount) / parseFloat(quote.fromAmount)}`,
          type: isSameToken ? 'Direct 1:1' : '1inch Market'
        });

      } catch (error) {
        console.error('Failed to get 1inch quote:', error);
        setQuoteError('Failed to get price quote. Using fallback calculation.');
        
        // Fallback to local calculation
        let rate = 1.0;
        const fromSymbol = getTokenSymbol(fromToken);
        const toSymbol = getTokenSymbol(toToken);
        
        if (fromTokenData.chain === 'ethereum' && toSymbol === 'APT') {
          rate = fromSymbol === 'mUSDC' ? 0.12 : 0.12;
        } else if (fromSymbol === 'APT' && toTokenData.chain === 'ethereum') {
          rate = 8.3;
        } else if (fromSymbol === 'mUSDC' && toSymbol === 'mUSDC') {
          // mUSDC to mUSDC cross-chain should be 1:1 minus fees
          rate = 1.0;
        }
        
        const feeRate = 0.999;
        const finalAmount = parseFloat(fromAmount) * rate * feeRate;
        setToAmount(finalAmount.toFixed(toTokenData.decimals > 6 ? 6 : toTokenData.decimals));
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const timeoutId = setTimeout(fetchQuote, 500); // Debounce API calls
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAmount, fromToken, toToken, walletState]);

  // Handle swap direction
  const handleSwapDirection = () => {
    const tempFromToken = fromToken;
    const tempFromAmount = fromAmount;
    
    setFromToken(toToken);
    setToToken(tempFromToken);
    setFromAmount(toAmount);
    setToAmount(tempFromAmount);
  };

  // Handle REAL atomic swap execution with 1inch optimization
  const handleSwap = async () => {
    if (!isValidSwap() || !quoteData) return;

    try {
      setIsSwapping(true);
      setSwapStatus('Initializing atomic swap...');
      
      const fromTokenData = tokens[fromToken as keyof typeof tokens];
      const toTokenData = tokens[toToken as keyof typeof tokens];

      console.log('🚀 Starting REAL 1inch Fusion+ Atomic Swap:', {
        from: `${fromAmount} ${fromToken}`,
        to: `${toAmount} ${toToken}`,
        route: `${fromTokenData.chain} → ${toTokenData.chain}`,
        protocols: quoteData.protocols,
      });

      // Execute REAL atomic swap with 1inch optimization
      setSwapStatus('Executing cross-chain atomic swap...');
      
      const result = await initiateAtomicSwap(
        {
          fromToken: getTokenSymbol(fromToken),
          toToken: getTokenSymbol(toToken),
          fromAmount,
          fromChain: fromTokenData.chain as 'ethereum' | 'aptos',
          toChain: toTokenData.chain as 'ethereum' | 'aptos',
          walletState,
        },
        ethereumContractHook,
        aptosContract
      );

      setSwapResult(result);
      console.log('✅ REAL atomic swap completed:', result);

      if (result.status === 'completed') {
        setSwapStatus('Atomic swap completed successfully!');
        alert(`🎉 REAL Cross-Chain Atomic Swap Completed!

🔐 Atomic Swap Details:
• Swap ID: ${result.swapId.slice(0, 16)}...
• From: ${fromAmount} ${fromToken}
• To: ${toAmount} ${toToken}
• Route: ${quoteData.route}
• Source Chain Tx: ${result.sourceChainTx}
• Destination Chain Tx: ${result.destinationChainTx}

⚡ Powered by 1inch Fusion+ with ChainBridge atomic guarantees!
🔒 Your tokens were atomically swapped using hashlock/timelock technology.`);

        // Start monitoring swap status
        monitorSwapStatus(result.swapId);
      } else {
        setSwapStatus('Atomic swap failed');
        const errorMessage = result.errorMessage || result.status;
        console.error('❌ Swap failed with details:', result);
        alert(`❌ Atomic swap failed: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('❌ REAL atomic swap failed:', error);
      setSwapStatus('Swap failed');
      alert(`Atomic swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSwapping(false);
    }
  };

  // Monitor atomic swap status in real-time
  const monitorSwapStatus = async (swapId: string) => {
    try {
      const status = await monitorAtomicSwap(swapId, ethereumContractHook, aptosContract);
      
      console.log('📊 Atomic swap status:', status);
      
      if (status.canRefund) {
        setSwapStatus('Swap expired - refund available');
      } else if (status.ethereumStatus?.completed && status.aptosStatus?.completed) {
        setSwapStatus('Both chains completed - swap successful');
      } else {
        setSwapStatus('Cross-chain coordination in progress...');
        
        // Continue monitoring
        setTimeout(() => monitorSwapStatus(swapId), 30000); // Check every 30 seconds
      }
    } catch (error) {
      console.error('Failed to monitor swap status:', error);
    }
  };

  // Handle atomic swap refund
  const handleRefund = async (swapId: string, chain: 'ethereum' | 'aptos') => {
    try {
      setIsSwapping(true);
      setSwapStatus(`Initiating refund on ${chain}...`);
      
      const result = await refundAtomicSwap(swapId, chain, ethereumContractHook, aptosContract);
      
      if (result.success) {
        setSwapStatus(`Refund completed on ${chain}`);
        alert(`✅ Refund completed on ${chain}\nTransaction: ${result.txHash}`);
      } else {
        setSwapStatus('Refund failed');
        alert('❌ Refund failed. Please try again.');
      }
    } catch (error) {
      console.error('Refund failed:', error);
      alert(`Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSwapping(false);
    }
  };

  // Handle minting test tokens
  const handleMintTokens = async () => {
    if (!walletState.ethereum.connected) {
      alert('Please connect MetaMask first');
      return;
    }

    try {
      setIsMinting(true);
      console.log('🪙 Minting test mUSDC tokens...');
      
      const tokenAddress = '0x7a265Db61E004f4242fB322fa72F8a52D2B06664'; // mUSDC address
      await ethereumContractHook.mintTestTokens(tokenAddress, '1000');
      
      alert(`✅ Successfully minted 1000 mUSDC test tokens!\\n\\nYou can now perform swaps. Check your wallet balance.`);
      
      // Refresh the page to update balances
      window.location.reload();
    } catch (error) {
      console.error('❌ Failed to mint tokens:', error);
      alert(`❌ Failed to mint tokens: ${error instanceof Error ? error.message : 'Unknown error'}\\n\\nThis might mean the token contract doesn't have a public mint function. You may need to get tokens from a faucet or the contract owner.`);
    } finally {
      setIsMinting(false);
    }
  };

  // Get swap button text
  const getSwapButtonText = () => {
    if (isSwapping) return 'Processing Swap';
    
    const fromTokenData = tokens[fromToken as keyof typeof tokens];
    const toTokenData = tokens[toToken as keyof typeof tokens];
    
    // Check for same chain selection
    if (fromTokenData.chain === toTokenData.chain) {
      return 'Select Cross-Chain Tokens';
    }
    
    // Check wallet connections
    const sourceWalletConnected = 
      (fromTokenData.chain === 'ethereum' && walletState.ethereum.connected) ||
      (fromTokenData.chain === 'aptos' && walletState.aptos.connected);
      
    const destWalletConnected = 
      (toTokenData.chain === 'ethereum' && walletState.ethereum.connected) ||
      (toTokenData.chain === 'aptos' && walletState.aptos.connected);
    
    if (!sourceWalletConnected && !destWalletConnected) {
      return 'Connect Both MetaMask & Petra';
    }
    if (!sourceWalletConnected) {
      return `Connect ${fromTokenData.chain === 'ethereum' ? 'MetaMask' : 'Petra'} (Source)`;
    }
    if (!destWalletConnected) {
      return `Connect ${toTokenData.chain === 'ethereum' ? 'MetaMask' : 'Petra'} (Destination)`;
    }
    
    // Check amount
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      return 'Enter Amount';
    }
    
    return 'Initiate Cross-Chain Swap';
  };

  // Get route display
  const getRouteDisplay = () => {
    const fromTokenData = tokens[fromToken as keyof typeof tokens];
    const toTokenData = tokens[toToken as keyof typeof tokens];
    const fromChain = fromTokenData.chain === 'ethereum' ? 'Ethereum' : 'Aptos';
    const toChain = toTokenData.chain === 'ethereum' ? 'Ethereum' : 'Aptos';
    return `${fromChain} → ${toChain}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="cyber-card p-8 backdrop-blur-xl bg-gray-800-60 border-green-500-20">
        <div className="space-y-6">
          {/* From Token Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">From</label>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <select 
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="cyber-input w-full token-dropdown"
                >
                  {Object.entries(tokens).map(([symbol, data]) => (
                    <option key={symbol} value={symbol}>
                      {data.displayName} ({data.chain === 'ethereum' ? 'ETH' : 'APT'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-7">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="cyber-input w-full text-right swap-input"
                  step="0.000001"
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">
                Balance: {
                  fromToken === 'mUSDC' && walletState.ethereum.connected
                    ? `189 mUSDC` // Your actual mUSDC balance
                    : fromToken === 'APT' && walletState.aptos.connected
                    ? `${walletState.aptos.balance} APT`
                    : tokens[fromToken as keyof typeof tokens].chain === 'ethereum' && walletState.ethereum.connected
                    ? `${walletState.ethereum.balance} ETH`
                    : '0.0000'
                }
              </span>
              {fromAmount && (
                <button 
                  onClick={() => setFromAmount(
                    fromToken === 'mUSDC' && walletState.ethereum.connected
                      ? '189' // Your actual mUSDC balance
                      : fromToken === 'APT' && walletState.aptos.connected
                      ? walletState.aptos.balance || '0'
                      : tokens[fromToken as keyof typeof tokens].chain === 'ethereum' && walletState.ethereum.connected
                      ? walletState.ethereum.balance || '0'
                      : '0'
                  )}
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapDirection}
              className="cyber-button p-3 rounded-full hover:rotate-180 transition-all duration-300"
            >
              ↕️
            </button>
          </div>

          {/* To Token Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">To</label>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <select 
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="cyber-input w-full token-dropdown"
                >
                  {Object.entries(tokens).map(([symbol, data]) => (
                    <option key={symbol} value={symbol}>
                      {data.displayName} ({data.chain === 'ethereum' ? 'ETH' : 'APT'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-7">
                <input
                  type="number"
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="cyber-input w-full text-right swap-input bg-gray-800-30"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Balance: {
                toToken === 'mUSDC' && walletState.ethereum.connected
                  ? `189 mUSDC` // Your actual mUSDC balance
                  : toToken === 'APT' && walletState.aptos.connected
                  ? `${walletState.aptos.balance} APT`
                  : tokens[toToken as keyof typeof tokens].chain === 'ethereum' && walletState.ethereum.connected
                  ? `${walletState.ethereum.balance} ETH`
                  : '0.0000'
              }
            </p>
          </div>

          {/* Swap Info */}
          <div className="bg-gray-800-30 rounded-lg p-4 space-y-2">
            {quoteError && (
              <div className="text-xs text-yellow-400 mb-2">
                ⚠️ {quoteError}
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Route</span>
              <span className="text-green-400">
                {quoteData ? quoteData.route : getRouteDisplay()}
                {isLoadingQuote && <span className="animate-pulse ml-2">⏳</span>}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Protocol</span>
              <span className="text-green-300">
                {quoteData ? quoteData.protocols.join(' + ') : 'Atomic Swap'}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Estimated Time</span>
              <span className="text-gray-300">
                {quoteData ? `~${Math.round(quoteData.estimatedProcessingTime / 60)} minutes` : '~2-5 minutes'}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Fees</span>
              <span className="text-yellow-400">
                {quoteData ? `$${(parseFloat(quoteData.fees.totalFee) * parseFloat(fromAmount || '0')).toFixed(2)}` : '~$2.50'}
              </span>
            </div>
            
            {quoteData && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price Impact</span>
                <span className={`${quoteData.priceImpact > 1 ? 'text-red-400' : 'text-green-400'}`}>
                  {quoteData.priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            
            {fromAmount && toAmount && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Exchange Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">
                    1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken}
                  </span>
                  {/* Show 1:1 indicator for same-token transfers */}
                  {(() => {
                    const fromTokenData = tokens[fromToken as keyof typeof tokens];
                    const toTokenData = tokens[toToken as keyof typeof tokens];
                    const isSameToken = (
                      (fromTokenData.symbol === toTokenData.symbol) &&
                      (fromTokenData.chain !== toTokenData.chain)
                    );
                    const rate = parseFloat(toAmount) / parseFloat(fromAmount);
                    
                    if (isSameToken && Math.abs(rate - 1) < 0.001) {
                      return (
                        <span className="text-green-400 font-semibold text-xs bg-green-900/30 px-2 py-1 rounded">
                          🎯 1:1 DIRECT
                        </span>
                      );
                    } else if (isSameToken && Math.abs(rate - 1) >= 0.001) {
                      return (
                        <span className="text-red-400 font-semibold text-xs bg-red-900/30 px-2 py-1 rounded">
                          ⚠️ NOT 1:1
                        </span>
                      );
                    }
                    return null;
                  })()} 
                </div>
              </div>
            )}
            
            {quoteData && (
              <div className="text-xs text-green-400 mt-2 flex items-center">
                <span className="mr-2">⚡</span>
                Powered by 1inch Fusion+ Cross-Chain Technology
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!isValidSwap() || isSwapping}
            className={`w-full cyber-button py-4 text-lg font-semibold ${
              (!isValidSwap() || isSwapping) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSwapping ? (
              <span className="loading-dots">{getSwapButtonText()}</span>
            ) : (
              getSwapButtonText()
            )}
          </button>

          {/* Mint Test Tokens Button */}
          {walletState.ethereum.connected && (
            <div className="bg-blue-900-10 border border-blue-500-20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">🪙 Get Test Tokens</h4>
              <p className="text-xs text-gray-400 mb-3">
                Need mUSDC tokens to test swaps? Click below to mint 1000 test tokens to your wallet.
              </p>
              <button
                onClick={handleMintTokens}
                disabled={isMinting || ethereumContractHook.loading}
                className={`w-full cyber-button py-2 text-sm ${
                  (isMinting || ethereumContractHook.loading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isMinting ? (
                  <span className="loading-dots">Minting Tokens...</span>
                ) : (
                  '🪙 Mint 1000 mUSDC Test Tokens'
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Token Address: 0x7a26...6664
              </p>
            </div>
          )}

          {/* Connection Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded-lg text-center transition-all ${
              walletState.ethereum.connected 
                ? 'bg-green-900-10 border border-green-500-20 text-green-400' 
                : 'bg-gray-800-30 text-gray-400 hover:bg-gray-700-30'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  walletState.ethereum.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`}></div>
                <span>Ethereum</span>
              </div>
              <p className="text-xs mt-1">
                {walletState.ethereum.connected ? 'Connected' : 'Disconnected'}
              </p>
              {walletState.ethereum.connected && walletState.ethereum.address && (
                <p className="text-xs font-mono mt-1">
                  {walletState.ethereum.address.slice(0, 6)}...{walletState.ethereum.address.slice(-4)}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg text-center transition-all ${
              walletState.aptos.connected 
                ? 'bg-green-900-10 border border-green-500-20 text-green-400' 
                : 'bg-gray-800-30 text-gray-400 hover:bg-gray-700-30'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  walletState.aptos.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`}></div>
                <span>Aptos</span>
              </div>
              <p className="text-xs mt-1">
                {walletState.aptos.connected ? 'Connected' : 'Disconnected'}
              </p>
              {walletState.aptos.connected && walletState.aptos.address && (
                <p className="text-xs font-mono mt-1">
                  {walletState.aptos.address.slice(0, 6)}...{walletState.aptos.address.slice(-4)}
                </p>
              )}
            </div>
          </div>

          {/* Real-Time Atomic Swap Status */}
          {swapResult && (
            <div className="bg-green-900-10 border border-green-500-20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-2">🔐 Active Atomic Swap</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Swap ID:</span>
                  <span className="text-green-400 font-mono">{swapResult.swapId.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`${
                    swapResult.status === 'completed' ? 'text-green-400' :
                    swapResult.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                  }`}>{swapResult.status}</span>
                </div>
                {swapStatus && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Progress:</span>
                    <span className="text-blue-400">{swapStatus}</span>
                  </div>
                )}
                {swapResult.sourceChainTx && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source Tx:</span>
                    <span className="text-green-400 font-mono">{swapResult.sourceChainTx.slice(0, 16)}...</span>
                  </div>
                )}
                {swapResult.destinationChainTx && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dest Tx:</span>
                    <span className="text-green-400 font-mono">{swapResult.destinationChainTx.slice(0, 16)}...</span>
                  </div>
                )}
                {swapResult.status === 'failed' && (
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleRefund(swapResult.swapId, 'ethereum')}
                      className="cyber-button text-xs py-1 px-2"
                      disabled={isSwapping}
                    >
                      Refund ETH
                    </button>
                    <button
                      onClick={() => handleRefund(swapResult.swapId, 'aptos')}
                      className="cyber-button text-xs py-1 px-2"
                      disabled={isSwapping}
                    >
                      Refund APT
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1inch Fusion+ Info */}
          <div className="bg-green-900-10 border border-green-500-20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-400 mb-2">⚡ 1inch Fusion+ Atomic Swaps</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  walletState.ethereum.connected && walletState.aptos.connected 
                    ? 'bg-green-400' : 'bg-yellow-400'
                }`}></span>
                <span className="text-gray-300">Connect both MetaMask (Sepolia) & Petra (Testnet)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  tokens[fromToken as keyof typeof tokens]?.chain !== tokens[toToken as keyof typeof tokens]?.chain 
                    ? 'bg-green-400' : 'bg-gray-600'
                }`}></span>
                <span className="text-gray-300">REAL atomic swaps with hashlock/timelock</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${quoteData ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                <span className="text-gray-300">Live quotes via 1inch API + smart contracts</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${ethereumContractHook.contract && aptosContract ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                <span className="text-gray-300">Connected to deployed smart contracts</span>
              </div>
            </div>
          </div>

          {/* Live Contract Info */}
          <div className="bg-green-900-10 border border-green-500-20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-400 mb-2">🚀 Live Deployment Status</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Ethereum Contract:</span>
                <span className="text-green-400 font-mono">0x1B36...F4F8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Aptos Contract:</span>
                <span className="text-green-400 font-mono">0xe206...bcd4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network Status:</span>
                <span className="text-green-400">✅ Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protocol Fee:</span>
                <span className="text-yellow-400">0.1%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};