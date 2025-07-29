import { ethers } from 'ethers';
import { SwapParams, SwapStatus } from '../types';

export class SwapService {
  private static instance: SwapService;
  private swaps: Map<string, SwapStatus> = new Map();

  static getInstance(): SwapService {
    if (!SwapService.instance) {
      SwapService.instance = new SwapService();
    }
    return SwapService.instance;
  }

  generateSwapParams(
    fromChain: 'ethereum' | 'aptos',
    toChain: 'ethereum' | 'aptos',
    fromToken: string,
    toToken: string,
    fromAmount: string,
    toAmount: string,
    recipient: string
  ): SwapParams {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const id = `swap_${timestamp}_${randomSuffix}`;
    
    // Generate a random secret (32 bytes)
    const secret = ethers.randomBytes(32);
    const hashlock = ethers.keccak256(secret);
    
    // Set timelock to 2 hours from now
    const timelock = Math.floor(Date.now() / 1000) + 7200;

    return {
      id,
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      recipient,
      hashlock: ethers.hexlify(hashlock),
      secret: ethers.hexlify(secret),
      timelock,
    };
  }

  async initiateSwap(
    swapParams: SwapParams,
    ethereumContract: any,
    aptosContract: any
  ): Promise<SwapStatus> {
    const swapStatus: SwapStatus = {
      id: swapParams.id,
      status: 'pending',
      timestamp: Date.now(),
    };

    this.swaps.set(swapParams.id, swapStatus);

    try {
      // Phase 1: Initiate on source chain
      this.updateSwapStatus(swapParams.id, 'initiated');

      if (swapParams.fromChain === 'ethereum') {
        // Initiate on Ethereum
        const tx = await ethereumContract.initiateSwap(
          swapParams.id,
          swapParams.hashlock,
          swapParams.recipient,
          swapParams.fromAmount,
          swapParams.fromToken,
          swapParams.timelock
        );
        
        swapStatus.fromTx = tx.hash;
        this.swaps.set(swapParams.id, { ...swapStatus, fromTx: tx.hash });
        
        // Wait for Ethereum confirmation
        await tx.wait();
        
      } else {
        // Initiate on Aptos
        const transaction = await aptosContract.initiateSwap(
          swapParams.id,
          swapParams.hashlock,
          swapParams.recipient,
          swapParams.fromAmount,
          swapParams.timelock
        );
        
        const result = await aptosContract.submitTransaction(transaction);
        
        swapStatus.fromTx = result.hash;
        this.swaps.set(swapParams.id, { ...swapStatus, fromTx: result.hash });
      }

      // Phase 2: Simulate counterparty commitment
      // In a real implementation, this would be done by monitoring events
      setTimeout(() => {
        this.updateSwapStatus(swapParams.id, 'committed');
      }, 2000);

      // Phase 3: Complete the swap (reveal secret)
      setTimeout(async () => {
        try {
          if (swapParams.fromChain === 'ethereum') {
            // Complete on Aptos side (if this was a real cross-chain swap)
            // For demo, we'll just mark as completed
            this.updateSwapStatus(swapParams.id, 'completed');
          } else {
            // Complete on Ethereum side
            // For demo, we'll just mark as completed
            this.updateSwapStatus(swapParams.id, 'completed');
          }
        } catch (error) {
          this.updateSwapStatus(swapParams.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
        }
      }, 4000);

      return swapStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateSwapStatus(swapParams.id, 'failed', errorMessage);
      throw error;
    }
  }

  private updateSwapStatus(
    swapId: string,
    status: SwapStatus['status'], 
    error?: string
  ) {
    const currentStatus = this.swaps.get(swapId);
    if (currentStatus) {
      const updatedStatus: SwapStatus = {
        ...currentStatus,
        status,
        error,
      };
      this.swaps.set(swapId, updatedStatus);
    }
  }

  getSwapStatus(swapId: string): SwapStatus | undefined {
    return this.swaps.get(swapId);
  }

  getAllSwaps(): SwapStatus[] {
    return Array.from(this.swaps.values());
  }

  async monitorSwap(swapId: string, callback: (status: SwapStatus) => void) {
    const interval = setInterval(() => {
      const status = this.getSwapStatus(swapId);
      if (status) {
        callback(status);
        
        // Stop monitoring if swap is completed, failed, or refunded
        if (['completed', 'failed', 'refunded'].includes(status.status)) {
          clearInterval(interval);
        }
      }
    }, 1000);

    // Stop monitoring after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 30 * 60 * 1000);

    return interval;
  }

  calculateExchangeRate(
    fromToken: string,
    toToken: string,
    fromAmount: string
  ): string {
    // Simplified exchange rate calculation
    // In a real implementation, this would fetch rates from 1inch API
    
    // For demo purposes, we'll use 1:1 rate with some variation
    const baseRate = 1.0;
    const variation = Math.random() * 0.02 - 0.01; // ±1% variation
    const rate = baseRate + variation;
    
    return (parseFloat(fromAmount) * rate).toString();
  }

  validateSwapParams(params: SwapParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.id) errors.push('Swap ID is required');
    if (!params.fromChain || !params.toChain) errors.push('Both chains must be specified');
    if (params.fromChain === params.toChain) errors.push('Cross-chain swap requires different chains');
    if (!params.fromToken || !params.toToken) errors.push('Both tokens must be specified');
    if (!params.fromAmount || parseFloat(params.fromAmount) <= 0) errors.push('Valid from amount is required');
    if (!params.toAmount || parseFloat(params.toAmount) <= 0) errors.push('Valid to amount is required');
    if (!params.recipient || !ethers.isAddress(params.recipient)) errors.push('Valid recipient address is required');
    if (!params.hashlock) errors.push('Hashlock is required');
    if (!params.timelock || params.timelock <= Math.floor(Date.now() / 1000)) errors.push('Valid future timelock is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  estimateGasCosts(fromChain: 'ethereum' | 'aptos'): { estimated: string; currency: string } {
    // Simplified gas estimation
    if (fromChain === 'ethereum') {
      return { estimated: '0.005', currency: 'ETH' };
    } else {
      return { estimated: '0.001', currency: 'APT' };
    }
  }
}