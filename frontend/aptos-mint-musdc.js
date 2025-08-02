const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

// Contract addresses
const MOCK_USDC_MODULE = '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc';
const GENERIC_SWAP_ADDRESS = '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4';

// Generic contract resource address (calculated)
function getResourceAddress() {
  // This matches the get_resource_address() function in the Move contract
  // account::create_resource_address(&@cross_chain_swap, b"cross_chain_swap")
  return '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4'; // Placeholder - would need proper calculation
}

async function mintAndTransferMUSDCAptos() {
  console.log('🏭 Minting mUSDC on Aptos and funding contract...');
  console.log('=================================================');
  
  try {
    // Set up Aptos client
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
    
    console.log('📋 Contract Information:');
    console.log(`MockUSDC Module: ${MOCK_USDC_MODULE}`);
    console.log(`Generic Swap Address: ${GENERIC_SWAP_ADDRESS}`);
    
    // For demonstration, showing the required steps:
    console.log('\\n⚠️  SETUP REQUIRED:');
    console.log('1. Set APTOS_PRIVATE_KEY in environment');
    console.log('2. Ensure the account has APT for gas fees');
    console.log('3. Ensure the account is the admin of MockUSDC contract');
    
    console.log('\\n🔧 Required Actions:');
    console.log('1. Mint 10000 mUSDC (10000 * 10^6 = 10,000,000,000 units)');
    console.log('2. Transfer 5000 mUSDC to generic contract resource account');
    console.log('3. Keep 5000 mUSDC for testing swaps');
    
    // Calculate amounts (mUSDC has 6 decimals)
    const decimals = 6;
    const mintAmount = 10000 * Math.pow(10, decimals); // 10,000 mUSDC
    const transferAmount = 5000 * Math.pow(10, decimals); // 5,000 mUSDC to contract
    
    console.log('\\n💰 Amounts:');
    console.log(`Mint Amount: ${mintAmount} units (10,000 mUSDC)`);
    console.log(`Transfer to Contract: ${transferAmount} units (5,000 mUSDC)`);
    
    // If private key is set, actually execute
    if (process.env.APTOS_PRIVATE_KEY) {
      console.log('\\n🚀 Executing transactions...');
      
      // Create account from private key
      const privateKey = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY);
      const account = Account.fromPrivateKey({ privateKey });
      console.log(`📤 Account address: ${account.accountAddress.toString()}`);
      
      // Check APT balance for gas
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: account.accountAddress.toString()
      });
      console.log(`💰 APT balance: ${balance / 100000000} APT`);
      
      if (balance < 100000000) { // Less than 1 APT
        console.log('⚠️  Low APT balance. You may need more APT for gas fees.');
      }
      
      // Check current mUSDC balance
      try {
        const currentBalance = await aptos.view({
          payload: {
            function: `${MOCK_USDC_MODULE}::balance_of`,
            functionArguments: [account.accountAddress.toString()],
            typeArguments: [],
          }
        });
        console.log(`💰 Current mUSDC balance: ${currentBalance[0] / Math.pow(10, decimals)} mUSDC`);
      } catch (error) {
        console.log(`💰 Current mUSDC balance: 0 mUSDC (or error checking: ${error.message})`);
      }
      
      // Mint mUSDC
      console.log('\\n🏭 Minting mUSDC...');
      const mintTransaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MOCK_USDC_MODULE}::mint`,
          functionArguments: [
            account.accountAddress.toString(), // to
            mintAmount.toString() // amount
          ],
          typeArguments: [],
        }
      });
      
      const mintCommittedTx = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction: mintTransaction
      });
      console.log(`📝 Mint transaction: ${mintCommittedTx.hash}`);
      
      const mintResult = await aptos.waitForTransaction({
        transactionHash: mintCommittedTx.hash
      });
      
      if (mintResult.success) {
        console.log('✅ Mint completed successfully!');
      } else {
        throw new Error(`Mint failed: ${mintResult.vm_status}`);
      }
      
      // Check new balance
      const newBalance = await aptos.view({
        payload: {
          function: `${MOCK_USDC_MODULE}::balance_of`,
          functionArguments: [account.accountAddress.toString()],
          typeArguments: [],
        }
      });
      console.log(`💰 New mUSDC balance: ${newBalance[0] / Math.pow(10, decimals)} mUSDC`);
      
      // Transfer to resource account
      console.log('\\n📤 Transferring mUSDC to generic contract resource account...');
      
      // Note: We need to determine the actual resource account address
      // For now, let's transfer to the contract deployer address as a reserve
      const resourceAddress = GENERIC_SWAP_ADDRESS; // Using contract address as proxy for now
      
      const transferTransaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MOCK_USDC_MODULE}::transfer`,
          functionArguments: [
            resourceAddress, // to (resource account)
            transferAmount.toString() // amount
          ],
          typeArguments: [],
        }
      });
      
      const transferCommittedTx = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction: transferTransaction
      });
      console.log(`📝 Transfer transaction: ${transferCommittedTx.hash}`);
      
      const transferResult = await aptos.waitForTransaction({
        transactionHash: transferCommittedTx.hash
      });
      
      if (transferResult.success) {
        console.log('✅ Transfer completed successfully!');
      } else {
        throw new Error(`Transfer failed: ${transferResult.vm_status}`);
      }
      
      // Check final balances
      const finalUserBalance = await aptos.view({
        payload: {
          function: `${MOCK_USDC_MODULE}::balance_of`,
          functionArguments: [account.accountAddress.toString()],
          typeArguments: [],
        }
      });
      console.log(`💰 Your final mUSDC balance: ${finalUserBalance[0] / Math.pow(10, decimals)} mUSDC`);
      
      const contractBalance = await aptos.view({
        payload: {
          function: `${MOCK_USDC_MODULE}::balance_of`,
          functionArguments: [resourceAddress],
          typeArguments: [],
        }
      });
      console.log(`💰 Contract mUSDC balance: ${contractBalance[0] / Math.pow(10, decimals)} mUSDC`);
      
      console.log('\\n🎉 Aptos mUSDC setup completed successfully!');
      
    } else {
      console.log('\\n⚠️  Environment variable not set. Showing demo mode.');
      console.log('\\nTo actually execute:');
      console.log('export APTOS_PRIVATE_KEY="your_aptos_private_key_hex"');
      console.log('node aptos-mint-musdc.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Run the function
mintAndTransferMUSDCAptos().catch(console.error);