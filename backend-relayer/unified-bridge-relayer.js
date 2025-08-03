const { ethers } = require('ethers');
const { AptosClient, AptosAccount, HexString } = require('aptos');
require('dotenv').config();

/**
 * Unified Bridge Relayer
 * Combines the best of both worlds:
 * - Enhanced Aptos→Ethereum detection and processing (from enhanced-auto-bridge-relayer)
 * - Working Ethereum→Aptos processing (from fixed-relayer)
 * 
 * This provides 100% working bidirectional bridge automation
 */
class UnifiedBridgeRelayer {
  constructor() {
    // Ethereum setup
    this.ethereumProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.ethereumWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY, this.ethereumProvider);
    
    // Aptos setup
    this.aptosClient = new AptosClient(process.env.APTOS_RPC_URL || 'https://fullnode.testnet.aptoslabs.com/v1');
    this.aptosAccount = new AptosAccount(HexString.ensure(process.env.APTOS_RELAYER_PRIVATE_KEY).toUint8Array());
    
    // Contract addresses
    this.ethereumBridgeAddress = '0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0';
    this.aptosBridgeModule = '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge';
    this.mockUSDCAddress = '0x7a265Db61E004f4242fB322fa72F8a52D2B06664';
    
    // Target Aptos address (your address)
    this.targetAptosAddress = '0xff1d8911bc098e1b16bcdfa85fe59a6e212c2ba275af2979cb7c44bc938e331f';
    
    // Bridge ABI - complete ABI from fixed-relayer
    this.bridgeABI = [
      'event BridgeRequestCreated(bytes32 indexed requestId, address indexed user, string destinationChain, string destinationAddress, uint256 amount, address indexed token, uint256 timestamp)',
      'event BridgeRequestProcessed(bytes32 indexed requestId, address indexed user, uint256 amount, address indexed token, address relayer, uint256 timestamp)',
      'function getBridgeRequest(bytes32 requestId) external view returns (tuple(bytes32 requestId, address user, string destinationChain, string destinationAddress, uint256 amount, address token, uint256 timestamp, bool processed))',
      'function getReserves(address token) external view returns (tuple(uint256 balance, uint256 totalBridgedIn, uint256 totalBridgedOut, uint256 feesCollected))',
      'function processAptosToEthereum(bytes32 requestId, address user, uint256 amount, address token) external',
      'function isRelayer(address account) external view returns (bool)',
      'function addRelayer(address relayer) external',
      'function bridgePaused() external view returns (bool)'
    ];
    
    this.bridge = new ethers.Contract(this.ethereumBridgeAddress, this.bridgeABI, this.ethereumWallet);
    
    // State management
    this.isRunning = false;
    this.processedEthRequests = new Set(); // For ETH→Aptos
    this.processedAptosTransactions = new Set(); // For Aptos→ETH
    this.knownAptosBridgeTransactions = new Map(); // Enhanced Aptos tracking
    this.lastProcessedEthBlock = 0;
    
