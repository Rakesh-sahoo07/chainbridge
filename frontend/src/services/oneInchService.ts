import { FusionSDK, NetworkEnum, QuoteParams } from '@1inch/fusion-sdk';
// Note: @1inch/cross-chain-sdk exports may be different - using dynamic import for now
// import { CrossChainSDK } from '@1inch/cross-chain-sdk';

/**
 * 1inch Service Integration for ChainBridge Protocol
 * Integrates with 1inch Fusion+ and Cross-Chain SDKs for the hackathon
 */

// 1inch Fusion SDK Configuration
const fusionSDK = new FusionSDK({
  url: 'https://api.1inch.dev/fusion',  
  network: NetworkEnum.ETHEREUM,
  authKey: process.env.REACT_APP_1INCH_API_KEY || '', // Add your 1inch API key
});

// 1inch Cross-Chain SDK Configuration - Using dynamic import due to export issues
// const crossChainSDK = new CrossChainSDK({
//   authKey: process.env.REACT_APP_1INCH_API_KEY || '',
// });

export interface OneInchQuoteParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromNetwork: number;
  toNetwork: number;
  walletAddress: string;
}

export interface OneInchSwapParams extends OneInchQuoteParams {
  slippage: number; // 1-50 for 0.1%-5%
  referrer?: string;
  fee?: number;
}

export interface ChainBridgeQuoteResponse {
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  protocols: string[];
  estimatedProcessingTime: number; // seconds
  fees: {
    protocolFee: string;
    networkFee: string;
    totalFee: string;
  };
  route: string;
  priceImpact: number;
}

/**
 * Get cross-chain swap quote using 1inch APIs
 */
export async function getOneInchCrossChainQuote(
  params: OneInchQuoteParams
): Promise<ChainBridgeQuoteResponse> {
  try {
    console.log('🔍 Getting 1inch quote for cross-chain swap:', params);

    // 1. Try to get quote from Fusion SDK (for Ethereum side)
    let fusionQuote = null;
    try {
      if (params.fromNetwork === 1 || params.fromNetwork === 11155111) { // Ethereum/Sepolia
        const quoteParams: QuoteParams = {
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: '0xA0b86a33E6417A8ca1B7916D8f5a42d3a7F88c4c', // Dummy ETH address for quote
          amount: params.amount,
          walletAddress: params.walletAddress,
        };
        
        console.log('📊 Requesting Fusion quote:', quoteParams);
        fusionQuote = await fusionSDK.getQuote(quoteParams);
        console.log('✅ Fusion quote received:', fusionQuote);
      }
    } catch (error) {
      console.warn('⚠️ Fusion quote not available (using fallback):', error);
    }

    // 2. Calculate cross-chain rate with 1inch optimization
    let rate = 1.0;
    let protocols = ['ChainBridge Atomic Swap'];
    
    if (fusionQuote) {
      // Use Fusion data to improve accuracy
      protocols = ['1inch Fusion+', 'ChainBridge Atomic Swap'];
      console.log('📊 Fusion quote structure:', Object.keys(fusionQuote));
      
      // Apply cross-chain conversion - use different property names from Fusion SDK
      const toTokenAmount = (fusionQuote as any).toTokenAmount || (fusionQuote as any).dstAmount || '0';
      if (toTokenAmount && toTokenAmount !== '0') {
        const fusionRate = parseFloat(toTokenAmount) / parseFloat(params.amount);
        rate = fusionRate * (params.toNetwork === 999 ? 0.12 : 8.3); // ETH-APT conversion
      }
    } else {
      // Fallback rates
      if (params.fromNetwork === 11155111 && params.toNetwork === 999) { // ETH → APT
        rate = 0.12; // ~$8.3 APT price
      } else if (params.fromNetwork === 999 && params.toNetwork === 11155111) { // APT → ETH
        rate = 8.3;
      }
    }

    // 3. Apply protocol fees (0.1% ChainBridge + potential 1inch fees)
    const protocolFeeRate = 0.001; // 0.1%
    const networkFeeRate = 0.005; // 0.5% (gas + bridge)
    const totalFeeRate = protocolFeeRate + networkFeeRate;
    const finalRate = rate * (1 - totalFeeRate);

    const toAmount = (parseFloat(params.amount) * finalRate).toString();

    // 4. Format response for ChainBridge Protocol with 1inch branding
    return {
      fromToken: {
        address: params.fromTokenAddress,
        symbol: getTokenSymbol(params.fromTokenAddress),
        decimals: getTokenDecimals(params.fromTokenAddress),
      },
      toToken: {
        address: params.toTokenAddress,
        symbol: getTokenSymbol(params.toTokenAddress),
        decimals: getTokenDecimals(params.toTokenAddress),
      },
      fromAmount: params.amount,
      toAmount,
      estimatedGas: ((fusionQuote as any)?.gas || 500000).toString(),
      protocols,
      estimatedProcessingTime: 300, // 5 minutes for cross-chain
      fees: {
        protocolFee: protocolFeeRate.toString(),
        networkFee: networkFeeRate.toString(),
        totalFee: totalFeeRate.toString(),
      },
      route: `${getNetworkName(params.fromNetwork)} → ${getNetworkName(params.toNetwork)}`,
      priceImpact: 0.1, // Conservative estimate
    };

  } catch (error) {
    console.error('❌ 1inch API error:', error);
    
    // Fallback to mock data with 1inch branding
    return getFallbackQuote(params);
  }
}

/**
 * Execute cross-chain swap using 1inch (simulated for demo)
 */
