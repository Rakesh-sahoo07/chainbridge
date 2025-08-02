// Investigate the actual failed transaction
async function investigateTransaction() {
  console.log('🔍 Investigating actual failed Aptos transaction...');
  
  // This is the transaction hash from the error logs
  const txHash = '0x1aac27e2e5451dcf531a4d663d78fe8f6eb0e72b6f56eae02da1cec4e72d1b02';
  const swapId = '0xf94ddf3ec8d2557d923a509d169416c0f52d63d2b5c7b11afb7c58d016647c48';
  
  console.log('Transaction Hash:', txHash);
  console.log('SwapId:', swapId);
  
  try {
    // Get transaction details
    console.log('\n🔍 Fetching transaction details...');
    const txResponse = await fetch(`https://api.testnet.aptoslabs.com/v1/transactions/by_hash/${txHash}`);
    const txData = await txResponse.json();
    
    if (txResponse.ok) {
      console.log('✅ Transaction found!');
      console.log('📋 Transaction Details:');
      console.log('  Success:', txData.success);
      console.log('  VM Status:', txData.vm_status);
      console.log('  Gas Used:', txData.gas_used);
      console.log('  Version:', txData.version);
      console.log('  Type:', txData.type);
      
      if (txData.payload) {
        console.log('  Function:', txData.payload.function);
        console.log('  Arguments Count:', txData.payload.arguments?.length);
        console.log('  Arguments:', txData.payload.arguments?.map((arg, i) => 
          `${i}: ${typeof arg === 'string' ? arg : `[${arg.slice(0, 4).join(',')}...]`}`
        ));
      }
      
      // Check events
      if (txData.events && txData.events.length > 0) {
        console.log('  Events:', txData.events.length);
        txData.events.forEach((event, i) => {
          console.log(`    Event ${i}:`, event.type, event.data);
        });
      } else {
        console.log('  Events: None (this might indicate the issue!)');
      }
      
      // If transaction was successful but no events, that's suspicious
      if (txData.success && (!txData.events || txData.events.length === 0)) {
        console.log('\n❌ SUSPICIOUS: Transaction successful but no events emitted!');
        console.log('This suggests the contract function ran but didn\'t perform the expected actions.');
      }
      
    } else {
      console.log('❌ Transaction not found:', txData);
    }
    
    // Try to check if swap exists using view function
    console.log('\n🔍 Checking if swap exists using view function...');
    try {
      const viewResponse = await fetch('https://api.testnet.aptoslabs.com/v1/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_swap_aptos::get_swap_details',
          arguments: [swapId], // Use hex string as per our fix
          type_arguments: []
        })
      });
      
      const viewData = await viewResponse.json();
      
      if (viewResponse.ok) {
        console.log('✅ Swap exists!', viewData);
      } else {
        console.log('❌ Swap does not exist:', viewData.message);
        
        if (viewData.message && viewData.message.includes('E_SWAP_NOT_EXISTS')) {
          console.log('✅ Confirmed: Swap was not created despite successful transaction');
        }
      }
    } catch (error) {
      console.error('❌ View function error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

// Run the investigation
investigateTransaction();