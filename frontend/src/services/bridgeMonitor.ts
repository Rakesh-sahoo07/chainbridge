import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';

/**
 * Frontend Bridge Monitor Service
 * 
 * Monitors bridge transactions and provides real-time status updates to users
 * Works alongside the backend relayer to give users visibility into their transfers
 */

export interface BridgeMonitorResult {
  status: 'pending' | 'locked' | 'processing' | 'completed' | 'failed';
  sourceChainConfirmed: boolean;
  destinationChainConfirmed: boolean;
  estimatedCompletionTime: number; // seconds
  currentStep: string;
  transactionHashes: {
    source?: string;
    destination?: string;
  };
  error?: string;
}

class BridgeMonitorService {
  private ethereumProvider: ethers.Provider | null = null;
  private ethereumBridge: ethers.Contract | null = null;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeEthereumProvider();
  }

  private async initializeEthereumProvider() {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        this.ethereumProvider = new ethers.BrowserProvider((window as any).ethereum);
        
        const bridgeABI = [
          'event BridgeRequestCreated(bytes32 indexed requestId, address indexed user, string destinationChain, string destinationAddress, uint256 amount, address indexed token, uint256 timestamp)',
          'event BridgeRequestProcessed(bytes32 indexed requestId, address indexed user, uint256 amount, address indexed token, address relayer, uint256 timestamp)',
          'function getBridgeRequest(bytes32 requestId) external view returns (tuple(bytes32 requestId, address user, string destinationChain, string destinationAddress, uint256 amount, address token, uint256 timestamp, bool processed))',
          'function getReserves(address token) external view returns (tuple(uint256 balance, uint256 totalBridgedIn, uint256 totalBridgedOut, uint256 feesCollected))'
        ];

        this.ethereumBridge = new ethers.Contract(
          CONTRACT_ADDRESSES.ethereum.crossChainBridge,
          bridgeABI,
          this.ethereumProvider
        );
      }
    } catch (error) {
      console.error('Failed to initialize Ethereum provider:', error);
    }
  }

  /**
   * Start monitoring a bridge transfer
   */
  async startMonitoring(
    transferId: string,
    sourceChain: 'ethereum' | 'aptos',
    sourceTxHash: string,
    onUpdate: (result: BridgeMonitorResult) => void
  ): Promise<void> {
    console.log('🔍 Starting bridge monitoring:', {
      transferId,
      sourceChain,
      sourceTxHash
    });

    // Clear any existing monitoring for this transfer
    this.stopMonitoring(transferId);

    let result: BridgeMonitorResult = {
      status: 'pending',
      sourceChainConfirmed: false,
      destinationChainConfirmed: false,
      estimatedCompletionTime: 60, // 1 minute estimate
      currentStep: 'Confirming source transaction...',
      transactionHashes: {
        source: sourceTxHash
      }
    };

    // Start monitoring loop
    const monitoringInterval = setInterval(async () => {
      try {
        result = await this.checkBridgeProgress(transferId, sourceChain, sourceTxHash, result);
        onUpdate(result);

        // Stop monitoring if completed or failed
        if (result.status === 'completed' || result.status === 'failed') {
          this.stopMonitoring(transferId);
        }
      } catch (error) {
        console.error('Error during bridge monitoring:', error);
        result = {
          ...result,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown monitoring error'
        };
        onUpdate(result);
        this.stopMonitoring(transferId);
      }
    }, 5000); // Check every 5 seconds

    this.monitoringIntervals.set(transferId, monitoringInterval);

    // Initial update
    onUpdate(result);
  }

  /**
   * Check progress of a bridge transfer
   */
  private async checkBridgeProgress(
    transferId: string,
    sourceChain: 'ethereum' | 'aptos',
    sourceTxHash: string,
    currentResult: BridgeMonitorResult
  ): Promise<BridgeMonitorResult> {
    
    if (sourceChain === 'ethereum') {
      return await this.checkEthereumToAptosProgress(transferId, sourceTxHash, currentResult);
    } else {
      return await this.checkAptosToEthereumProgress(transferId, sourceTxHash, currentResult);
    }
  }

  /**
   * Monitor ETH → Aptos bridge progress
   */
  private async checkEthereumToAptosProgress(
    transferId: string,
    sourceTxHash: string,
    currentResult: BridgeMonitorResult
  ): Promise<BridgeMonitorResult> {
    
    if (!this.ethereumProvider || !this.ethereumBridge) {
      throw new Error('Ethereum provider not initialized');
    }

    // Step 1: Check if source transaction is confirmed
    if (!currentResult.sourceChainConfirmed) {
      try {
        const receipt = await this.ethereumProvider.getTransactionReceipt(sourceTxHash);
        if (receipt && receipt.status === 1) {
          console.log('✅ Ethereum transaction confirmed');
          return {
            ...currentResult,
            status: 'locked',
            sourceChainConfirmed: true,
            currentStep: 'Tokens locked on Ethereum. Waiting for relayer...',
            estimatedCompletionTime: 45 // 45 seconds remaining
          };
        } else if (receipt && receipt.status === 0) {
          throw new Error('Ethereum transaction failed');
        }
        // Still pending
        return {
          ...currentResult,
          currentStep: 'Waiting for Ethereum confirmation...',
          estimatedCompletionTime: Math.max(30, currentResult.estimatedCompletionTime - 5)
        };
      } catch (error) {
        console.error('Error checking Ethereum transaction:', error);
        return currentResult;
      }
    }

    // Step 2: Check if relayer has processed the request
    if (currentResult.sourceChainConfirmed && !currentResult.destinationChainConfirmed) {
      try {
        // Look for BridgeRequestCreated event to get requestId
        const receipt = await this.ethereumProvider.getTransactionReceipt(sourceTxHash);
        if (receipt) {
          // Parse logs to find BridgeRequestCreated event
          const bridgeInterface = new ethers.Interface([
            'event BridgeRequestCreated(bytes32 indexed requestId, address indexed user, string destinationChain, string destinationAddress, uint256 amount, address indexed token, uint256 timestamp)'
          ]);

          for (const log of receipt.logs) {
            try {
              if (log.address.toLowerCase() === CONTRACT_ADDRESSES.ethereum.crossChainBridge.toLowerCase()) {
                const parsedLog = bridgeInterface.parseLog({
                  topics: log.topics,
                  data: log.data
                });
                
                if (parsedLog && parsedLog.name === 'BridgeRequestCreated') {
                  const requestId = parsedLog.args.requestId;
                  
                  // Check if request has been processed
                  const bridgeRequest = await this.ethereumBridge.getBridgeRequest(requestId);
                  
                  if (bridgeRequest.processed) {
                    console.log('✅ Bridge request processed by relayer');
                    return {
                      ...currentResult,
                      status: 'completed',
                      destinationChainConfirmed: true,
                      currentStep: '🎉 Bridge completed! Tokens released on Aptos',
                      estimatedCompletionTime: 0
                    };
                  } else {
                    // Still processing
                    return {
                      ...currentResult,
                      status: 'processing',
                      currentStep: 'Relayer processing transfer to Aptos...',
                      estimatedCompletionTime: Math.max(15, currentResult.estimatedCompletionTime - 5)
                    };
                  }
                }
              }
            } catch (parseError) {
              // Skip logs that don't match our interface
              continue;
            }
          }
        }
      } catch (error) {
        console.error('Error checking relayer progress:', error);
      }
      
      // Default: still processing
      return {
        ...currentResult,
        status: 'processing',
        currentStep: 'Relayer processing transfer to Aptos...',
        estimatedCompletionTime: Math.max(10, currentResult.estimatedCompletionTime - 5)
      };
    }

    return currentResult;
  }

  /**
   * Monitor Aptos → ETH bridge progress  
   */
  private async checkAptosToEthereumProgress(
    transferId: string,
    sourceTxHash: string,
    currentResult: BridgeMonitorResult
  ): Promise<BridgeMonitorResult> {
    
    // TODO: Implement Aptos → Ethereum monitoring
    // This would involve checking Aptos transaction status and Ethereum releases
    console.log('🚧 Aptos → Ethereum monitoring not yet implemented');
    
    return {
      ...currentResult,
      status: 'processing',
      currentStep: 'Aptos → Ethereum monitoring in development...'
    };
  }

  /**
   * Stop monitoring a transfer
   */
  stopMonitoring(transferId: string): void {
    const interval = this.monitoringIntervals.get(transferId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(transferId);
      console.log('🛑 Stopped monitoring transfer:', transferId);
    }
  }

  /**
   * Stop all monitoring
   */
  stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((interval, transferId) => {
      clearInterval(interval);
    });
    this.monitoringIntervals.clear();
    console.log('🛑 Stopped all bridge monitoring');
  }

  /**
   * Get bridge statistics
   */
  async getBridgeStats(): Promise<{
    ethereumReserves?: any;
    totalProcessed?: number;
    avgProcessingTime?: number;
  }> {
    try {
      if (!this.ethereumBridge) {
        return {};
      }

      const mockUSDCAddress = CONTRACT_ADDRESSES.ethereum.mockUSDC;
      const reserves = await this.ethereumBridge.getReserves(mockUSDCAddress);
      
      return {
        ethereumReserves: {
          balance: ethers.formatUnits(reserves.balance, 6),
          totalBridgedIn: ethers.formatUnits(reserves.totalBridgedIn, 6),
          totalBridgedOut: ethers.formatUnits(reserves.totalBridgedOut, 6),
          feesCollected: ethers.formatUnits(reserves.feesCollected, 6)
        }
      };
    } catch (error) {
      console.error('Error getting bridge stats:', error);
      return {};
    }
  }
}

// Export singleton instance
export const bridgeMonitor = new BridgeMonitorService();

export default bridgeMonitor;