const ethers = require('ethers');

async function testContractDirectly() {
  // Use a free public RPC
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.public.blastapi.io');
  const contractAddress = '0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8';
  
  console.log('🔍 Testing contract directly...');
  console.log('Contract address:', contractAddress);
  
  // Check if contract exists
  const code = await provider.getCode(contractAddress);
  const hasCode = code !== '0x';
  console.log('Contract exists:', hasCode);
  
  if (!hasCode) {
    console.log('❌ No contract at this address!');
    return;
  }
  
  // Try to call isValidTimelock function
  const contractABI = [
    'function isValidTimelock(uint256 timelock) external view returns (bool)',
    'function MIN_TIMELOCK() external view returns (uint256)',
    'function MAX_TIMELOCK() external view returns (uint256)'
  ];
  
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  
  try {
    console.log('\n🧪 Testing timelock validation...');
    
    // Test the timelock from the failed transaction
    const failedTimelock = 1753805001;
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log('Failed timelock:', failedTimelock);
    console.log('Current time:', currentTime);
    console.log('Difference:', failedTimelock - currentTime, 'seconds');
    
    try {
      const isValid = await contract.isValidTimelock(failedTimelock);
      console.log('Contract says timelock is valid:', isValid);
    } catch (error) {
      console.log('❌ isValidTimelock function not available:', error.message);
    }
    
    try {
      const minTimelock = await contract.MIN_TIMELOCK();
      const maxTimelock = await contract.MAX_TIMELOCK();
      console.log('MIN_TIMELOCK:', Number(minTimelock));
      console.log('MAX_TIMELOCK:', Number(maxTimelock));
    } catch (error) {
      console.log('❌ MIN/MAX_TIMELOCK constants not available:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Contract interaction failed:', error.message);
  }
}

testContractDirectly().catch(console.error);