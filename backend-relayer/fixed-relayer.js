const { ethers } = require('ethers');
const { AptosClient, AptosAccount, HexString } = require('aptos');

// Ensure dotenv is loaded
require('dotenv').config();

/**
 * Fixed Cross-Chain Bridge Relayer
 * Focuses on reliable event detection and processing
 */
class FixedBridgeRelayer {
  constructor() {
    // Ethereum setup
    this.ethereumProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.ethereumWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.ethereumProvider);
    
    // Aptos setup
    this.aptosClient = new AptosClient(process.env.APTOS_RPC_URL);
    this.aptosAccount = new AptosAccount(HexString.ensure(process.env.APTOS_RELAYER_PRIVATE_KEY).toUint8Array());
    
    // Contract addresses
    this.ethereumBridgeAddress = '0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0';
    this.aptosBridgeModule = '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge';
    this.mockUSDCAddress = '0x7a265Db61E004f4242fB322fa72F8a52D2B06664';
    
    // Contract ABIs
    this.ethereumBridgeABI = [
      'event BridgeRequestCreated(bytes32 indexed requestId, address indexed user, string destinationChain, string destinationAddress, uint256 amount, address indexed token, uint256 timestamp)',
      'function getBridgeRequest(bytes32 requestId) external view returns (tuple(bytes32 requestId, address user, string destinationChain, string destinationAddress, uint256 amount, address token, uint256 timestamp, bool processed))',
      'function getReserves(address token) external view returns (tuple(uint256 balance, uint256 totalBridgedIn, uint256 totalBridgedOut, uint256 feesCollected))'
    ];
    
    this.ethereumBridge = new ethers.Contract(this.ethereumBridgeAddress, this.ethereumBridgeABI, this.ethereumWallet);
    
    this.isRunning = false;
    this.processedRequests = new Set();
    this.lastProcessedBlock = 0;
    
    console.log('🌉 Fixed Bridge Relayer initialized');
    console.log('📡 Ethereum Bridge:', this.ethereumBridgeAddress);
    console.log('🟣 Aptos Bridge:', this.aptosBridgeModule);
    console.log('👤 Ethereum Relayer:', this.ethereumWallet.address);
    console.log('👤 Aptos Relayer:', this.aptosAccount.address().hex());
  }

  async start() {
    console.log('🚀 Starting Fixed Cross-Chain Bridge Relayer...');
    this.isRunning = true;
    
    // Get current block to start monitoring from
    this.lastProcessedBlock = await this.ethereumProvider.getBlockNumber();
    console.log('📊 Starting from block:', this.lastProcessedBlock);
    
    // Start monitoring with polling instead of filters
    this.startPollingForEvents();
  }

  async stop() {
    console.log('🛑 Stopping Bridge Relayer...');
    this.isRunning = false;
  }

  /**
   * Poll for events instead of using problematic filters
   */
  async startPollingForEvents() {
    console.log('👀 Starting event polling (every 10 seconds)...');
    
    const pollInterval = 10000; // 10 seconds
    
    while (this.isRunning) {
      try {
        await this.checkForNewEvents();
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('❌ Error in event polling:', error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
  }

  /**
   * Check for new bridge events by querying recent blocks
   */
  async checkForNewEvents() {
    try {
      const currentBlock = await this.ethereumProvider.getBlockNumber();
      
      // Check last 20 blocks for events (avoid RPC limits)
      const fromBlock = Math.max(this.lastProcessedBlock, currentBlock - 20);
      const toBlock = currentBlock;
      
      if (fromBlock <= toBlock) {
        console.log(`🔍 Checking blocks ${fromBlock} to ${toBlock} for bridge events...`);
        
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
          console.log(`📢 Found ${logs.length} bridge event(s)!`);
          
          for (const log of logs) {
            try {
              const parsedLog = this.ethereumBridge.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              if (parsedLog.name === 'BridgeRequestCreated') {
                await this.processBridgeEvent(parsedLog.args, log.transactionHash);
              }
            } catch (parseError) {
              console.error('❌ Error parsing log:', parseError.message);
            }
          }
        }
        
        this.lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      console.error('❌ Error checking for events:', error.message);
    }
  }

  /**
   * Process a bridge event
   */
  async processBridgeEvent(args, txHash) {
    try {
      const { requestId, user, destinationChain, destinationAddress, amount, token, timestamp } = args;
      
      console.log('📢 Processing Bridge Event:', {
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
        console.log('⏭️  Skipping non-Aptos destination:', destinationChain);
        return;
      }
      
      // Prevent duplicate processing
      const requestIdHex = requestId.toString();
      if (this.processedRequests.has(requestIdHex)) {
        console.log('⏭️  Request already processed:', requestIdHex);
        return;
      }
      
      // Mark as processing to prevent duplicates
      this.processedRequests.add(requestIdHex);
      
      // Verify the lock
      const isVerified = await this.verifyEthereumLock(requestId, amount, token);
      if (!isVerified) {
        console.log('❌ Failed to verify Ethereum lock');
        return;
      }
      
      // Process on Aptos
      await this.processEthereumToAptos(requestId, user, amount, destinationAddress);
      
      console.log('✅ Successfully processed bridge request:', requestIdHex);
      
    } catch (error) {
      console.error('❌ Error processing bridge event:', error.message);
    }
  }

  /**
   * Verify Ethereum lock
   */
  async verifyEthereumLock(requestId, expectedAmount, expectedToken) {
    try {
      console.log('🔍 Verifying Ethereum lock...', {
        requestId: requestId.toString(),
        expectedAmount: ethers.formatUnits(expectedAmount, 6),
        expectedToken: expectedToken
      });

      // Get bridge request details
      const bridgeRequest = await this.ethereumBridge.getBridgeRequest(requestId);
      
      if (bridgeRequest.requestId === ethers.ZeroHash) {
        console.log('❌ Bridge request not found');
        return false;
      }

      if (bridgeRequest.amount.toString() !== expectedAmount.toString()) {
        console.log('❌ Amount mismatch');
        return false;
      }

      if (bridgeRequest.token.toLowerCase() !== expectedToken.toLowerCase()) {
        console.log('❌ Token mismatch');
        return false;
      }

      console.log('✅ Ethereum lock verification successful');
      return true;

    } catch (error) {
      console.error('❌ Error verifying Ethereum lock:', error);
      return false;
    }
  }

  /**
   * Process ETH → Aptos bridge
   */
  async processEthereumToAptos(requestId, ethereumUser, amount, aptosDestinationAddress) {
    try {
      console.log('🔄 Processing ETH→Aptos bridge release...', {
        requestId: requestId.toString(),
        ethereumUser: ethereumUser,
        amount: ethers.formatUnits(amount, 6),
        aptosDestination: aptosDestinationAddress
      });

      // Convert amount to Aptos units (same precision, 6 decimals)
      const aptosAmount = amount.toString();

      console.log('🏦 Checking Aptos bridge reserves before transfer...');
      try {
        const resourceAddress = this.getResourceAddress();
        const bridgeResource = await this.aptosClient.getAccountResource(
          resourceAddress,
          `${this.aptosBridgeModule.split('::')[0]}::cross_chain_bridge::BridgePool`
        );
        console.log('📊 Current Aptos bridge reserves:', {
          mUSDC: bridgeResource.data.musdc_reserves,
          APT: bridgeResource.data.apt_reserves
        });

        if (parseInt(bridgeResource.data.musdc_reserves) < parseInt(aptosAmount)) {
          throw new Error(`Insufficient Aptos bridge reserves: ${bridgeResource.data.musdc_reserves} < ${aptosAmount}`);
        }
      } catch (resourceError) {
        console.log('⚠️  Could not check bridge reserves:', resourceError.message);
      }

      console.log('💰 Checking user balance before transfer...');
      try {
        const userBalance = await this.aptosClient.getAccountResource(
          aptosDestinationAddress,
          `0x1::coin::CoinStore<${this.aptosBridgeModule.split('::')[0]}::mock_usdc::MockUSDC>`
        );
        console.log('👤 User mUSDC balance before:', userBalance.data.coin.value);
      } catch (balanceError) {
        console.log('⚠️  Could not check user balance (may not have mUSDC yet):', balanceError.message);
      }

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

      console.log('📝 Aptos transaction payload:', {
        function: payload.function,
        arguments: {
          requestId: Array.from(ethers.getBytes(requestId)).slice(0, 8) + '...',
          userAddress: aptosDestinationAddress,
          amount: ethers.formatUnits(aptosAmount, 6)
        }
      });

      console.log('🔐 Relayer account info:', {
        address: this.aptosAccount.address().hex(),
        isAuthorized: 'Checking...'
      });

      // Submit transaction to Aptos
      console.log('📤 Generating Aptos transaction...');
      const txnRequest = await this.aptosClient.generateTransaction(this.aptosAccount.address(), payload);
      
      console.log('✍️  Signing Aptos transaction...');
      const signedTxn = await this.aptosClient.signTransaction(this.aptosAccount, txnRequest);
      
      console.log('📡 Submitting Aptos transaction...');
      const response = await this.aptosClient.submitTransaction(signedTxn);

      console.log('📤 Aptos transaction submitted:', {
        hash: response.hash,
        explorer: `https://explorer.aptoslabs.com/txn/${response.hash}?network=testnet`
      });

      // Wait for confirmation
      console.log('⏳ Waiting for Aptos transaction confirmation...');
      const txnResult = await this.aptosClient.waitForTransaction(response.hash);
      
      console.log('✅ Aptos transaction confirmed:', {
        hash: response.hash,
        success: txnResult.success,
        gasUsed: txnResult.gas_used,
        vmStatus: txnResult.vm_status
      });

      if (!txnResult.success) {
        throw new Error(`Aptos transaction failed: ${txnResult.vm_status}`);
      }

      // Check user balance after transfer
      console.log('💰 Checking user balance after transfer...');
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        const userBalanceAfter = await this.aptosClient.getAccountResource(
          aptosDestinationAddress,
          `0x1::coin::CoinStore<${this.aptosBridgeModule.split('::')[0]}::mock_usdc::MockUSDC>`
        );
        console.log('👤 User mUSDC balance after:', userBalanceAfter.data.coin.value);
      } catch (balanceError) {
        console.log('⚠️  Could not check user balance after transfer:', balanceError.message);
      }

      console.log('🎉 ETH→Aptos bridge completed successfully!', {
        ethereumUser: ethereumUser,
        aptosUser: aptosDestinationAddress,
        amount: ethers.formatUnits(amount, 6),
        aptosTransaction: response.hash,
        explorer: `https://explorer.aptoslabs.com/txn/${response.hash}?network=testnet`
      });

      return response.hash;

    } catch (error) {
      console.error('❌ Error processing ETH→Aptos bridge:', error);
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Get resource address for bridge
   */
  getResourceAddress() {
    // This is the resource account where the bridge pool is stored
    // Based on the Move contract: account::create_resource_address(&@cross_chain_swap, b"bridge_reserves")
    return this.aptosBridgeModule.split('::')[0]; // Use the main account for now
  }
}

// Start the fixed relayer
if (require.main === module) {
  const relayer = new FixedBridgeRelayer();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await relayer.stop();
    process.exit(0);
  });

  // Start the relayer
  relayer.start()
    .then(() => {
      console.log('✅ Fixed Bridge Relayer started successfully');
    })
    .catch((error) => {
      console.error('❌ Failed to start Fixed Bridge Relayer:', error);
      process.exit(1);
    });
}

module.exports = { FixedBridgeRelayer };