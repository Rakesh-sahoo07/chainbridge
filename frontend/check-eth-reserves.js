const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Check Ethereum Bridge Contract Reserves
 */
async function checkEthereumReserves() {
  try {
    console.log('🔍 Checking Ethereum Bridge Contract Reserves...\n');
    
    // Contract addresses
    const bridgeAddress = '0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0';
    const mockUSDCAddress = '0x7a265Db61E004f4242fB322fa72F8a52D2B06664';
    
    // Setup provider
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    
    // Contract ABIs
    const bridgeABI = [
      'function getReserves(address token) external view returns (tuple(uint256 balance, uint256 totalBridgedIn, uint256 totalBridgedOut, uint256 feesCollected))',
      'function owner() external view returns (address)',
      'function isAuthorizedRelayer(address relayer) external view returns (bool)'
    ];
    
    const mockUSDCABI = [
      'function balanceOf(address account) external view returns (uint256)',
      'function totalSupply() external view returns (uint256)',
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)'
    ];
    
    // Create contract instances
    const bridgeContract = new ethers.Contract(bridgeAddress, bridgeABI, provider);
    const mockUSDCContract = new ethers.Contract(mockUSDCAddress, mockUSDCABI, provider);
    
    console.log('📄 Contract Addresses:');
    console.log('   Bridge:', bridgeAddress);
    console.log('   mUSDC:', mockUSDCAddress);
    console.log('');
    
    // Check bridge reserves
    console.log('💰 Bridge Reserves:');
    const reserves = await bridgeContract.getReserves(mockUSDCAddress);
    console.log('   Balance:', ethers.formatUnits(reserves.balance, 6), 'mUSDC');
    console.log('   Total Bridged In:', ethers.formatUnits(reserves.totalBridgedIn, 6), 'mUSDC');
    console.log('   Total Bridged Out:', ethers.formatUnits(reserves.totalBridgedOut, 6), 'mUSDC');
    console.log('   Fees Collected:', ethers.formatUnits(reserves.feesCollected, 6), 'mUSDC');
    console.log('');
    
    // Check actual mUSDC balance in bridge contract
    console.log('🏦 Actual mUSDC Balance in Bridge Contract:');
    const actualBalance = await mockUSDCContract.balanceOf(bridgeAddress);
    console.log('   mUSDC Balance:', ethers.formatUnits(actualBalance, 6), 'mUSDC');
    console.log('');
    
    // Check if reserves match actual balance
    const balanceDifference = actualBalance - reserves.balance;
    console.log('🔍 Balance Analysis:');
    console.log('   Tracked Balance:', ethers.formatUnits(reserves.balance, 6), 'mUSDC');
    console.log('   Actual Balance:', ethers.formatUnits(actualBalance, 6), 'mUSDC');
    console.log('   Difference:', ethers.formatUnits(balanceDifference, 6), 'mUSDC');
    console.log('');
    
    // Check authorization
    console.log('🔐 Authorization Check:');
    const relayerAddress = process.env.RELAYER_ETH_ADDRESS || 'Not set in .env';
    console.log('   Relayer Address:', relayerAddress);
    
    if (relayerAddress !== 'Not set in .env') {
      const isAuthorized = await bridgeContract.isAuthorizedRelayer(relayerAddress);
      console.log('   Is Authorized:', isAuthorized ? '✅ YES' : '❌ NO');
    }
    console.log('');
    
    // Check mUSDC token info
    console.log('🪙 mUSDC Token Info:');
    const symbol = await mockUSDCContract.symbol();
    const decimals = await mockUSDCContract.decimals();
    const totalSupply = await mockUSDCContract.totalSupply();
    console.log('   Symbol:', symbol);
    console.log('   Decimals:', decimals);
    console.log('   Total Supply:', ethers.formatUnits(totalSupply, 6), 'mUSDC');
    console.log('');
    
    // Recommendations
    console.log('💡 Analysis:');
    if (reserves.balance < ethers.parseUnits('10', 6)) {
      console.log('   ⚠️  WARNING: Bridge reserves are LOW (< 10 mUSDC)');
      console.log('   📝 Recommendation: Fund the bridge with more mUSDC reserves');
    } else {
      console.log('   ✅ Bridge reserves look adequate');
    }
    
    if (actualBalance !== reserves.balance) {
      console.log('   ⚠️  WARNING: Tracked balance doesn\'t match actual balance');
      console.log('   📝 This could indicate accounting issues in the contract');
    } else {
      console.log('   ✅ Balance tracking is accurate');
    }
    
  } catch (error) {
    console.error('❌ Error checking reserves:', error.message);
    console.error('Full error:', error);
  }
}

// Run the check
checkEthereumReserves();