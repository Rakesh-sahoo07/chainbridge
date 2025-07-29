import { ethers } from 'ethers';
import { getOneInchCrossChainQuote, type ChainBridgeQuoteResponse } from './oneInchService';

/**
 * Real Atomic Swap Service
 * Bridges 1inch quotes with actual smart contract execution
 */

export interface AtomicSwapParams {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromChain: 'ethereum' | 'aptos';
  toChain: 'ethereum' | 'aptos';
  walletState: {
    ethereum: { connected: boolean; address?: string };
    aptos: { connected: boolean; address?: string };
  };
}

export interface AtomicSwapResult {
  swapId: string;
  secret: string;
  hashlock: string;
  sourceChainTx?: string;
  destinationChainTx?: string;
  status: 'initiated' | 'completed' | 'failed' | 'refunded';
  quote: ChainBridgeQuoteResponse;
  errorMessage?: string;
}

/**
 * Generate cryptographically secure atomic swap parameters
 */
export function generateAtomicSwapParams(): {
  swapId: string;
  secret: string;
  hashlock: string;
  timelock: number;
} {
  // Generate 32-byte secret
  const secret = ethers.hexlify(ethers.randomBytes(32));
  
  // Generate hashlock from secret
  const hashlock = ethers.keccak256(secret);
  
  // Generate unique swap ID
  const swapId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [hashlock, Date.now()]
    )
  );
  
  // Set timelock to 3 hours from now (contract requires 2 hour minimum)
  const timelock = Math.floor(Date.now() / 1000) + (3 * 60 * 60);
  
  return { swapId, secret, hashlock, timelock };
}

/**
 * Generate fresh timelock right before contract call
 */
export function generateFreshTimelock(): number {
  // Generate timelock with 3 hours buffer right before use (contract requires 2hr minimum)
  return Math.floor(Date.now() / 1000) + (3 * 60 * 60);
}

/**
 * Get token address mapping for smart contracts
 */
export function getTokenContractAddress(tokenSymbol: string, chain: 'ethereum' | 'aptos'): string {
  const tokenMap = {
    ethereum: {
      mUSDC: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664', // VERIFIED DEPLOYED
      ETH: ethers.ZeroAddress, // Native ETH
      // Note: Only including ACTUALLY DEPLOYED contracts
      // mUSDT: '0xc764A9C47F47b8085e5Af9036c9c97ea28ECdDc2', // NOT CONFIRMED DEPLOYED
      // mDAI: '0x92614C91f7dD4C2c6f06ff17dee4C47c90956c29', // NOT CONFIRMED DEPLOYED
    },
    aptos: {
      APT: '0x1::aptos_coin::AptosCoin', // Native APT - DEPLOYED
    }
  };
  
  return tokenMap[chain][tokenSymbol as keyof typeof tokenMap[typeof chain]] || ethers.ZeroAddress;
}

/**
 * Initiate atomic swap with 1inch optimization and real smart contract execution
 */
export async function initiateAtomicSwap(
  params: AtomicSwapParams,
  ethereumContractHook: any,
  aptosContract: any
): Promise<AtomicSwapResult> {
  
  console.log('🚀 Starting REAL atomic swap with 1inch optimization...');
  
  // 1. Get 1inch optimized quote
  const quote = await getOneInchCrossChainQuote({
    fromTokenAddress: getTokenContractAddress(params.fromToken, params.fromChain),
    toTokenAddress: getTokenContractAddress(params.toToken, params.toChain),
    amount: params.fromAmount,
    fromNetwork: params.fromChain === 'ethereum' ? 11155111 : 999,
    toNetwork: params.toChain === 'ethereum' ? 11155111 : 999,
    walletAddress: params.fromChain === 'ethereum' 
      ? params.walletState.ethereum.address! 
      : params.walletState.aptos.address!,
  });
  
  console.log('💰 1inch quote received:', quote);
  
  // 2. Generate atomic swap parameters
  const { swapId, secret, hashlock, timelock } = generateAtomicSwapParams();
  
  console.log('🔐 Atomic swap parameters:', {
    swapId: swapId.slice(0, 10) + '...',
    hashlock: hashlock.slice(0, 10) + '...',
    timelock: timelock,
    timelockDate: new Date(timelock * 1000).toISOString(),
    currentTime: Math.floor(Date.now() / 1000),
    currentDate: new Date().toISOString(),
  });
  
  // 3. Execute based on swap direction
  let result: AtomicSwapResult;
  
  if (params.fromChain === 'ethereum' && params.toChain === 'aptos') {
    result = await executeEthereumToAptos({
      ...params,
      quote,
      swapId,
      secret,
      hashlock,
      timelock,
      ethereumContractHook,
      aptosContract,
    });
  } else if (params.fromChain === 'aptos' && params.toChain === 'ethereum') {
    result = await executeAptosToEthereum({
      ...params,
      quote,
      swapId,
      secret,
      hashlock,
      timelock,
      ethereumContractHook,
      aptosContract,
    });
  } else {
    throw new Error('Invalid cross-chain swap direction');
  }
  
  console.log('✅ Atomic swap completed:', result);
  return result;
}