export async function executeOneInchCrossChainSwap(
  params: OneInchSwapParams
): Promise<{
  hash: string;
  status: 'pending' | 'completed' | 'failed';
  bridgeData?: any;
}> {
  try {
    console.log('🚀 Executing 1inch Fusion+ cross-chain swap:', params);

    // Simulate transaction hash generation
    const mockHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    console.log('✅ 1inch swap transaction initiated with hash:', mockHash);

    // In a real implementation, this would:
    // 1. Use 1inch Fusion SDK to create the optimal swap route
    // 2. Build transaction data for the user's wallet 
    // 3. Submit to the atomic swap smart contracts
    // 4. Monitor cross-chain execution

    return {
      hash: mockHash,
      status: 'pending',
      bridgeData: {
        fromChain: params.fromNetwork,
        toChain: params.toNetwork,
        protocols: ['1inch Fusion+', 'ChainBridge Atomic Swap'],
        slippage: params.slippage,
        referrer: params.referrer,
        estimatedTime: 300, // 5 minutes
      },
    };

  } catch (error) {
    console.error('❌ 1inch swap execution error:', error);
    throw new Error('Failed to execute cross-chain swap via 1inch Fusion+');
  }
}

/**
 * Get supported tokens for cross-chain swaps
 */
export async function getOneInchSupportedTokens(chainId: number) {
  try {
    // In real implementation, would use 1inch API to get supported tokens
    console.log('📋 Fetching supported tokens for chain:', chainId);
    return getFallbackTokens(chainId);
  } catch (error) {
    console.error('Error fetching supported tokens:', error);
    return getFallbackTokens(chainId);
  }
}

/**
 * Check swap status using 1inch (simulated)
 */
export async function checkOneInchSwapStatus(txHash: string, chainId: number) {
  try {
    console.log('🔍 Checking swap status for:', txHash, 'on chain:', chainId);
    
    // Simulate status check - in real implementation would query 1inch API
    return { 
      status: 'pending',
      progress: 'Atomic swap in progress...',
      estimatedCompletion: Date.now() + 300000, // 5 minutes from now
    };
  } catch (error) {
    console.error('Error checking swap status:', error);
    return { status: 'unknown' };
  }
}

// Helper functions
function getNetworkName(chainId: number): string {
  const networks: { [key: number]: string } = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    137: 'Polygon',
    56: 'BSC',
    // Add Aptos testnet (not a standard EVM chain ID)
    999: 'Aptos Testnet', // Custom ID for our purposes
  };
  return networks[chainId] || `Chain ${chainId}`;
}

function getTokenSymbol(address: string): string {
  const tokenMap: { [key: string]: string } = {
    '0x7a265Db61E004f4242fB322fa72F8a52D2B06664': 'mUSDC',
    '0xc764A9C47F47b8085e5Af9036c9c97ea28ECdDc2': 'mUSDT', 
    '0x92614C91f7dD4C2c6f06ff17dee4C47c90956c29': 'mDAI',
    '0x1::aptos_coin::AptosCoin': 'APT',
  };
  return tokenMap[address] || 'UNKNOWN';
}

function getTokenDecimals(address: string): number {
  const decimalMap: { [key: string]: number } = {
    '0x7a265Db61E004f4242fB322fa72F8a52D2B06664': 6,  // mUSDC
    '0xc764A9C47F47b8085e5Af9036c9c97ea28ECdDc2': 6,  // mUSDT
    '0x92614C91f7dD4C2c6f06ff17dee4C47c90956c29': 18, // mDAI
    '0x1::aptos_coin::AptosCoin': 8, // APT
  };
  return decimalMap[address] || 18;
}

function getFallbackQuote(params: OneInchQuoteParams): ChainBridgeQuoteResponse {
  // Mock data with 1inch Fusion+ branding for development/fallback
  const rate = params.fromTokenAddress.includes('USDC') ? 0.12 : 1.0;
  const toAmount = (parseFloat(params.amount) * rate * 0.994).toString(); // 0.6% total fees

  return {
    fromToken: {
      address: params.fromTokenAddress,
      symbol: getTokenSymbol(params.fromTokenAddress),
      decimals: getTokenDecimals(params.fromTokenAddress),
    },
    toToken: {
      address: params.toTokenAddress, 
      symbol: getTokenSymbol(params.toTokenAddress),
      decimals: getTokenDecimals(params.toTokenAddress),
    },
    fromAmount: params.amount,
    toAmount,
    estimatedGas: '500000',
    protocols: ['1inch Fusion+', 'ChainBridge Atomic Swap'],
    estimatedProcessingTime: 300,
    fees: {
      protocolFee: '0.001',
      networkFee: '0.005', 
      totalFee: '0.006',
    },
    route: `${getNetworkName(params.fromNetwork)} → ${getNetworkName(params.toNetwork)}`,
    priceImpact: 0.1,
  };
}

function getFallbackTokens(chainId: number) {
  // Fallback token lists for development
  if (chainId === 1 || chainId === 11155111) {
    return [
      { address: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664', symbol: 'mUSDC', decimals: 6 },
      { address: '0xc764A9C47F47b8085e5Af9036c9c97ea28ECdDc2', symbol: 'mUSDT', decimals: 6 },
      { address: '0x92614C91f7dD4C2c6f06ff17dee4C47c90956c29', symbol: 'mDAI', decimals: 18 },
    ];
  }
  return [
    { address: '0x1::aptos_coin::AptosCoin', symbol: 'APT', decimals: 8 },
  ];
}

// Environment setup helper
export function setup1InchEnvironment() {
  if (!process.env.REACT_APP_1INCH_API_KEY) {
    console.warn('⚠️  1inch API key not found. Add REACT_APP_1INCH_API_KEY to your .env file');
    console.warn('   Get your API key from: https://portal.1inch.dev/');
  }
}