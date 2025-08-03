const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔧 Fixing CrossChainBridge setup...");
  console.log("Deployer address:", deployer.address);

  // Contract addresses
  const BRIDGE_ADDRESS = "0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0";
  const MOCK_USDC_ADDRESS = "0x7a265Db61E004f4242fB322fa72F8a52D2B06664";
  const RELAYER_ADDRESS = process.env.RELAYER_ETH_ADDRESS || deployer.address;
  
  console.log("Bridge address:", BRIDGE_ADDRESS);
  console.log("Mock USDC address:", MOCK_USDC_ADDRESS);
  console.log("Relayer address:", RELAYER_ADDRESS);

  // Get contract instances
  const bridge = await ethers.getContractAt("CrossChainBridge", BRIDGE_ADDRESS);
  const mockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC_ADDRESS);

  console.log("\n📊 Current Bridge Status:");
  
  // 1. Check if relayer is authorized
  const isRelayerAuthorized = await bridge.isRelayer(RELAYER_ADDRESS);
  console.log("Relayer authorized:", isRelayerAuthorized ? "✅" : "❌");
  
  // 2. Check bridge reserves
  const reserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
  console.log("Bridge reserves:", {
    balance: ethers.formatUnits(reserves.balance, 6) + " mUSDC",
    totalBridgedIn: ethers.formatUnits(reserves.totalBridgedIn, 6) + " mUSDC",
    totalBridgedOut: ethers.formatUnits(reserves.totalBridgedOut, 6) + " mUSDC",
    feesCollected: ethers.formatUnits(reserves.feesCollected, 6) + " mUSDC"
  });

  // 3. Check contract balance
  const contractBalance = await mockUSDC.balanceOf(BRIDGE_ADDRESS);
  console.log("Contract mUSDC balance:", ethers.formatUnits(contractBalance, 6), "mUSDC");

  // 4. Check if bridge is paused
  const isPaused = await bridge.bridgePaused();
  console.log("Bridge paused:", isPaused ? "❌ YES" : "✅ NO");

  // 5. Check deployer's mUSDC balance
  const deployerBalance = await mockUSDC.balanceOf(deployer.address);
  console.log("Deployer mUSDC balance:", ethers.formatUnits(deployerBalance, 6), "mUSDC");

  console.log("\n🔧 Fixing Issues:");

  // Fix 1: Authorize relayer if not authorized
  if (!isRelayerAuthorized) {
    console.log("➡️  Authorizing relayer...");
    try {
      const authTx = await bridge.addRelayer(RELAYER_ADDRESS);
      await authTx.wait();
      console.log("✅ Relayer authorized!");
    } catch (error) {
      console.error("❌ Failed to authorize relayer:", error.message);
    }
  }

  // Fix 2: Add reserves if low (less than 1000 mUSDC)
  const minReserves = ethers.parseUnits("1000", 6); // 1000 mUSDC
  if (reserves.balance < minReserves) {
    console.log("➡️  Bridge reserves are low, adding 5000 mUSDC...");
    
    const addAmount = ethers.parseUnits("5000", 6);
    
    // Mint if deployer doesn't have enough
    if (deployerBalance < addAmount) {
      console.log("➡️  Minting mUSDC to deployer...");
      const mintTx = await mockUSDC.mint(deployer.address, addAmount);
      await mintTx.wait();
      console.log("✅ Minted 5000 mUSDC");
    }
    
    // Approve bridge to spend
    console.log("➡️  Approving bridge to spend mUSDC...");
    const approveTx = await mockUSDC.approve(BRIDGE_ADDRESS, addAmount);
    await approveTx.wait();
    console.log("✅ Approved bridge to spend mUSDC");
    
    // Add reserves
    console.log("➡️  Adding reserves to bridge...");
    const addReservesTx = await bridge.addReserves(MOCK_USDC_ADDRESS, addAmount);
    await addReservesTx.wait();
    console.log("✅ Added 5000 mUSDC reserves!");
  }

  // Fix 3: Unpause bridge if paused
  if (isPaused) {
    console.log("➡️  Unpausing bridge...");
    const unpauseTx = await bridge.unpauseBridge();
    await unpauseTx.wait();
    console.log("✅ Bridge unpaused!");
  }

  // Final status check
  console.log("\n📊 Final Bridge Status:");
  const finalReserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
  const finalIsRelayerAuth = await bridge.isRelayer(RELAYER_ADDRESS);
  const finalIsPaused = await bridge.bridgePaused();
  
  console.log("Relayer authorized:", finalIsRelayerAuth ? "✅" : "❌");
  console.log("Bridge reserves:", ethers.formatUnits(finalReserves.balance, 6), "mUSDC");
  console.log("Bridge paused:", finalIsPaused ? "❌ YES" : "✅ NO");

  console.log("\n🎉 Bridge setup is now ready for Aptos→Ethereum transfers!");
  
  // Test the processAptosToEthereum function availability
  console.log("\n🧪 Testing function availability:");
  try {
    // This will just check if the function exists without calling it
    const functionFragment = bridge.interface.getFunction("processAptosToEthereum");
    console.log("✅ processAptosToEthereum function found in contract");
    console.log("Function signature:", functionFragment.format());
  } catch (error) {
    console.error("❌ processAptosToEthereum function not found:", error.message);
  }
}

// Run the fix
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ Bridge setup complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    });
}

module.exports = { main };