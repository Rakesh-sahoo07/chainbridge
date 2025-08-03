const { ethers } = require('ethers');

// Contract addresses
const MOCK_USDC_ADDRESS = '0x7a265Db61E004f4242fB322fa72F8a52D2B06664';
const CROSS_CHAIN_SWAP_ADDRESS = '0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8';

// MockERC20 ABI (only the functions we need)
const MOCK_ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function owner() external view returns (address)'
];

async function mintAndTransferMUSDC() {
  console.log('🏭 Minting mUSDC on Ethereum and transferring to contract...');
  console.log('===============================================================');
  
  try {
    // Set up provider and signer
    // Note: You'll need to set up your own RPC URL and private key
    console.log('⚠️  SETUP REQUIRED:');
    console.log('1. Set ETHEREUM_RPC_URL in environment or update this script');
    console.log('2. Set PRIVATE_KEY in environment or update this script');
    console.log('3. Ensure the account has ETH for gas fees');
    console.log('4. Ensure the account is the owner of the MockUSDC contract');
    
    // For demonstration, showing the commands that would be run:
    console.log('\\n📋 Required Actions:');
    console.log(`✅ MockUSDC Contract: ${MOCK_USDC_ADDRESS}`);
    console.log(`✅ CrossChain Contract: ${CROSS_CHAIN_SWAP_ADDRESS}`);
    
    console.log('\\n🔧 Commands to run (with proper setup):');
    console.log('1. Mint 10000 mUSDC (10000 * 10^6 = 10,000,000,000 units)');
    console.log('2. Transfer 5000 mUSDC to CrossChain contract for liquidity');
    console.log('3. Keep 5000 mUSDC for testing swaps');
    
    // Calculate amounts
    const decimals = 6; // mUSDC has 6 decimals
    const mintAmount = ethers.parseUnits('10000', decimals); // 10,000 mUSDC
    const transferAmount = ethers.parseUnits('5000', decimals); // 5,000 mUSDC to contract
    
    console.log('\\n💰 Amounts:');
    console.log(`Mint Amount: ${mintAmount.toString()} units (10,000 mUSDC)`);
    console.log(`Transfer to Contract: ${transferAmount.toString()} units (5,000 mUSDC)`);
    
    // If environment variables are set, actually execute
    if (process.env.ETHEREUM_RPC_URL && process.env.PRIVATE_KEY) {
      console.log('\\n🚀 Executing transactions...');
      
      const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const mockUSDC = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_ERC20_ABI, signer);
      
      console.log(`📤 Signer address: ${await signer.getAddress()}`);
      
      // Check if signer is owner
      const owner = await mockUSDC.owner();
      const signerAddress = await signer.getAddress();
      console.log(`📋 Contract owner: ${owner}`);
      console.log(`📋 Signer address: ${signerAddress}`);
      
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error('Signer is not the contract owner. Cannot mint tokens.');
      }
      
      // Check current balance
      const currentBalance = await mockUSDC.balanceOf(signerAddress);
      console.log(`💰 Current balance: ${ethers.formatUnits(currentBalance, decimals)} mUSDC`);
      
      // Mint tokens
      console.log('\\n🏭 Minting mUSDC...');
      const mintTx = await mockUSDC.mint(signerAddress, mintAmount);
      console.log(`📝 Mint transaction: ${mintTx.hash}`);
      await mintTx.wait();
      console.log('✅ Mint completed!');
      
      // Check new balance
      const newBalance = await mockUSDC.balanceOf(signerAddress);
      console.log(`💰 New balance: ${ethers.formatUnits(newBalance, decimals)} mUSDC`);
      
      // Transfer to contract
      console.log('\\n📤 Transferring mUSDC to CrossChain contract...');
      const transferTx = await mockUSDC.transfer(CROSS_CHAIN_SWAP_ADDRESS, transferAmount);
      console.log(`📝 Transfer transaction: ${transferTx.hash}`);
      await transferTx.wait();
      console.log('✅ Transfer completed!');
      
      // Check contract balance
      const contractBalance = await mockUSDC.balanceOf(CROSS_CHAIN_SWAP_ADDRESS);
      console.log(`💰 Contract balance: ${ethers.formatUnits(contractBalance, decimals)} mUSDC`);
      
      // Check final user balance
      const finalBalance = await mockUSDC.balanceOf(signerAddress);
      console.log(`💰 Your final balance: ${ethers.formatUnits(finalBalance, decimals)} mUSDC`);
      
      console.log('\\n🎉 Ethereum mUSDC setup completed successfully!');
      
    } else {
      console.log('\\n⚠️  Environment variables not set. Showing demo mode.');
      console.log('\\nTo actually execute:');
      console.log('export ETHEREUM_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"');
      console.log('export PRIVATE_KEY="your_private_key_here"');
      console.log('node ethereum-mint-musdc.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the function
mintAndTransferMUSDC().catch(console.error);