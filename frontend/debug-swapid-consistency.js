const { ethers } = require('ethers');

// Debug swapId consistency between initiate_swap and complete_swap
function debugSwapIdConsistency() {
  console.log('🔍 Debugging swapId consistency between initiate_swap and complete_swap...');
  
  // Use the exact same process as atomicSwapService.ts to generate swapId
  const secret = '0x5c7efca6acf8ede7d8dd2aecece63a7408f199c5ce84c4030603236e656a902c';
  const hashlock = ethers.keccak256(secret);
  const swapId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [hashlock, Date.now()]
    )
  );
  
  console.log('📝 Generated Parameters:');
  console.log('  secret:', secret);
  console.log('  hashlock:', hashlock);
  console.log('  swapId:', swapId);
  console.log('');
  
  // Test the format used in initiate_swap (from useAptosContract.ts)
  console.log('🧪 INITIATE_SWAP Format:');
  const initiateSwapIdBytes = Array.from(ethers.getBytes(swapId));
  const initiateHashlockBytes = Array.from(ethers.getBytes(hashlock));
  
  console.log('  swapId format: Array.from(ethers.getBytes(swapId))');
  console.log('  swapId bytes:', initiateSwapIdBytes.slice(0, 8), '... (length:', initiateSwapIdBytes.length, ')');
  console.log('  hashlock format: Array.from(ethers.getBytes(hashlock))');
  console.log('  hashlock bytes:', initiateHashlockBytes.slice(0, 8), '... (length:', initiateHashlockBytes.length, ')');
  
  // Test the format used in complete_swap (from useAptosContract.ts)
  console.log('\n🧪 COMPLETE_SWAP Format:');
  const completeSwapIdBytes = Array.from(ethers.getBytes(swapId));
  const completeSecretBytes = Array.from(ethers.getBytes(secret));
  
  console.log('  swapId format: Array.from(ethers.getBytes(swapId))');
  console.log('  swapId bytes:', completeSwapIdBytes.slice(0, 8), '... (length:', completeSwapIdBytes.length, ')');
  console.log('  secret format: Array.from(ethers.getBytes(secret))');
  console.log('  secret bytes:', completeSecretBytes.slice(0, 8), '... (length:', completeSecretBytes.length, ')');
  
  // Check if they're identical
  console.log('\n✅ CONSISTENCY CHECK:');
  const swapIdMatch = JSON.stringify(initiateSwapIdBytes) === JSON.stringify(completeSwapIdBytes);
  console.log('  SwapId bytes match:', swapIdMatch ? '✅ YES' : '❌ NO');
  
  if (!swapIdMatch) {
    console.log('❌ CRITICAL ISSUE: SwapId format differs between initiate and complete!');
    console.log('  Initiate bytes:', initiateSwapIdBytes);
    console.log('  Complete bytes:', completeSwapIdBytes);
  } else {
    console.log('✅ SwapId format is consistent between initiate and complete');
  }
  
  // Test the actual values from the failed transaction
  console.log('\n🔍 ACTUAL FAILED TRANSACTION ANALYSIS:');
  
  // These are the actual values from our investigation
  const actualSwapId = '0xf94ddf3ec8d2557d923a509d169416c0f52d63d2b5c7b11afb7c58d016647c48';
  const actualHashlock = '0xb30ac0496092bbc409a2b203f8527b415390ab1df70046a0dab8369402fc704b';
  const actualSecret = '0x5c7efca6acf8ede7d8dd2aecece63a7408f199c5ce84c4030603236e656a902c';
  
  console.log('  Actual swapId:', actualSwapId);
  console.log('  Actual hashlock:', actualHashlock);
  console.log('  Actual secret:', actualSecret);
  
  // Verify secret -> hashlock relationship
  const computedHashlock = ethers.keccak256(actualSecret);
  const hashlockMatch = computedHashlock === actualHashlock;
  
  console.log('\n🔐 SECRET -> HASHLOCK VERIFICATION:');
  console.log('  Computed hashlock:', computedHashlock);
  console.log('  Actual hashlock:  ', actualHashlock);
  console.log('  Match:', hashlockMatch ? '✅ YES' : '❌ NO');
  
  if (!hashlockMatch) {
    console.log('❌ CRITICAL: Secret does not match hashlock! This would cause E_INVALID_SECRET');
  }
  
  // Test the byte array conversions for actual values
  console.log('\n📋 ACTUAL TRANSACTION FORMATS:');
  const actualSwapIdBytes = Array.from(ethers.getBytes(actualSwapId));
  const actualSecretBytes = Array.from(ethers.getBytes(actualSecret));
  
  console.log('Initiate_swap used:');
  console.log('  swapId bytes:', actualSwapIdBytes.slice(0, 4), '... (length:', actualSwapIdBytes.length, ')');
  
  console.log('Complete_swap will use:');
  console.log('  swapId bytes:', actualSwapIdBytes.slice(0, 4), '... (length:', actualSwapIdBytes.length, ')');
  console.log('  secret bytes:', actualSecretBytes.slice(0, 4), '... (length:', actualSecretBytes.length, ')');
  
  // Final diagnosis
  console.log('\n🎯 DIAGNOSIS:');
  
  if (swapIdMatch && hashlockMatch) {
    console.log('✅ SwapId and secret formats are consistent');
    console.log('💡 The E_SWAP_NOT_EXISTS error suggests either:');
    console.log('   1. The initiate_swap didn\'t actually store the swap (despite events)');
    console.log('   2. There\'s a timing issue with contract state');
    console.log('   3. The Move contract has a bug in swap storage/retrieval');
    console.log('   4. We need to check the contract\'s SwapStore resource');
  } else {
    console.log('❌ Found consistency issues that could cause E_SWAP_NOT_EXISTS');
  }
  
  return {
    swapIdConsistent: swapIdMatch,
    secretValid: hashlockMatch,
    actualValues: {
      swapId: actualSwapId,
      hashlock: actualHashlock, 
      secret: actualSecret
    }
  };
}

// Run the debug
const result = debugSwapIdConsistency();
console.log('\n📊 Debug Result:', result);