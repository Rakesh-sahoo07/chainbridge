const ethers = require('ethers');

async function checkContract() {
  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
  const contractAddress = '0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8';
  
  console.log('Checking contract at:', contractAddress);
  
  // Check if contract exists
  const code = await provider.getCode(contractAddress);
  const hasCode = code !== '0x';
  console.log('Contract code exists:', hasCode);
  console.log('Code length:', code.length);
  
  if (!hasCode) {
    console.log('❌ NO CONTRACT DEPLOYED AT THIS ADDRESS!');
    return;
  }
  
  // Try to read the MIN_TIMELOCK constant
  const contractABI = [
    'function MIN_TIMELOCK() external view returns (uint256)',
    'function MAX_TIMELOCK() external view returns (uint256)',
    'function getCurrentTimestamp() external view returns (uint256)'
  ];
  
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  
  try {
    const minTimelock = await contract.MIN_TIMELOCK();
    const maxTimelock = await contract.MAX_TIMELOCK();
    const currentTimestamp = await contract.getCurrentTimestamp();
    
    console.log('✅ Contract constants:');
    console.log('   MIN_TIMELOCK:', minTimelock.toString(), 'seconds');
    console.log('   MAX_TIMELOCK:', maxTimelock.toString(), 'seconds');
    console.log('   Contract current time:', currentTimestamp.toString());
    console.log('   Local current time:', Math.floor(Date.now() / 1000));
    console.log('   Time difference:', Math.abs(Number(currentTimestamp) - Math.floor(Date.now() / 1000)), 'seconds');
    
    // Test the validation function
    const testTimelock = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes from now
    console.log('\n🧪 Testing timelock validation:');
    console.log('   Test timelock:', testTimelock);
    console.log('   Test timelock date:', new Date(testTimelock * 1000).toISOString());
    
    try {
      const isValid = await contract.isValidTimelock(testTimelock);
      console.log('   Is valid according to contract:', isValid);
    } catch (error) {
      console.log('   Validation check failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Failed to read contract constants:', error.message);
  }
}

checkContract().catch(console.error);