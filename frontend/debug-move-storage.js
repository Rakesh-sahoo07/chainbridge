// Debug Move contract storage directly
async function debugMoveStorage() {
  console.log('🔍 Debugging Move contract storage directly...');
  
  const CONTRACT_ADDRESS = '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4';
  
  try {
    // Check the contract's SwapStore resource directly
    console.log('📋 Checking SwapStore resource...');
    const response = await fetch(`https://api.testnet.aptoslabs.com/v1/accounts/${CONTRACT_ADDRESS}/resource/0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_swap_aptos::SwapStore`);
    
    if (response.ok) {
      const swapStore = await response.json();
      console.log('✅ SwapStore found:', swapStore);
      
      if (swapStore.data && swapStore.data.swaps) {
        console.log('📊 Current swaps in storage:', swapStore.data.swaps);
        console.log('📊 Number of swaps:', Object.keys(swapStore.data.swaps).length);
      } else {
        console.log('📊 SwapStore exists but no swaps data found');
      }
    } else {
      const error = await response.json();
      console.log('❌ SwapStore not found or accessible:', error);
    }
    
    // Check contract events for SwapInitiated
    console.log('\n📋 Checking recent SwapInitiated events...');
    const eventsResponse = await fetch(`https://api.testnet.aptoslabs.com/v1/accounts/${CONTRACT_ADDRESS}/events/0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_swap_aptos::SwapInitiated`);
    
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log('✅ SwapInitiated events found:', events.length);
      
      events.slice(0, 3).forEach((event, i) => {
        console.log(`Event ${i + 1}:`, {
          swapId: event.data.swap_id,
          version: event.version,
          timestamp: new Date(parseInt(event.data.created_at) * 1000).toISOString()
        });
      });
    } else {
      console.log('❌ No SwapInitiated events found');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugMoveStorage();