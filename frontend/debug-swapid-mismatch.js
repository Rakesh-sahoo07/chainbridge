const { ethers } = require('ethers');
const crypto = require('crypto');

// Test the swapId mismatch between frontend and Move contract
function debugSwapIdMismatch() {
  console.log('🔍 CRITICAL BUG DISCOVERED: SwapId generation mismatch!');
  console.log('');
  
  // Our current frontend method (WRONG for Move contract)
  const secret = '0x5c7efca6acf8ede7d8dd2aecece63a7408f199c5ce84c4030603236e656a902c';
  const hashlock = ethers.keccak256(secret);
  const frontendSwapId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [hashlock, Date.now()]
    )
  );
  
  console.log('❌ FRONTEND SwapId Generation (Current - WRONG):');
  console.log('  Method: keccak256(encode(hashlock, timestamp))');
  console.log('  SwapId:', frontendSwapId);
  console.log('');
  
  // Move contract method (CORRECT)
  const initiator = '0x176ef56313c0e2956cea1af533b1b9e02509555ec1d8c5302fe436db20f2e179';
  const timelock = 1753900609;
  
  console.log('✅ MOVE CONTRACT SwapId Generation (Expected - CORRECT):');
  console.log('  Method: sha3_256(hashlock + initiator_bytes + timelock_bytes)');
  console.log('');
  
  // Simulate the Move contract logic
  const hashlockBytes = ethers.getBytes(hashlock);
  const initiatorBytes = ethers.getBytes(ethers.zeroPadValue(initiator, 32)); // Address to 32 bytes
  const timelockBytes = new Uint8Array(8); // u64 in little-endian
  const view = new DataView(timelockBytes.buffer);
  view.setBigUint64(0, BigInt(timelock), true); // little-endian
  
  // Concatenate all bytes
  const combinedBytes = new Uint8Array(
    hashlockBytes.length + initiatorBytes.length + timelockBytes.length
  );
  combinedBytes.set(hashlockBytes, 0);
  combinedBytes.set(initiatorBytes, hashlockBytes.length);
  combinedBytes.set(timelockBytes, hashlockBytes.length + initiatorBytes.length);
  
  // Calculate SHA3-256 (not keccak256 - they're different!)
  const sha3_256 = crypto.createHash('sha3-256');
  sha3_256.update(combinedBytes);
  const moveContractSwapId = '0x' + sha3_256.digest('hex');
  
  console.log('  Parameters:');
  console.log('    hashlock:', hashlock);
  console.log('    initiator:', initiator);
  console.log('    timelock:', timelock);
  console.log('  Combined bytes length:', combinedBytes.length);
  console.log('  Move SwapId:', moveContractSwapId);
  console.log('');
  
  console.log('🔍 COMPARISON:');
  console.log('  Frontend SwapId:', frontendSwapId);
  console.log('  Move SwapId:    ', moveContractSwapId);
  console.log('  Match:', frontendSwapId === moveContractSwapId ? '✅ YES' : '❌ NO');
  console.log('');
  
  console.log('🎯 ROOT CAUSE IDENTIFIED:');
  console.log('1. ❌ Frontend generates SwapId using: keccak256(hashlock + timestamp)');
  console.log('2. ✅ Move contract expects SwapId as: sha3_256(hashlock + initiator + timelock)');
  console.log('3. 💡 The parameters and hash function are completely different!');
  console.log('');
  
  console.log('🔧 SOLUTION:');
  console.log('We need to generate SwapId using the Move contract\'s method:');
  console.log('1. Use SHA3-256 (not keccak256)');
  console.log('2. Include: hashlock + initiator_address + timelock');
  console.log('3. Use proper byte encoding for each parameter');
  console.log('');
  
  return {
    frontendSwapId,
    moveContractSwapId,
    matches: frontendSwapId === moveContractSwapId,
    solution: 'Update frontend to use Move contract SwapId generation logic'
  };
}

// Run the debug
const result = debugSwapIdMismatch();
console.log('📊 Debug Result:', result);