/**
 * Execute Ethereum → Aptos atomic swap
 */
async function executeEthereumToAptos(swapParams: any): Promise<AtomicSwapResult> {
  console.log('🔄 Executing Ethereum → Aptos atomic swap...');
  console.log('🐛 Debug swapParams:', {
    hasEthereumContractHook: !!swapParams.ethereumContractHook,
    ethereumContractHookType: typeof swapParams.ethereumContractHook,
    ethereumContractHookKeys: swapParams.ethereumContractHook ? Object.keys(swapParams.ethereumContractHook) : 'undefined'
  });
  
  try {
    // Phase 1: Lock tokens on Ethereum with hashlock
    console.log('📤 Phase 1: Locking tokens on Ethereum...');
    
    // For cross-chain swaps, we need to encode the Aptos address as bytes32
    // Since Ethereum contract expects an address, we'll use the Ethereum wallet address
    // and store the real Aptos recipient in our local tracking
    const ethereumRecipient = swapParams.walletState.ethereum.address; // Use ETH address for contract
    
    console.log('🔄 Converting addresses for cross-chain compatibility:');
    console.log('   Original Aptos recipient:', swapParams.walletState.aptos.address);
    console.log('   Using ETH address in contract:', ethereumRecipient);
    
    // Generate fresh timelock right before contract call - contract requires 2 hours minimum!
    const freshTimelock = Math.floor(Date.now() / 1000) + (3 * 60 * 60); // 3 hours buffer (above 2hr minimum)
    console.log('🕒 Using fresh timelock with extra buffer:', {
      originalTimelock: swapParams.timelock,
      freshTimelock: freshTimelock,
      freshlockDate: new Date(freshTimelock * 1000).toISOString(),
      localCurrentTime: Math.floor(Date.now() / 1000),
      bufferSeconds: freshTimelock - Math.floor(Date.now() / 1000)
    });

    const ethereumTx = await swapParams.ethereumContractHook.initiateSwap(
      swapParams.swapId,
      swapParams.hashlock,
      ethereumRecipient, // Use ETH address to avoid ENS resolution
      swapParams.fromAmount,
      getTokenContractAddress(swapParams.fromToken, 'ethereum'),
      freshTimelock  // Use fresh timelock instead of original
    );
    
    console.log('✅ Ethereum transaction completed:', ethereumTx.hash);
    
    // Phase 2: Lock corresponding tokens on Aptos
    console.log('📥 Phase 2: Locking tokens on Aptos...');
    
    const aptosTransaction = await swapParams.aptosContract.initiateSwap(
      swapParams.swapId,
      swapParams.hashlock,
      swapParams.walletState.ethereum.address, // Recipient on Ethereum
      swapParams.quote.toAmount,
      freshTimelock  // Use same fresh timelock for consistency
    );
    
    const aptosTx = await swapParams.aptosContract.submitTransaction(aptosTransaction);
    console.log('✅ Aptos transaction completed:', aptosTx.hash);
    
    // Phase 3: Complete swap by revealing secret
    console.log('🔓 Phase 3: Revealing secret to complete atomic swap...');
    
    // Complete on Aptos first (where we want to receive tokens)
    const aptosCompleteTransaction = await swapParams.aptosContract.completeSwap(
      swapParams.swapId,
      swapParams.secret
    );
    const aptosCompleteTx = await swapParams.aptosContract.submitTransaction(aptosCompleteTransaction);
    
    // Complete on Ethereum (this releases our locked tokens to recipient)
    const ethereumCompleteTx = await swapParams.ethereumContractHook.completeSwap(
      swapParams.swapId,
      swapParams.secret
    );
    
    console.log('🎉 Ethereum → Aptos atomic swap completed successfully!');
    
    return {
      swapId: swapParams.swapId,
      secret: swapParams.secret,
      hashlock: swapParams.hashlock,
      sourceChainTx: ethereumTx.hash,
      destinationChainTx: aptosTx.hash,
      status: 'completed',
      quote: swapParams.quote,
    };
    
  } catch (error) {
    console.error('❌ Ethereum → Aptos atomic swap failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      swapParams: {
        swapId: swapParams.swapId,
        fromToken: swapParams.fromToken,
        toToken: swapParams.toToken,
        fromAmount: swapParams.fromAmount,
        fromChain: swapParams.fromChain,
        toChain: swapParams.toChain,
      }
    });
    
    return {
      swapId: swapParams.swapId,
      secret: swapParams.secret,
      hashlock: swapParams.hashlock,
      status: 'failed',
      quote: swapParams.quote,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Execute Aptos → Ethereum atomic swap
 */
async function executeAptosToEthereum(swapParams: any): Promise<AtomicSwapResult> {
  console.log('🔄 Executing Aptos → Ethereum atomic swap...');
  
  try {
    // Phase 1: Lock APT on Aptos with hashlock
    console.log('📤 Phase 1: Locking APT on Aptos...');
    
    // Generate fresh timelock right before contract call - contract requires 2 hours minimum!
    const freshTimelock = Math.floor(Date.now() / 1000) + (3 * 60 * 60); // 3 hours buffer
    console.log('🕒 Using fresh timelock with 3hr buffer for Aptos→Ethereum swap:', {
      originalTimelock: swapParams.timelock,
      freshTimelock: freshTimelock,
      bufferSeconds: freshTimelock - Math.floor(Date.now() / 1000)
    });

    const aptosTransaction = await swapParams.aptosContract.initiateSwap(
      swapParams.swapId,
      swapParams.hashlock,
      swapParams.walletState.ethereum.address, // Recipient on Ethereum
      swapParams.fromAmount,
      freshTimelock  // Use fresh timelock
    );
    
    const aptosTx = await swapParams.aptosContract.submitTransaction(aptosTransaction);
    console.log('✅ Aptos transaction completed:', aptosTx.hash);
    
    // Phase 2: Lock corresponding tokens on Ethereum
    console.log('📥 Phase 2: Locking tokens on Ethereum...');
    
    // For cross-chain swaps, use Ethereum address to avoid ENS resolution issues
    const ethereumRecipient = swapParams.walletState.ethereum.address; // Use ETH address for contract
    
    console.log('🔄 Converting addresses for cross-chain compatibility:');
    console.log('   Original Aptos sender:', swapParams.walletState.aptos.address);
    console.log('   Using ETH address in contract:', ethereumRecipient);
    
    const ethereumTx = await swapParams.ethereumContractHook.initiateSwap(
      swapParams.swapId,
      swapParams.hashlock,
      ethereumRecipient, // Use ETH address to avoid ENS resolution
      swapParams.quote.toAmount,
      getTokenContractAddress(swapParams.toToken, 'ethereum'),
      freshTimelock  // Use same fresh timelock for consistency
    );
    
    console.log('✅ Ethereum transaction completed:', ethereumTx.hash);
    
    // Phase 3: Complete swap by revealing secret
    console.log('🔓 Phase 3: Revealing secret to complete atomic swap...');
    
    // Complete on Ethereum first (where we want to receive tokens)
    const ethereumCompleteTx = await swapParams.ethereumContractHook.completeSwap(
      swapParams.swapId,
      swapParams.secret
    );
    
    // Complete on Aptos (this releases our locked APT to recipient)
    const aptosCompleteTransaction = await swapParams.aptosContract.completeSwap(
      swapParams.swapId,
      swapParams.secret
    );
    const aptosCompleteTx = await swapParams.aptosContract.submitTransaction(aptosCompleteTransaction);
    
    console.log('🎉 Atomic swap completed successfully!');
    
    return {
      swapId: swapParams.swapId,
      secret: swapParams.secret,
      hashlock: swapParams.hashlock,
      sourceChainTx: aptosTx.hash,
      destinationChainTx: ethereumTx.hash,
      status: 'completed',
      quote: swapParams.quote,
    };
    
  } catch (error) {
    console.error('❌ Atomic swap failed:', error);
    
    return {
      swapId: swapParams.swapId,
      secret: swapParams.secret,
      hashlock: swapParams.hashlock,
      status: 'failed',
      quote: swapParams.quote,
    };
  }
}

/**
 * Monitor atomic swap status
 */
export async function monitorAtomicSwap(
  swapId: string,
  ethereumContractHook: any,
  aptosContract: any
): Promise<{
  ethereumStatus: any;
  aptosStatus: any;
  canRefund: boolean;
}> {
  try {
    const [ethereumStatus, aptosStatus] = await Promise.allSettled([
      ethereumContractHook.getSwapDetails(swapId),
      aptosContract.getSwapDetails(swapId),
    ]);
    
    const ethResult = ethereumStatus.status === 'fulfilled' ? ethereumStatus.value : null;
    const aptResult = aptosStatus.status === 'fulfilled' ? aptosStatus.value : null;
    
    // Check if timelock has expired for refund eligibility
    const currentTime = Math.floor(Date.now() / 1000);
    const canRefund = ethResult?.timelock && currentTime > ethResult.timelock;
    
    return {
      ethereumStatus: ethResult,
      aptosStatus: aptResult,
      canRefund,
    };
  } catch (error) {
    console.error('Failed to monitor atomic swap:', error);
    throw error;
  }
}

/**
 * Refund expired atomic swap
 */
export async function refundAtomicSwap(
  swapId: string,
  chain: 'ethereum' | 'aptos',
  ethereumContractHook: any,
  aptosContract: any
): Promise<{ success: boolean; txHash?: string }> {
  try {
    console.log(`🔄 Refunding atomic swap on ${chain}...`);
    
    let tx;
    if (chain === 'ethereum') {
      tx = await ethereumContractHook.refundSwap(swapId);
    } else {
      const transaction = await aptosContract.refundSwap(swapId);
      tx = await aptosContract.submitTransaction(transaction);
    }
    
    console.log(`✅ Refund completed on ${chain}:`, tx.hash);
    
    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error) {
    console.error(`❌ Refund failed on ${chain}:`, error);
    return {
      success: false,
    };
  }
}