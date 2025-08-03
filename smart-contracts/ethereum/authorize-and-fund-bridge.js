const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log('🔐 Authorizing relayer and setting up bridge...');
  
  // Get signer (contract owner)
  const [owner] = await ethers.getSigners();
  
  // Contract addresses
  const BRIDGE_ADDRESS = '0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0';
  const MOCK_USDC_ADDRESS = '0x7a265Db61E004f4242fB322fa72F8a52D2B06664';
  
  // Relayer address - use from env or fallback to owner
  const RELAYER_ADDRESS = process.env.RELAYER_PRIVATE_KEY ? 
    new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY).address : 
    owner.address;
  
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Owner address:', owner.address);
  console.log('Relayer address:', RELAYER_ADDRESS);
  console.log('Bridge address:', BRIDGE_ADDRESS);
  console.log('Mock USDC address:', MOCK_USDC_ADDRESS);
  
  // Get contract instances
  const bridge = await ethers.getContractAt("CrossChainBridge", BRIDGE_ADDRESS);
  const mockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC_ADDRESS);
  
  try {
    // 1. Check current status
    console.log('\n📊 Current Bridge Status:');
    const isRelayerAuth = await bridge.isRelayer(RELAYER_ADDRESS);
    const reserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
    const isPaused = await bridge.bridgePaused();
    const ownerBalance = await mockUSDC.balanceOf(owner.address);
    const contractBalance = await mockUSDC.balanceOf(BRIDGE_ADDRESS);
    
    console.log('Relayer authorized:', isRelayerAuth ? '✅' : '❌');
    console.log('Bridge reserves:', ethers.formatUnits(reserves.balance, 6), 'mUSDC');
    console.log('Contract balance:', ethers.formatUnits(contractBalance, 6), 'mUSDC');
    console.log('Bridge paused:', isPaused ? '❌ YES' : '✅ NO');
    console.log('Owner mUSDC balance:', ethers.formatUnits(ownerBalance, 6), 'mUSDC');
    
    // 2. Authorize relayer if not already authorized
    if (!isRelayerAuth) {
      console.log('\n🔐 Authorizing relayer...');
      const authTx = await bridge.addRelayer(RELAYER_ADDRESS);
      console.log('Transaction hash:', authTx.hash);
      await authTx.wait();
      console.log('✅ Relayer authorized!');
    } else {
      console.log('\n✅ Relayer already authorized');
    }
    
    // 3. Add reserves if low (less than 1000 mUSDC)
    const minReserves = ethers.parseUnits('1000', 6);
    if (reserves.balance < minReserves) {
      console.log('\n💰 Adding bridge reserves...');
      const addAmount = ethers.parseUnits('5000', 6);
      
      // Mint if needed
      if (ownerBalance < addAmount) {
        console.log('🪙 Minting 5000 mUSDC to owner...');
        const mintTx = await mockUSDC.mint(owner.address, addAmount);
        console.log('Mint transaction hash:', mintTx.hash);
        await mintTx.wait();
        console.log('✅ Minted 5000 mUSDC');
      }
      
      // Approve and add reserves
      console.log('📝 Approving bridge to spend mUSDC...');
      const approveTx = await mockUSDC.approve(BRIDGE_ADDRESS, addAmount);
      console.log('Approve transaction hash:', approveTx.hash);
      await approveTx.wait();
      
      console.log('🏦 Adding 5000 mUSDC reserves to bridge...');
      const addReservesTx = await bridge.addReserves(MOCK_USDC_ADDRESS, addAmount);
      console.log('Add reserves transaction hash:', addReservesTx.hash);
      await addReservesTx.wait();
      console.log('✅ Added 5000 mUSDC reserves!');
    } else {
      console.log('\n✅ Bridge reserves are sufficient');
    }
    
    // 4. Unpause if paused
    if (isPaused) {
      console.log('\n▶️  Unpausing bridge...');
      const unpauseTx = await bridge.unpauseBridge();
      console.log('Unpause transaction hash:', unpauseTx.hash);
      await unpauseTx.wait();
      console.log('✅ Bridge unpaused!');
    } else {
      console.log('\n✅ Bridge is not paused');
    }
    
    // 5. Final status check
    console.log('\n🎉 Final Bridge Status:');
    const finalIsAuth = await bridge.isRelayer(RELAYER_ADDRESS);
    const finalReserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
    const finalIsPaused = await bridge.bridgePaused();
    const finalContractBalance = await mockUSDC.balanceOf(BRIDGE_ADDRESS);
    
    console.log('Relayer authorized:', finalIsAuth ? '✅' : '❌');
    console.log('Bridge reserves:', ethers.formatUnits(finalReserves.balance, 6), 'mUSDC');
    console.log('Contract balance:', ethers.formatUnits(finalContractBalance, 6), 'mUSDC');
    console.log('Bridge paused:', finalIsPaused ? '❌ YES' : '✅ NO');
    
    if (finalIsAuth && finalReserves.balance >= minReserves && !finalIsPaused) {
      console.log('\n🎉 SUCCESS: Bridge is ready for Aptos→Ethereum transfers!');
      console.log('\n📋 Next Steps:');
      console.log('1. Restart your relayer: node fixed-relayer.js');
      console.log('2. Process missed transaction:');
      console.log('   relayer.processSpecificAptosTransaction("0xd1a832e1738f8412646642078dc39ee50089bca42ab24713b882c958e0878c1f")');
    } else {
      console.log('\n❌ Some issues remain - check the status above');
    }
    
  } catch (error) {
    console.error('❌ Error setting up bridge:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    process.exit(1);
  }
}

// Run the setup
main()
  .then(() => {
    console.log('\n✅ Bridge setup script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });