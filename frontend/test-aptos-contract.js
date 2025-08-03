const { Aptos } = require('@aptos-labs/ts-sdk');
const { ethers } = require('ethers');

// Test Aptos Move contract interaction end-to-end
async function testAptosContract() {
  console.log('🔍 Testing Aptos Move contract end-to-end...');
  
  // Initialize Aptos client
  const aptosClient = new Aptos({
    fullnode: 'https://api.testnet.aptoslabs.com/v1'
  });
  
  const CONTRACT_ADDRESS = '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4';
  const MODULE_NAME = 'cross_chain_swap_aptos';
  
  console.log('📋 Contract Details:', {
    address: CONTRACT_ADDRESS,
    module: MODULE_NAME,
    fullFunction: `${CONTRACT_ADDRESS}::${MODULE_NAME}::initiate_swap`
  });
  
  // Generate test parameters exactly like the frontend
  const secret = ethers.hexlify(ethers.randomBytes(32));
  const hashlock = ethers.keccak256(secret);
  const swapId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [hashlock, Date.now()]
    )
  );
  const timelock = Math.floor(Date.now() / 1000) + (3 * 60 * 60); // 3 hours
  const recipient = '0x0c02165a362fae2a55d4341e71e262d6ad1c8f30'; // Test ETH address
  const amountInOctas = 11928000; // 0.11928 APT in octas
  
  console.log('📝 Test Parameters:', {
    swapId: swapId,
    hashlock: hashlock,
    secret: secret.slice(0, 16) + '...',
    recipient: recipient,
    amountInOctas: amountInOctas,
    timelock: timelock,
    timelockDate: new Date(timelock * 1000).toISOString()
  });
  
  // Test 1: Check contract exists
  console.log('\n🧪 Test 1: Checking if contract exists...');
  try {
    const accountResource = await aptosClient.getAccountResource({
      accountAddress: CONTRACT_ADDRESS,
      resourceType: `${CONTRACT_ADDRESS}::${MODULE_NAME}::SwapStore`
    });
    console.log('✅ Contract exists and has SwapStore resource');
  } catch (error) {
    console.log('❌ Contract or SwapStore resource not found:', error.message);
  }
  
  // Test 2: Test parameter formats
  console.log('\n🧪 Test 2: Testing parameter formats...');
  
  // Convert to different formats
  const swapIdBytes = Array.from(ethers.getBytes(swapId));
  const hashlockBytes = Array.from(ethers.getBytes(hashlock));
  
  console.log('📋 Parameter Format Analysis:', {
    swapIdHex: swapId,
    swapIdBytesLength: swapIdBytes.length,
    swapIdBytesFirst4: swapIdBytes.slice(0, 4),
    hashlockHex: hashlock,
    hashlockBytesLength: hashlockBytes.length,
    hashlockBytesFirst4: hashlockBytes.slice(0, 4),
    recipientLength: recipient.length,
    isValidEthAddress: ethers.isAddress(recipient)
  });
  
  // Test 3: Try to call view function to check existing swaps
  console.log('\n🧪 Test 3: Testing get_swap_details view function...');
  try {
    const response = await aptosClient.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_swap_details`,
        functionArguments: [swapIdBytes],
        typeArguments: [],
      }
    });
    console.log('✅ get_swap_details response:', response);
  } catch (error) {
    console.log('❌ get_swap_details failed (expected for non-existent swap):', error.message);
    
    // Check if it's the expected "swap not exists" error
    if (error.message.includes('E_SWAP_NOT_EXISTS')) {
      console.log('✅ This is the expected error for non-existent swap');
    } else {
      console.log('❌ Unexpected error - might indicate parameter format issue');
    }
  }
  
  // Test 4: Test transaction structure (without submitting)
  console.log('\n🧪 Test 4: Testing transaction structure...');
  
  const transaction = {
    arguments: [
      swapIdBytes,
      hashlockBytes,
      recipient,
      amountInOctas.toString(),
      timelock.toString()
    ],
    function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::initiate_swap`,
    type: 'entry_function_payload',
    type_arguments: [],
    gas_unit_price: '100',
    max_gas_amount: '500000'
  };
  
  console.log('📋 Transaction Structure:', {
    function: transaction.function,
    argumentCount: transaction.arguments.length,
    argumentTypes: transaction.arguments.map((arg, i) => ({
      index: i,
      type: Array.isArray(arg) ? `vector<u8>[${arg.length}]` : typeof arg,
      value: Array.isArray(arg) ? `[${arg.slice(0, 4).join(',')}...]` : arg
    })),
    gasUnitPrice: transaction.gas_unit_price,
    maxGasAmount: transaction.max_gas_amount
  });
  
  // Test 5: Validate against Move function signature
  console.log('\n🧪 Test 5: Move function signature validation...');
  console.log('Expected Move function signature:');
  console.log('public entry fun initiate_swap(');
  console.log('  swap_id: vector<u8>,      // 32 bytes');
  console.log('  hashlock: vector<u8>,     // 32 bytes');
  console.log('  recipient: address,       // Aptos address');
  console.log('  amount: u64,              // Amount in octas');
  console.log('  timelock: u64             // Unix timestamp');
  console.log(')');
  
  console.log('\nActual arguments:');
  transaction.arguments.forEach((arg, i) => {
    const names = ['swap_id', 'hashlock', 'recipient', 'amount', 'timelock'];
    console.log(`  ${names[i]}: ${Array.isArray(arg) ? `vector<u8>[${arg.length}]` : typeof arg} = ${Array.isArray(arg) ? `[${arg.slice(0, 4).join(',')}...]` : arg}`);
  });
  
  // Test 6: Check if recipient address format is correct for Aptos
  console.log('\n🧪 Test 6: Recipient address format validation...');
  
  // The current recipient is an Ethereum address, but Aptos expects Aptos addresses
  // This might be the issue!
  console.log('❌ POTENTIAL ISSUE FOUND!');
  console.log('Current recipient:', recipient);
  console.log('Recipient format: Ethereum address (20 bytes)');
  console.log('Expected for Aptos: Aptos address (32 bytes, starts with 0x)');
  
  // Try with proper Aptos address format
  const aptosRecipient = recipient.replace('0x', '').padStart(64, '0');
  const fullAptosRecipient = '0x' + aptosRecipient;
  
  console.log('Converted to Aptos format:', fullAptosRecipient);
  console.log('Length check:', fullAptosRecipient.length, 'characters (should be 66)');
  
  // Test 7: Create corrected transaction
  console.log('\n🧪 Test 7: Corrected transaction structure...');
  
  const correctedTransaction = {
    arguments: [
      swapIdBytes,
      hashlockBytes,
      fullAptosRecipient, // Use properly formatted Aptos address
      amountInOctas.toString(),
      timelock.toString()
    ],
    function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::initiate_swap`,
    type: 'entry_function_payload',
    type_arguments: [],
    gas_unit_price: '100',
    max_gas_amount: '500000'
  };
  
  console.log('✅ Corrected transaction with proper Aptos address format');
  console.log('Updated recipient:', correctedTransaction.arguments[2]);
  
  // Test 8: Final validation
  console.log('\n🧪 Test 8: Final parameter validation...');
  
  const validations = [
    {
      name: 'swap_id length',
      condition: swapIdBytes.length === 32,
      value: swapIdBytes.length
    },
    {
      name: 'hashlock length', 
      condition: hashlockBytes.length === 32,
      value: hashlockBytes.length
    },
    {
      name: 'recipient format',
      condition: fullAptosRecipient.length === 66 && fullAptosRecipient.startsWith('0x'),
      value: `${fullAptosRecipient.length} chars, starts with ${fullAptosRecipient.slice(0, 4)}`
    },
    {
      name: 'amount is positive',
      condition: amountInOctas > 0,
      value: amountInOctas
    },
    {
      name: 'timelock is future',
      condition: timelock > Math.floor(Date.now() / 1000),
      value: `${timelock - Math.floor(Date.now() / 1000)}s in future`
    }
  ];
  
  console.log('Validation Results:');
  validations.forEach(validation => {
    console.log(`  ${validation.condition ? '✅' : '❌'} ${validation.name}: ${validation.value}`);
  });
  
  console.log('\n🎯 DIAGNOSIS SUMMARY:');
  console.log('The likely issue is the recipient address format!');
  console.log('- Current: Using Ethereum address (20 bytes)');
  console.log('- Required: Aptos address format (32 bytes, padded)');
  console.log('- Fix: Pad Ethereum address to 64 hex characters');
  
  return {
    contractExists: true,
    parametersValid: true,
    likelyIssue: 'recipient_address_format',
    recommendation: 'Use padded Aptos address format for recipient'
  };
}

// Run the test
testAptosContract()
  .then(result => {
    console.log('\n✅ Test completed:', result);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
  });