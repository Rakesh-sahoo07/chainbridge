// Test view function with hashlock instead of swapId
async function testViewWithHashlock() {
  console.log('🔍 Testing view function with hashlock instead of swapId...');
  
  const swapId = '0xf94ddf3ec8d2557d923a509d169416c0f52d63d2b5c7b11afb7c58d016647c48';
  const hashlock = '0xb30ac0496092bbc409a2b203f8527b415390ab1df70046a0dab8369402fc704b';
  
  console.log('📝 Parameters:');
  console.log('  swapId:', swapId);
  console.log('  hashlock:', hashlock);
  
  try {
    // Test 1: Try with swapId (current approach - should fail)
    console.log('\n🧪 Test 1: View function with swapId...');
    try {
      const swapIdResponse = await fetch('https://api.testnet.aptoslabs.com/v1/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_swap_aptos::get_swap_details',
          arguments: [swapId],
          type_arguments: []
        })
      });
      
      const swapIdData = await swapIdResponse.json();
      
      if (swapIdResponse.ok) {
        console.log('✅ SwapId lookup succeeded:', swapIdData);
      } else {
        console.log('❌ SwapId lookup failed (expected):', swapIdData.message);
      }
    } catch (error) {
      console.log('❌ SwapId lookup error:', error.message);
    }
    
    // Test 2: Try with hashlock (new approach - might work!)
    console.log('\n🧪 Test 2: View function with hashlock...');
    try {
      const hashlockResponse = await fetch('https://api.testnet.aptoslabs.com/v1/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_swap_aptos::get_swap_details',
          arguments: [hashlock],
          type_arguments: []
        })
      });
      
      const hashlockData = await hashlockResponse.json();
      
      if (hashlockResponse.ok) {
        console.log('✅ Hashlock lookup SUCCEEDED!:', hashlockData);
        console.log('🎯 SOLUTION FOUND: Move contract uses hashlock as key, not swapId!');
      } else {
        console.log('❌ Hashlock lookup failed:', hashlockData.message);
      }
    } catch (error) {
      console.log('❌ Hashlock lookup error:', error.message);
    }
    
    console.log('\n🔍 DIAGNOSIS:');
    console.log('The Move contract is storing swaps with hashlock as the key.');
    console.log('Our complete_swap function needs to use hashlock, not swapId!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testViewWithHashlock();