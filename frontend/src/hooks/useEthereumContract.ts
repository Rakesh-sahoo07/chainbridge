import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const CROSS_CHAIN_SWAP_ABI = [
  'function initiateSwap(bytes32 swapId, bytes32 hashlock, address recipient, uint256 amount, address token, uint256 timelock) external',
  'function completeSwap(bytes32 swapId, bytes32 secret) external',
  'function refund(bytes32 swapId) external',
  'function getSwapDetails(bytes32 swapId) external view returns (bytes32, uint256, address, address, uint256, address, bool, bool, uint256)',
  'function isSwapActive(bytes32 swapId) external view returns (bool)',
  'function getCurrentTimestamp() external view returns (uint256)',
  'function isValidTimelock(uint256 timelock) external view returns (bool)',
  'event SwapInitiated(bytes32 indexed swapId, address indexed initiator, bytes32 hashlock, address recipient, uint256 amount, address token, uint256 timelock)',
  'event SwapCompleted(bytes32 indexed swapId, bytes32 secret)',
  'event SwapRefunded(bytes32 indexed swapId)'
];

const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

export const useEthereumContract = () => {
  const { ethProvider, walletState } = useWallet();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ethProvider && walletState.ethereum.connected) {
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESSES.ethereum.crossChainSwap,
        CROSS_CHAIN_SWAP_ABI,
        ethProvider
      ) as any; // Cast to any for demo - in production use proper typing
      setContract(contractInstance);
    } else {
      setContract(null);
    }
  }, [ethProvider, walletState.ethereum.connected]);

  const initiateSwap = async (
    swapId: string,
    hashlock: string,
    recipient: string,
    amount: string,
    tokenAddress: string,
    timelock: number
  ) => {
    if (!contract || !ethProvider) throw new Error('Contract not available');

    console.log('🔧 Ethereum initiateSwap called with:', {
      swapId: swapId.slice(0, 16) + '...',
      hashlock: hashlock.slice(0, 16) + '...',
      recipient: recipient.slice(0, 16) + '...',
      amount,
      tokenAddress,
      timelock
    });

    try {
      setLoading(true);
      const signer = await ethProvider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      console.log('✅ Signer obtained:', await signer.getAddress());

      // If it's an ERC20 token, approve first
      if (tokenAddress !== ethers.ZeroAddress) {
        console.log('🪙 Setting up ERC20 token contract:', tokenAddress);
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        
        console.log('📊 Getting token decimals...');
        const decimals = await tokenContract.decimals();
        console.log('✅ Token decimals:', decimals);
        
        const tokenAmount = ethers.parseUnits(amount, decimals);
        console.log('💰 Parsed token amount:', tokenAmount.toString());
        
        // Check allowance
        console.log('🔍 Checking allowance for cross-chain swap contract...');
        const allowance = await tokenContract.allowance(
          await signer.getAddress(),
          CONTRACT_ADDRESSES.ethereum.crossChainSwap
        );
        console.log('📊 Current allowance:', allowance.toString());
        console.log('📊 Required amount:', tokenAmount.toString());
        
        if (allowance < tokenAmount) {
          console.log('⚠️  Insufficient allowance, approving token spend...');
          const approveTx = await tokenContract.approve(
            CONTRACT_ADDRESSES.ethereum.crossChainSwap,
            tokenAmount
          );
          console.log('📝 Approval transaction sent:', approveTx.hash);
          await approveTx.wait();
          console.log('✅ Token approval confirmed');
        } else {
          console.log('✅ Sufficient allowance already exists');
        }
        
        console.log('🚀 Calling initiateSwap on contract...');
        const tx = await (contractWithSigner as any).initiateSwap(
          swapId,
          hashlock,
          recipient,
          tokenAmount,
          tokenAddress,
          timelock
        );
        
        console.log('📝 InitiateSwap transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('✅ InitiateSwap transaction confirmed:', receipt.transactionHash);
        return receipt;
      } else {
        // ETH swap
        const ethAmount = ethers.parseEther(amount);
        const tx = await (contractWithSigner as any).initiateSwap(
          swapId,
          hashlock,
          recipient,
          ethAmount,
          tokenAddress,
          timelock,
          { value: ethAmount }
        );
        
        return await tx.wait();
      }
    } catch (error) {
      console.error('Failed to initiate swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeSwap = async (swapId: string, secret: string) => {
    if (!contract || !ethProvider) throw new Error('Contract not available');

    try {
      setLoading(true);
      const signer = await ethProvider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await (contractWithSigner as any).completeSwap(swapId, secret);
      return await tx.wait();
    } catch (error) {
      console.error('Failed to complete swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refundSwap = async (swapId: string) => {
    if (!contract || !ethProvider) throw new Error('Contract not available');

    try {
      setLoading(true);
      const signer = await ethProvider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await (contractWithSigner as any).refund(swapId);
      return await tx.wait();
    } catch (error) {
      console.error('Failed to refund swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSwapDetails = async (swapId: string) => {
    if (!contract) throw new Error('Contract not available');

    try {
      const details = await (contract as any).getSwapDetails(swapId);
      return {
        hashlock: details[0],
        timelock: details[1],
        recipient: details[2],
        initiator: details[3],
        amount: details[4],
        token: details[5],
        active: details[6],
        completed: details[7],
        refunded: details[8]
      };
    } catch (error) {
      console.error('Failed to get swap details:', error);
      throw error;
    }
  };

  const isSwapActive = async (swapId: string) => {
    if (!contract) throw new Error('Contract not available');
    
    try {
      return await (contract as any).isSwapActive(swapId);
    } catch (error) {
      console.error('Failed to check swap status:', error);
      throw error;
    }
  };

  const getTokenBalance = async (tokenAddress: string, userAddress: string) => {
    if (!ethProvider) throw new Error('Provider not available');

    try {
      if (tokenAddress === ethers.ZeroAddress) {
        const balance = await ethProvider.getBalance(userAddress);
        return ethers.formatEther(balance);
      } else {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
        const balance = await tokenContract.balanceOf(userAddress);
        const decimals = await tokenContract.decimals();
        return ethers.formatUnits(balance, decimals);
      }
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return '0';
    }
  };

  const getCurrentBlockchainTimestamp = async (): Promise<number> => {
    if (!contract) throw new Error('Contract not available');
    
    try {
      const timestamp = await (contract as any).getCurrentTimestamp();
      return Number(timestamp);
    } catch (error) {
      console.error('Failed to get blockchain timestamp:', error);
      // Fallback to local time if contract call fails
      return Math.floor(Date.now() / 1000);
    }
  };

  const generateBlockchainTimelock = async (bufferMinutes: number = 15): Promise<number> => {
    try {
      const currentBlockchainTime = await getCurrentBlockchainTimestamp();
      const timelock = currentBlockchainTime + (bufferMinutes * 60);
      
      console.log('🕒 Generated blockchain-based timelock:', {
        blockchainTime: currentBlockchainTime,
        blockchainDate: new Date(currentBlockchainTime * 1000).toISOString(),
        localTime: Math.floor(Date.now() / 1000),
        localDate: new Date().toISOString(),
        timeDiff: currentBlockchainTime - Math.floor(Date.now() / 1000),
        timelock: timelock,
        timelockDate: new Date(timelock * 1000).toISOString(),
        bufferSeconds: timelock - currentBlockchainTime
      });
      
      return timelock;
    } catch (error) {
      console.error('Failed to generate blockchain timelock:', error);
      // Fallback to local time
      return Math.floor(Date.now() / 1000) + (bufferMinutes * 60);
    }
  };

  const mintTestTokens = async (tokenAddress: string, amount: string = '1000') => {
    if (!ethProvider || !walletState.ethereum.connected) {
      throw new Error('Ethereum provider not available or wallet not connected');
    }

    try {
      setLoading(true);
      console.log(`🪙 Attempting to mint ${amount} test tokens from:`, tokenAddress);
      
      const signer = await ethProvider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Extended ABI for test token with mint function
      const testTokenABI = [
        ...ERC20_ABI,
        'function mint(address to, uint256 amount) external',
        'function faucet() external', // Some test tokens have a faucet function
        'function mint(uint256 amount) external', // Some have simplified mint
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, testTokenABI, signer);
      const decimals = await tokenContract.decimals();
      const mintAmount = ethers.parseUnits(amount, decimals);
      
      console.log(`💰 Minting ${amount} tokens (${mintAmount.toString()} units) to:`, userAddress);
      
      let tx;
      try {
        // Try different mint function signatures
        tx = await tokenContract.mint(userAddress, mintAmount);
        console.log('✅ Mint transaction sent (mint(address,uint256)):', tx.hash);
      } catch (e1) {
        try {
          tx = await tokenContract.mint(mintAmount);
          console.log('✅ Mint transaction sent (mint(uint256)):', tx.hash);
        } catch (e2) {
          try {
            tx = await tokenContract.faucet();
            console.log('✅ Faucet transaction sent:', tx.hash);
          } catch (e3) {
            throw new Error('No compatible mint/faucet function found on token contract');
          }
        }
      }
      
      const receipt = await tx.wait();
      console.log('✅ Mint transaction confirmed:', receipt.transactionHash);
      
      // Check new balance
      const newBalance = await getTokenBalance(tokenAddress, userAddress);
      console.log('💰 New token balance:', newBalance);
      
      return receipt;
    } catch (error) {
      console.error('❌ Failed to mint test tokens:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    contract,
    loading,
    initiateSwap,
    completeSwap,
    refundSwap,
    getSwapDetails,
    isSwapActive,
    getTokenBalance,
    mintTestTokens,
    getCurrentBlockchainTimestamp,
    generateBlockchainTimelock,
  };
};