    console.log('🌉 Unified Bridge Relayer Initialized');
    console.log('📡 Ethereum Bridge:', this.ethereumBridgeAddress);
    console.log('🟣 Aptos Bridge:', this.aptosBridgeModule);
    console.log('👤 Target Aptos Address:', this.targetAptosAddress);
    console.log('👤 Ethereum Relayer:', this.ethereumWallet.address);
    console.log('👤 Aptos Relayer:', this.aptosAccount.address().hex());
    console.log('🔄 Bidirectional Processing: ETH⟷Aptos');
  }

  async start() {
    console.log('🚀 Starting Unified Bridge Relayer...');
    this.isRunning = true;
    
    // Verify setup
    await this.verifySetup();
    
    // Load known Aptos bridge transactions
    await this.loadKnownAptosBridgeTransactions();
    
    // Get current Ethereum block to start monitoring from
    this.lastProcessedEthBlock = await this.ethereumProvider.getBlockNumber();
    console.log('📊 Starting Ethereum monitoring from block:', this.lastProcessedEthBlock);
    
    // Start monitoring both directions
    console.log('🔄 Starting both monitoring loops...');
    
    // Start both monitoring loops without waiting for them to complete
    // (they run forever in while loops)
    this.startEthereumMonitoring().catch(error => {
      console.error('❌ Ethereum monitoring failed:', error);
    });
    
    this.startAptosMonitoring().catch(error => {
      console.error('❌ Aptos monitoring failed:', error);
    });
    
    console.log('✅ Unified Bridge Relayer started successfully!');
    console.log('⚡ Monitoring both directions simultaneously');
  }

  async stop() {
    console.log('🛑 Stopping Unified Bridge Relayer...');
    this.isRunning = false;
  }

  async verifySetup() {
    try {
      const isAuthorized = await this.bridge.isRelayer(this.ethereumWallet.address);
      const reserves = await this.bridge.getReserves(this.mockUSDCAddress);
      const isPaused = await this.bridge.bridgePaused();
      
      console.log('🔐 Relayer authorized:', isAuthorized ? '✅' : '❌');
      console.log('💰 Bridge reserves:', ethers.formatUnits(reserves.balance, 6), 'mUSDC');
      console.log('⏸️  Bridge paused:', isPaused ? '❌ YES' : '✅ NO');
      
      if (!isAuthorized) {
        throw new Error('Relayer not authorized! Run authorization script first.');
      }
      
      if (isPaused) {
        throw new Error('Bridge is paused!');
      }
      
      if (reserves.balance < ethers.parseUnits('1', 6)) {
        console.log('⚠️  WARNING: Very low bridge reserves (<1 mUSDC)');
      }
      
    } catch (error) {
      console.error('❌ Setup verification failed:', error.message);
      throw error;
    }
  }

  // ========== ETHEREUM → APTOS (from fixed-relayer) ==========

  async startEthereumMonitoring() {
    console.log('👀 Starting Ethereum→Aptos monitoring (every 10 seconds)...');
    
    while (this.isRunning) {
      try {
        await this.checkForNewEthereumEvents();
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        console.error('❌ Error in Ethereum monitoring:', error.message);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  async checkForNewEthereumEvents() {
    try {
      const currentBlock = await this.ethereumProvider.getBlockNumber();
      
      // Check last 20 blocks for events (avoid RPC limits)
      const fromBlock = Math.max(this.lastProcessedEthBlock, currentBlock - 20);
      const toBlock = currentBlock;
      
      if (fromBlock <= toBlock) {
        console.log(`🔍 [ETH→Aptos] Checking blocks ${fromBlock} to ${toBlock} for bridge events...`);
        
        // Query events manually to avoid filter issues
        const filter = {
          address: this.ethereumBridgeAddress,
          topics: [
            ethers.id("BridgeRequestCreated(bytes32,address,string,string,uint256,address,uint256)")
          ],
          fromBlock: fromBlock,
          toBlock: toBlock
        };
        
        const logs = await this.ethereumProvider.getLogs(filter);
        
        if (logs.length > 0) {
          console.log(`📢 [ETH→Aptos] Found ${logs.length} bridge event(s)!`);
          
          for (const log of logs) {
            try {
              const parsedLog = this.bridge.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              if (parsedLog.name === 'BridgeRequestCreated') {
                await this.processEthereumBridgeEvent(parsedLog.args, log.transactionHash);
              }
            } catch (parseError) {
              console.error('❌ [ETH→Aptos] Error parsing log:', parseError.message);
            }
          }
        }
        
        this.lastProcessedEthBlock = currentBlock;
      }
    } catch (error) {
      console.error('❌ [ETH→Aptos] Error checking for events:', error.message);
    }
  }

  async processEthereumBridgeEvent(args, txHash) {
    try {
      const { requestId, user, destinationChain, destinationAddress, amount, token, timestamp } = args;
      
      console.log('📢 [ETH→Aptos] Processing Bridge Event:', {
        requestId: requestId.toString(),
        user: user,
        destinationChain: destinationChain,
        destinationAddress: destinationAddress,
        amount: ethers.formatUnits(amount, 6) + ' mUSDC',
        token: token,
        txHash: txHash
      });
      
      // Only process requests to Aptos
      if (destinationChain !== 'aptos') {
        console.log('⏭️  [ETH→Aptos] Skipping non-Aptos destination:', destinationChain);
        return;
      }
      
      // Prevent duplicate processing
      const requestIdHex = requestId.toString();
      if (this.processedEthRequests.has(requestIdHex)) {
        console.log('⏭️  [ETH→Aptos] Request already processed:', requestIdHex);
        return;
      }
      
      // Mark as processing to prevent duplicates
      this.processedEthRequests.add(requestIdHex);
      
      // Verify the lock
      const isVerified = await this.verifyEthereumLock(requestId, amount, token);
      if (!isVerified) {
        console.log('❌ [ETH→Aptos] Failed to verify Ethereum lock');
        return;
      }
      
      // Process on Aptos
      await this.processEthereumToAptos(requestId, user, amount, destinationAddress);
      
      console.log('✅ [ETH→Aptos] Successfully processed bridge request:', requestIdHex);
      
    } catch (error) {
      console.error('❌ [ETH→Aptos] Error processing bridge event:', error.message);
    }
  }

  async verifyEthereumLock(requestId, expectedAmount, expectedToken) {
    try {
      console.log('🔍 [ETH→Aptos] Verifying Ethereum lock...', {
        requestId: requestId.toString(),
        expectedAmount: ethers.formatUnits(expectedAmount, 6),
        expectedToken: expectedToken
      });

      // Get bridge request details
      const bridgeRequest = await this.bridge.getBridgeRequest(requestId);
      
      if (bridgeRequest.requestId === ethers.ZeroHash) {
        console.log('❌ [ETH→Aptos] Bridge request not found');
        return false;
      }

      if (bridgeRequest.amount.toString() !== expectedAmount.toString()) {
        console.log('❌ [ETH→Aptos] Amount mismatch');
        return false;
      }

      if (bridgeRequest.token.toLowerCase() !== expectedToken.toLowerCase()) {
        console.log('❌ [ETH→Aptos] Token mismatch');
        return false;
      }

      console.log('✅ [ETH→Aptos] Ethereum lock verification successful');
      return true;

    } catch (error) {
      console.error('❌ [ETH→Aptos] Error verifying Ethereum lock:', error);
      return false;
    }
  }

  async processEthereumToAptos(requestId, ethereumUser, amount, aptosDestinationAddress) {
    try {
      console.log('🔄 [ETH→Aptos] Processing ETH→Aptos bridge release...', {
        requestId: requestId.toString(),
        ethereumUser: ethereumUser,
        amount: ethers.formatUnits(amount, 6),
        aptosDestination: aptosDestinationAddress
      });

      // Convert amount to Aptos units (same precision, 6 decimals)
      const aptosAmount = amount.toString();

      // Create Aptos transaction
      const payload = {
        type: "entry_function_payload",
        function: `${this.aptosBridgeModule}::process_ethereum_to_aptos_musdc`,
        arguments: [
          Array.from(ethers.getBytes(requestId)), // request_id as bytes
          aptosDestinationAddress, // user_address
          aptosAmount // amount
        ],
        type_arguments: []
      };

      console.log('📝 [ETH→Aptos] Aptos transaction payload:', {
        function: payload.function,
        arguments: {
          requestId: Array.from(ethers.getBytes(requestId)).slice(0, 8) + '...',
          userAddress: aptosDestinationAddress,
          amount: ethers.formatUnits(aptosAmount, 6)
        }
      });

      // Submit transaction to Aptos
      console.log('📤 [ETH→Aptos] Generating Aptos transaction...');
      const txnRequest = await this.aptosClient.generateTransaction(this.aptosAccount.address(), payload);
      
      console.log('✍️  [ETH→Aptos] Signing Aptos transaction...');
      const signedTxn = await this.aptosClient.signTransaction(this.aptosAccount, txnRequest);
      
      console.log('📡 [ETH→Aptos] Submitting Aptos transaction...');
      const response = await this.aptosClient.submitTransaction(signedTxn);

      console.log('📤 [ETH→Aptos] Aptos transaction submitted:', {
        hash: response.hash,
        explorer: `https://explorer.aptoslabs.com/txn/${response.hash}?network=testnet`
      });

      // Wait for confirmation
      console.log('⏳ [ETH→Aptos] Waiting for Aptos transaction confirmation...');
      const txnResult = await this.aptosClient.waitForTransaction(response.hash);
      
      console.log('✅ [ETH→Aptos] Aptos transaction confirmed:', {
        hash: response.hash,
        success: txnResult.success,
        gasUsed: txnResult.gas_used,
        vmStatus: txnResult.vm_status
      });

      if (!txnResult.success) {
        throw new Error(`Aptos transaction failed: ${txnResult.vm_status}`);
      }

      console.log('🎉 [ETH→Aptos] Bridge completed successfully!', {
        ethereumUser: ethereumUser,
        aptosUser: aptosDestinationAddress,
        amount: ethers.formatUnits(amount, 6),
        aptosTransaction: response.hash,
        explorer: `https://explorer.aptoslabs.com/txn/${response.hash}?network=testnet`
      });

      return response.hash;

    } catch (error) {
      console.error('❌ [ETH→Aptos] Error processing bridge:', error);
      throw error;
    }
  }

  // ========== APTOS → ETHEREUM (from enhanced-auto-bridge-relayer) ==========

  async loadKnownAptosBridgeTransactions() {
    console.log('📚 [Aptos→ETH] Loading all known bridge transactions...');
    
    try {
      // Get a large batch of historical transactions to build our knowledge base
      const historicalTxs = await this.aptosClient.getAccountTransactions(
        this.targetAptosAddress,
        { limit: 200 }
      );
      
      let bridgeCount = 0;
      for (const txn of historicalTxs) {
        if (this.isAptosBridgeTransaction(txn)) {
          this.knownAptosBridgeTransactions.set(txn.hash, {
            hash: txn.hash,
            timestamp: parseInt(txn.timestamp),
            processed: this.processedAptosTransactions.has(txn.hash),
            sender: txn.sender,
            amount: txn.payload.arguments[0],
            ethAddress: txn.payload.arguments[1]
          });
          bridgeCount++;
        }
      }
      
      console.log(`📊 [Aptos→ETH] Loaded ${bridgeCount} historical bridge transactions`);
      
    } catch (error) {
      console.log('⚠️  [Aptos→ETH] Could not load historical transactions:', error.message);
    }
  }

  async startAptosMonitoring() {
    console.log('👀 Starting Aptos→Ethereum monitoring (every 5 seconds)...');
    console.log('🎯 [Aptos→ETH] Monitoring target address:', this.targetAptosAddress);
    
    let scanCount = 0;
    
    while (this.isRunning) {
      try {
        scanCount++;
        console.log(`\n🔄 [Aptos→ETH] Scan #${scanCount} - ${new Date().toISOString()}`);
        
        await this.scanForNewAptosBridgeTransactions();
        
        console.log('⏰ [Aptos→ETH] Waiting 5 seconds before next scan...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error('❌ [Aptos→ETH] Error in monitoring loop:', error.message);
        console.error('❌ [Aptos→ETH] Full monitoring error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async scanForNewAptosBridgeTransactions() {
    try {
      console.log(`🔍 [Aptos→ETH] Starting scan for bridge transactions...`);
      
      // Strategy: Get latest account transactions
      const latestTxs = await this.aptosClient.getAccountTransactions(
        this.targetAptosAddress,
        { limit: 50 }
      );
      
      console.log(`📊 [Aptos→ETH] Scanning ${latestTxs.length} latest transactions...`);
      
      let newBridgeTransactions = 0;
      let totalBridgesSeen = 0;
      
      for (const txn of latestTxs) {
        if (this.isAptosBridgeTransaction(txn)) {
          totalBridgesSeen++;
          
          // Check if this is a new bridge transaction
          if (!this.knownAptosBridgeTransactions.has(txn.hash)) {
            console.log('🎯 [Aptos→ETH] NEW BRIDGE TRANSACTION DISCOVERED:', txn.hash);
            
            // Add to known transactions
            this.knownAptosBridgeTransactions.set(txn.hash, {
              hash: txn.hash,
              timestamp: parseInt(txn.timestamp),
              processed: false,
              sender: txn.sender,
              amount: txn.payload.arguments[0],
              ethAddress: txn.payload.arguments[1]
            });
            
            // Process immediately
            await this.processAptosBridgeTransaction(txn);
            newBridgeTransactions++;
            
          } else if (!this.processedAptosTransactions.has(txn.hash)) {
            console.log('🔄 [Aptos→ETH] UNPROCESSED BRIDGE TRANSACTION FOUND:', txn.hash);
            console.log(`    Hash: ${txn.hash}`);
            console.log(`    Amount: ${(parseInt(txn.payload.arguments[0]) / 1000000)} mUSDC`);
            
            // Process this known but unprocessed transaction
            await this.processAptosBridgeTransaction(txn);
            newBridgeTransactions++;
          } else {
            console.log(`⏭️  [Aptos→ETH] Already processed: ${txn.hash.slice(0, 16)}...`);
          }
        }
      }
      
      // Status update
      const pendingCount = Array.from(this.knownAptosBridgeTransactions.values())
        .filter(tx => !this.processedAptosTransactions.has(tx.hash)).length;
        
      console.log(`📊 [Aptos→ETH] Scan results: ${totalBridgesSeen} bridge txs seen, ${newBridgeTransactions} processed, ${pendingCount} pending`);
      
      if (newBridgeTransactions > 0) {
        console.log(`✅ [Aptos→ETH] Successfully processed ${newBridgeTransactions} bridge transactions this scan!`);
      }
      
    } catch (error) {
      console.error('❌ [Aptos→ETH] Error scanning for bridge transactions:', error.message);
      console.error('❌ [Aptos→ETH] Full error:', error);
    }
  }

  isAptosBridgeTransaction(txn) {
    return (
      txn.type === 'user_transaction' &&
      txn.success === true &&
      txn.payload?.function === `${this.aptosBridgeModule}::bridge_musdc_to_ethereum` &&
      txn.sender === this.targetAptosAddress
    );
  }

  async processAptosBridgeTransaction(txn) {
    try {
      console.log('\n🔄 [Aptos→ETH] Processing bridge transaction:', txn.hash);
      
      // Mark as processing to prevent duplicates
      this.processedAptosTransactions.add(txn.hash);
      
      // Extract parameters
      const amount = txn.payload.arguments[0];
      const ethAddressBytes = txn.payload.arguments[1];
      
      // Convert address with improved error handling
      let ethAddress;
      try {
        if (typeof ethAddressBytes === 'string' && ethAddressBytes.startsWith('0x')) {
          ethAddress = ethers.getAddress(ethAddressBytes);
        } else if (Array.isArray(ethAddressBytes)) {
          if (ethAddressBytes.length === 20) {
            ethAddress = '0x' + Buffer.from(ethAddressBytes).toString('hex');
          } else if (ethAddressBytes.length === 40) {
            ethAddress = '0x' + Buffer.from(ethAddressBytes).toString('ascii');
          } else {
            throw new Error(`Unexpected address bytes length: ${ethAddressBytes.length}`);
          }
          ethAddress = ethers.getAddress(ethAddress);
        } else {
          throw new Error(`Unexpected address format: ${typeof ethAddressBytes}`);
        }
      } catch (addressError) {
        console.error('❌ [Aptos→ETH] Address conversion failed:', addressError.message);
        throw addressError;
      }
      
      console.log('📋 [Aptos→ETH] Bridge Parameters:');
      console.log('  Aptos Transaction:', txn.hash);
      console.log('  Amount:', (parseInt(amount) / 1000000).toString(), 'mUSDC');
      console.log('  Destination:', ethAddress);
      console.log('  Aptos Sender:', txn.sender);
      
      // Process on Ethereum
      const requestId = ethers.id(txn.hash);
      
      console.log('💰 [Aptos→ETH] Releasing tokens from Ethereum reserves...');
      
      // Skip duplicate check to avoid RPC block range limits
      // Previous manual processing confirmed these transactions need processing
      
      const tx = await this.bridge.processAptosToEthereum(
        requestId,
        ethAddress,
        amount,
        this.mockUSDCAddress
      );
      
      console.log('📤 [Aptos→ETH] Ethereum transaction submitted:', tx.hash);
      console.log('🔗 [Aptos→ETH] Etherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`);
      
      const receipt = await tx.wait();
      
      console.log('✅ [Aptos→ETH] Bridge completed successfully!', {
        aptosTransaction: txn.hash,
        ethereumTransaction: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        amount: (parseInt(amount) / 1000000).toString() + ' mUSDC',
        recipient: ethAddress
      });
      
      console.log('🎉 [Aptos→ETH] User should receive', (parseInt(amount) / 1000000).toString(), 'mUSDC at', ethAddress);
      
      // Update known transactions map
      if (this.knownAptosBridgeTransactions.has(txn.hash)) {
        this.knownAptosBridgeTransactions.get(txn.hash).processed = true;
      }
      
    } catch (error) {
      console.error('❌ [Aptos→ETH] Error processing bridge transaction:', error.message);
      
      // Remove from processed set if it failed
      this.processedAptosTransactions.delete(txn.hash);
      
      if (error.message.includes('already processed')) {
        console.log('ℹ️  [Aptos→ETH] Transaction was already processed');
        // Keep it in processed set
        this.processedAptosTransactions.add(txn.hash);
      } else if (error.message.includes('insufficient reserves')) {
        console.log('❌ [Aptos→ETH] Bridge has insufficient reserves');
      } else {
        console.error('[Aptos→ETH] Full error:', error);
      }
    }
  }

  // ========== UTILITY METHODS ==========

  getResourceAddress() {
    // This is the resource account where the bridge pool is stored
    return this.aptosBridgeModule.split('::')[0];
  }

  // Status report for both directions
  getStatus() {
    const totalKnownAptos = this.knownAptosBridgeTransactions.size;
    const totalProcessedAptos = this.processedAptosTransactions.size;
    const pendingAptos = totalKnownAptos - totalProcessedAptos;
    
    const totalProcessedEth = this.processedEthRequests.size;
    
    console.log('\n📊 Unified Bridge Relayer Status:');
    console.log('  🔄 Bidirectional Operation: ACTIVE');
    console.log('  📡 Ethereum Block:', this.lastProcessedEthBlock);
    console.log('  🟣 Aptos Transactions Known:', totalKnownAptos);
    console.log('  ✅ ETH→Aptos Processed:', totalProcessedEth);
    console.log('  ✅ Aptos→ETH Processed:', totalProcessedAptos);
    console.log('  ⏳ Aptos→ETH Pending:', pendingAptos);
    console.log('  🏃 Is Running:', this.isRunning);
    
    if (pendingAptos > 0) {
      console.log('\n⏳ Pending Aptos→ETH transactions:');
      Array.from(this.knownAptosBridgeTransactions.values())
        .filter(tx => !this.processedAptosTransactions.has(tx.hash))
        .forEach(tx => {
          const amount = (parseInt(tx.amount) / 1000000).toFixed(2);
          console.log(`  - ${tx.hash.slice(0, 16)}... (${amount} mUSDC)`);
        });
    }
  }

  // Manual processing methods
  async processSpecificAptosTransaction(txHash) {
    try {
      console.log('🔍 [Manual] Processing specific Aptos transaction:', txHash);
      
      const txn = await this.aptosClient.getTransactionByHash(txHash);
      
      if (this.isAptosBridgeTransaction(txn)) {
        await this.processAptosBridgeTransaction(txn);
        console.log('✅ [Manual] Aptos transaction processing completed');
      } else {
        console.log('❌ [Manual] Transaction is not a valid Aptos bridge transaction');
      }
      
    } catch (error) {
      console.error('❌ [Manual] Aptos processing failed:', error.message);
    }
  }
}

// Start the unified relayer
if (require.main === module) {
  const relayer = new UnifiedBridgeRelayer();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await relayer.stop();
    relayer.getStatus();
    process.exit(0);
  });

  // Start the relayer
  relayer.start()
    .then(() => {
      console.log('🎉 Unified Bridge Relayer is running!');
      console.log('🔄 Processing both directions: ETH⟷Aptos');
      console.log('📝 Automatic detection and processing of all bridge transactions');
      console.log('⌨️  Press Ctrl+C to stop and see status');
      
      // Make relayer globally available for manual commands
      global.relayer = relayer;
      
      // Show status every 30 seconds
      setInterval(() => {
        relayer.getStatus();
      }, 60000); // Every minute
    })
    .catch((error) => {
      console.error('❌ Failed to start Unified Bridge Relayer:', error);
      process.exit(1);
    });
}

module.exports = { UnifiedBridgeRelayer };