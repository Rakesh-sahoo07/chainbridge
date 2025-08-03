// Simple test to verify TypeScript compilation and imports
console.log('Testing compilation...');

// Test Aptos SDK import
async function testAptosImport() {
  try {
    console.log('Testing Aptos SDK import...');
    const { Aptos, AptosConfig, Network } = await import('@aptos-labs/ts-sdk');
    
    console.log('✅ Aptos SDK import successful');
    
    // Test AptosConfig construction
    const config = new AptosConfig({ network: Network.TESTNET });
    const client = new Aptos(config);
    
    console.log('✅ AptosConfig and Aptos client creation successful');
    console.log('Aptos client network:', config.network);
    
    return true;
  } catch (error) {
    console.error('❌ Aptos SDK test failed:', error.message);
    return false;
  }
}

// Test Ethers import
async function testEthersImport() {
  try {
    console.log('Testing Ethers import...');
    const { ethers } = await import('ethers');
    
    console.log('✅ Ethers import successful');
    console.log('Ethers version:', ethers.version);
    
    return true;
  } catch (error) {
    console.error('❌ Ethers test failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== Import Tests ===');
  
  const aptosTest = await testAptosImport();
  const ethersTest = await testEthersImport();
  
  console.log('=== Test Results ===');
  console.log('Aptos SDK:', aptosTest ? '✅ PASS' : '❌ FAIL');
  console.log('Ethers:', ethersTest ? '✅ PASS' : '❌ FAIL');
  
  if (aptosTest && ethersTest) {
    console.log('🎉 All imports working correctly!');
  } else {
    console.log('⚠️  Some imports failed - check errors above');
  }
}

runTests().catch(console.error);