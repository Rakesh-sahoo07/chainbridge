const { ethers } = require('ethers');

// Test the exact transaction format we're sending
function testTransactionFormat() {
  console.log('🔍 Testing actual transaction format used by frontend...');
  
  // Use the exact same parameters as the failed transaction from logs
  const swapId = '0xf94ddf3ec8d2557d923a509d169416c0f52d63d2b5c7b11afb7c58d016647c48';
  const hashlock = '0xb30ac0496092bbc409a2b203f8527b415390ab1df70046a0dab8369402fc704b';
  const recipient = '0x0c02165a362fae2a55d4341e71e262d6ad1c8f30'; // Original Ethereum address
  const amountInOctas = 11928000;
  const timelock = Math.floor(Date.now() / 1000) + (3 * 60 * 60);
  
  console.log('📝 Input Parameters:');
  console.log('  swapId:', swapId);
  console.log('  hashlock:', hashlock);
  console.log('  recipient (ETH format):', recipient);
  console.log('  amount:', amountInOctas);
  console.log('  timelock:', timelock);
  
  // Apply the exact same transformations as useAptosContract.ts
  const swapIdBytes = Array.from(ethers.getBytes(swapId));
  const hashlockBytes = Array.from(ethers.getBytes(hashlock));
  
  // Pad Ethereum address to 64 characters for Aptos (lines 37-40 in useAptosContract.ts)
  const paddedRecipient = recipient.replace('0x', '').padStart(64, '0');
  const aptosRecipient = '0x' + paddedRecipient;
  
  console.log('\n📋 Transformed Parameters:');
  console.log('  swapIdBytes length:', swapIdBytes.length);
  console.log('  swapIdBytes first 4:', swapIdBytes.slice(0, 4));
  console.log('  hashlockBytes length:', hashlockBytes.length);
  console.log('  hashlockBytes first 4:', hashlockBytes.slice(0, 4));
  console.log('  aptosRecipient:', aptosRecipient);
  console.log('  aptosRecipient length:', aptosRecipient.length);
  
  // Create the exact transaction structure
  const transaction = {
    arguments: [
      swapIdBytes,                    // vector<u8>[32]
      hashlockBytes,                  // vector<u8>[32]
      aptosRecipient,                 // address (padded to 32 bytes)
      amountInOctas.toString(),       // u64 as string
      timelock.toString()             // u64 as string
    ],
    function: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_swap_aptos::initiate_swap',
    type: 'entry_function_payload',
    type_arguments: [],
    gas_unit_price: '100',
    max_gas_amount: '500000'
  };
  
  console.log('\n🧪 Final Transaction Structure:');
  console.log('Function:', transaction.function);
  console.log('Arguments:');
  transaction.arguments.forEach((arg, i) => {
    const names = ['swap_id', 'hashlock', 'recipient', 'amount', 'timelock'];
    const displayValue = Array.isArray(arg) ? 
      `[${arg.slice(0, 4).join(',')}...] (${arg.length} bytes)` : 
      arg;
    console.log(`  ${i}. ${names[i]}: ${displayValue}`);
  });
  
  // Validate against Move contract expectations
  console.log('\n✅ Validation Results:');
  
  const validations = [
    {
      name: 'swap_id is vector<u8>[32]',
      expected: 'vector<u8> with 32 elements',
      actual: `vector<u8> with ${swapIdBytes.length} elements`,
      valid: Array.isArray(swapIdBytes) && swapIdBytes.length === 32
    },
    {
      name: 'hashlock is vector<u8>[32]', 
      expected: 'vector<u8> with 32 elements',
      actual: `vector<u8> with ${hashlockBytes.length} elements`,
      valid: Array.isArray(hashlockBytes) && hashlockBytes.length === 32
    },
    {
      name: 'recipient is valid Aptos address',
      expected: 'string with 66 chars starting with 0x',
      actual: `string with ${aptosRecipient.length} chars starting with ${aptosRecipient.slice(0, 4)}`,
      valid: typeof aptosRecipient === 'string' && aptosRecipient.length === 66 && aptosRecipient.startsWith('0x')
    },
    {
      name: 'amount is valid u64 string',
      expected: 'string representation of positive integer',
      actual: `string "${amountInOctas.toString()}"`,
      valid: typeof amountInOctas.toString() === 'string' && parseInt(amountInOctas.toString()) > 0
    },
    {
      name: 'timelock is valid u64 string',
      expected: 'string representation of future timestamp',
      actual: `string "${timelock.toString()}" (${timelock - Math.floor(Date.now() / 1000)}s in future)`,
      valid: typeof timelock.toString() === 'string' && timelock > Math.floor(Date.now() / 1000)
    }
  ];
  
  validations.forEach(v => {
    console.log(`  ${v.valid ? '✅' : '❌'} ${v.name}`);
    console.log(`    Expected: ${v.expected}`);
    console.log(`    Actual: ${v.actual}`);
  });
  
  const allValid = validations.every(v => v.valid);
  console.log(`\n${allValid ? '✅' : '❌'} Overall validation: ${allValid ? 'PASSED' : 'FAILED'}`);
  
  if (allValid) {
    console.log('\n🎯 CONCLUSION: Transaction format appears correct!');
    console.log('The issue might be:');
    console.log('1. Contract deployment issue');
    console.log('2. Insufficient balance for the transaction');
    console.log('3. Gas limit too low');
    console.log('4. Network connectivity issue');
    console.log('5. Contract logic issue (missing assertions, etc.)');
  } else {
    console.log('\n❌ CONCLUSION: Transaction format has issues!');
    console.log('Fix the validation failures above.');
  }
  
  return {
    transactionValid: allValid,
    validations: validations,
    transaction: transaction
  };
}

// Run the test
const result = testTransactionFormat();
console.log('\n📊 Test Result:', {
  valid: result.transactionValid,
  failedValidations: result.validations.filter(v => !v.valid).length
});