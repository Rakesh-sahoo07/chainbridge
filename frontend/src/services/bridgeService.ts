import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';

/**
 * Cross-Chain Bridge Service
 * Enables single-sided cross-chain transfers with liquidity pools
 * Users deposit tokens on source chain, bridge releases from destination reserves
 */

export interface BridgeParams {
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

export interface BridgeResult {
  requestId: string;
  sourceChainTx?: string;
  status: 'pending' | 'completed' | 'failed';
  amount: string;
  errorMessage?: string;
}

/**
 * Check if this is a same-token cross-chain transfer (mUSDC ↔ mUSDC)
 */
export function isSameTokenCrossChainTransfer(fromToken: string, toToken: string): boolean {
  const getBaseSymbol = (token: string) => {
    if (token.includes('-')) {
      return token.split('-')[0]; // 'mUSDC-ETH' -> 'mUSDC'
    }
    return token; // 'mUSDC' -> 'mUSDC'
  };
  
  const fromSymbol = getBaseSymbol(fromToken);
  const toSymbol = getBaseSymbol(toToken);
  
  return fromSymbol === toSymbol;
}

/**
 * Get token address mapping for bridge contracts
 */
export function getTokenContractAddress(tokenSymbol: string, chain: 'ethereum' | 'aptos'): string {
  const tokenMap = {
    ethereum: {
      mUSDC: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
      ETH: ethers.ZeroAddress,
    },
    aptos: {
      APT: '0x1::aptos_coin::AptosCoin',
      mUSDC: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::MockUSDC',
    }
  };
  
  return tokenMap[chain][tokenSymbol as keyof typeof tokenMap[typeof chain]] || ethers.ZeroAddress;
}

/**
 * Generate unique bridge request ID
 */
export function generateBridgeRequestId(
  userAddress: string,
  destinationChain: string,
  amount: string,
  timestamp: number
): string {
  return ethers.keccak256(
    ethers.solidityPacked(
      ['address', 'string', 'uint256', 'uint256'],
      [userAddress, destinationChain, ethers.parseUnits(amount, 6), timestamp]
    )
  );
}

/**
 * Initiate single-sided bridge transfer
 */
export async function initiateBridgeTransfer(
  params: BridgeParams,
  ethereumProvider: any,
  aptosProvider: any
): Promise<BridgeResult> {
  
  console.log('🌉 Starting single-sided bridge transfer...');
  
  // Only support mUSDC ↔ mUSDC transfers for now
  if (!isSameTokenCrossChainTransfer(params.fromToken, params.toToken)) {
    throw new Error('Bridge currently only supports mUSDC ↔ mUSDC transfers');
  }

  // Validate amount
  const amount = ethers.parseUnits(params.fromAmount, 6); // mUSDC has 6 decimals
  if (amount <= 0) {
    throw new Error('Invalid bridge amount');
  }

  console.log('💰 Bridge parameters:', {
    fromChain: params.fromChain,
    toChain: params.toChain,
    fromToken: params.fromToken,
    toToken: params.toToken,
    amount: params.fromAmount,
    type: 'Single-sided bridge (1:1)',
  });

  try {
    if (params.fromChain === 'ethereum' && params.toChain === 'aptos') {
      return await bridgeEthereumToAptos(params, ethereumProvider);
    } else if (params.fromChain === 'aptos' && params.toChain === 'ethereum') {
      return await bridgeAptosToEthereum(params, aptosProvider);
    } else {
      throw new Error('Invalid bridge direction');
    }
  } catch (error) {
    console.error('❌ Bridge transfer failed:', error);
    
    return {
      requestId: '',
      status: 'failed',
      amount: params.fromAmount,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Bridge Ethereum → Aptos (Single transaction on Ethereum)
 */
async function bridgeEthereumToAptos(
  params: BridgeParams,
  ethereumProvider: any
): Promise<BridgeResult> {
  console.log('🔄 Executing Ethereum → Aptos bridge...');
  
  const userAddress = params.walletState.ethereum.address!;
  const aptosAddress = params.walletState.aptos.address!;
  const amount = ethers.parseUnits(params.fromAmount, 6);
  
  // Get contracts
  const bridgeAddress = CONTRACT_ADDRESSES.ethereum.crossChainBridge;
  const mockUSDCAddress = CONTRACT_ADDRESSES.ethereum.mockUSDC;
  
  console.log('📄 Contract addresses:', {
    bridge: bridgeAddress,
    mockUSDC: mockUSDCAddress,
  });

  // Create contract instances
  const signer = await ethereumProvider.getSigner();
  
  const bridgeABI = [
    'function bridgeToAptos(uint256 amount, string calldata aptosAddress) external',
    'function getReserves(address token) external view returns (tuple(uint256 balance, uint256 totalBridgedIn, uint256 totalBridgedOut, uint256 feesCollected))',
  ];
  
  const mockUSDCABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)',
  ];
  
  const bridgeContract = new ethers.Contract(bridgeAddress, bridgeABI, signer);
  const mockUSDCContract = new ethers.Contract(mockUSDCAddress, mockUSDCABI, signer);
  
  // Check user balance
  const userBalance = await mockUSDCContract.balanceOf(userAddress);
  if (userBalance < amount) {
    throw new Error(`Insufficient mUSDC balance. Have: ${ethers.formatUnits(userBalance, 6)}, Need: ${params.fromAmount}`);
  }
  
  // Check bridge reserves on Aptos
  console.log('🔍 Checking bridge reserves...');
  const reserves = await bridgeContract.getReserves(mockUSDCAddress);
  console.log('📊 Bridge reserves:', {
    balance: ethers.formatUnits(reserves.balance, 6),
    totalBridgedIn: ethers.formatUnits(reserves.totalBridgedIn, 6),
    totalBridgedOut: ethers.formatUnits(reserves.totalBridgedOut, 6),
    feesCollected: ethers.formatUnits(reserves.feesCollected, 6),
  });
  
  // Check allowance
  const currentAllowance = await mockUSDCContract.allowance(userAddress, bridgeAddress);
  if (currentAllowance < amount) {
    console.log('📝 Approving bridge to spend mUSDC...');
    const approveTx = await mockUSDCContract.approve(bridgeAddress, amount);
    await approveTx.wait();
    console.log('✅ Approval completed:', approveTx.hash);
  }
  
  // Execute bridge transfer
  console.log('🌉 Executing bridge transfer...');
  console.log('📋 Bridge parameters:', {
    amount: ethers.formatUnits(amount, 6),
    aptosAddress: aptosAddress,
  });
  
  const bridgeTx = await bridgeContract.bridgeToAptos(amount, aptosAddress);
  console.log('🔄 Bridge transaction submitted:', bridgeTx.hash);
  
  // Wait for confirmation
  const receipt = await bridgeTx.wait();
  console.log('✅ Bridge transaction confirmed:', {
    hash: bridgeTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  });
  
  // Generate request ID for tracking
  const requestId = generateBridgeRequestId(userAddress, 'aptos', params.fromAmount, Date.now());
  
  console.log('🎉 Ethereum → Aptos bridge completed!');
  console.log('📝 Next step: Relayer will automatically release mUSDC from Aptos reserves');
  
  return {
    requestId,
    sourceChainTx: bridgeTx.hash,
    status: 'pending', // Relayer will complete on Aptos
    amount: params.fromAmount,
  };
}

/**
 * Bridge Aptos → Ethereum (Single transaction on Aptos)
 */
async function bridgeAptosToEthereum(
  params: BridgeParams,
  aptosProvider: any
): Promise<BridgeResult> {
  console.log('🔄 Executing Aptos → Ethereum bridge...');
  
  const userAddress = params.walletState.aptos.address!;
  const ethereumAddress = params.walletState.ethereum.address!;
  const amount = parseFloat(params.fromAmount) * 1000000; // Convert to micro units (6 decimals)
  
  console.log('📋 Bridge parameters:', {
    amount: amount,
    ethereumAddress: ethereumAddress,
    bridgeModule: CONTRACT_ADDRESSES.aptos.crossChainBridge,
  });

  // Execute bridge transfer on Aptos
  const payload = {
    type: "entry_function_payload",
    function: `${CONTRACT_ADDRESSES.aptos.crossChainBridge}::bridge_musdc_to_ethereum`,
    arguments: [
      amount.toString(),
      Array.from(Buffer.from(ethereumAddress.slice(2), 'hex')), // Convert hex address to bytes
    ],
    type_arguments: [],
  };
  
  console.log('🔄 Submitting Aptos bridge transaction...');
  
  const transaction = await aptosProvider.signAndSubmitTransaction(payload);
  console.log('✅ Aptos bridge transaction submitted:', transaction.hash);
  
  // Wait for confirmation
  await aptosProvider.waitForTransaction(transaction.hash);
  console.log('✅ Aptos bridge transaction confirmed');
  
  // Generate request ID for tracking
  const requestId = generateBridgeRequestId(userAddress, 'ethereum', params.fromAmount, Date.now());
  
  console.log('🎉 Aptos → Ethereum bridge completed!');
  console.log('📝 Next step: Relayer will automatically release mUSDC from Ethereum reserves');
  
  return {
    requestId,
    sourceChainTx: transaction.hash,
    status: 'pending', // Relayer will complete on Ethereum
    amount: params.fromAmount,
  };
}

/**
 * Get bridge quote (always 1:1 for mUSDC ↔ mUSDC)
 */
export function getBridgeQuote(params: BridgeParams) {
  if (!isSameTokenCrossChainTransfer(params.fromToken, params.toToken)) {
    throw new Error('Bridge currently only supports mUSDC ↔ mUSDC transfers');
  }
  
  return {
    fromToken: {
      address: getTokenContractAddress(params.fromToken, params.fromChain),
      symbol: params.fromToken.includes('-') ? params.fromToken.split('-')[0] : params.fromToken,
      decimals: 6
    },
    toToken: {
      address: getTokenContractAddress(params.toToken, params.toChain),
      symbol: params.toToken.includes('-') ? params.toToken.split('-')[0] : params.toToken,
      decimals: 6
    },
    fromAmount: params.fromAmount,
    toAmount: params.fromAmount, // 1:1 conversion!
    estimatedGas: '0.001',
    protocols: ['Cross-Chain Bridge'],
    estimatedProcessingTime: 60, // 1 minute
    fees: {
      protocolFee: '0.001', // 0.1% bridge fee
      networkFee: '0.001',
      totalFee: '0.002'
    },
    route: 'Liquidity Bridge',
    priceImpact: 0 // No slippage for 1:1
  };
}