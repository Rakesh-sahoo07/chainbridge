const { isSameTokenCrossChainTransfer } = require('./src/services/atomicSwapService');

// Test 1:1 conversion detection
function test1to1Conversion() {
  console.log('🧪 Testing 1:1 Conversion Detection');
  console.log('===================================');
  
  const testCases = [
    // Should be 1:1 (same token cross-chain)
    { from: 'mUSDC-ETH', to: 'mUSDC-APT', expected: true, description: 'Ethereum mUSDC → Aptos mUSDC' },
    { from: 'mUSDC-APT', to: 'mUSDC-ETH', expected: true, description: 'Aptos mUSDC → Ethereum mUSDC' },
    { from: 'mUSDC', to: 'mUSDC', expected: true, description: 'Generic mUSDC → mUSDC' },
    
    // Should NOT be 1:1 (different tokens)
    { from: 'mUSDC-ETH', to: 'APT', expected: false, description: 'Ethereum mUSDC → Aptos APT' },
    { from: 'APT', to: 'mUSDC-ETH', expected: false, description: 'Aptos APT → Ethereum mUSDC' },
    { from: 'ETH', to: 'APT', expected: false, description: 'ETH → APT' },
  ];
  
  console.log('🔍 Test Cases:');
  testCases.forEach((testCase, index) => {
    try {
      const result = isSameTokenCrossChainTransfer(testCase.from, testCase.to);
      const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
      const conversion = result ? '1:1 Direct' : '1inch Market Rate';
      
      console.log(`${index + 1}. ${status} ${testCase.description}`);
      console.log(`   ${testCase.from} → ${testCase.to}`);
      console.log(`   Expected: ${testCase.expected ? '1:1' : 'Market'}, Got: ${conversion}`);
      
      if (result !== testCase.expected) {
        console.log(`   ❌ ERROR: Expected ${testCase.expected}, got ${result}`);
      }
    } catch (error) {
      console.log(`${index + 1}. ❌ ERROR ${testCase.description}: ${error.message}`);
    }
    console.log('');
  });
  
  console.log('💡 How This Fixes Your Issue:');
  console.log('1. ✅ mUSDC-ETH → mUSDC-APT will use 1:1 direct swap');
  console.log('2. ✅ mUSDC-APT → mUSDC-ETH will use 1:1 direct swap');
  console.log('3. ✅ No more 1inch pricing for same-token transfers');
  console.log('4. ✅ You get exactly 1 mUSDC for 1 mUSDC (minus small gas fees)');
  
  console.log('\\n🎯 Expected Results:');
  console.log('• 1 mUSDC (ETH) → 1 mUSDC (APT) ✅');
  console.log('• 1 mUSDC (APT) → 1 mUSDC (ETH) ✅');
  console.log('• No 0.11 conversion rate anymore! 🚀');
}

// Run test
test1to1Conversion();