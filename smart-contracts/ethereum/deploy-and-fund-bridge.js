const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying and funding new CrossChainBridge...");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Contract addresses
  const MOCK_USDC_ADDRESS = "0x7a265Db61E004f4242fB322fa72F8a52D2B06664";
  
  console.log("Using Mock USDC at:", MOCK_USDC_ADDRESS);

  // 1. Deploy new CrossChainBridge
  console.log("\n📄 Deploying CrossChainBridge contract...");
  const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
  const bridge = await CrossChainBridge.deploy(MOCK_USDC_ADDRESS);
  await bridge.waitForDeployment();
  
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ CrossChainBridge deployed to:", bridgeAddress);

  // 2. Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const isOwnerRelayer = await bridge.isRelayer(deployer.address);
  const isMockUSDCSupported = await bridge.supportedTokens(MOCK_USDC_ADDRESS);
  
  console.log("Owner is relayer:", isOwnerRelayer ? "✅" : "❌");
  console.log("Mock USDC supported:", isMockUSDCSupported ? "✅" : "❌");

  // 3. Check current mUSDC balance
  const mockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC_ADDRESS);
  const deployerBalance = await mockUSDC.balanceOf(deployer.address);
  console.log("Deployer mUSDC balance:", ethers.formatUnits(deployerBalance, 6), "mUSDC");

  // 4. Mint 5000 mUSDC if needed
  const requiredAmount = ethers.parseUnits("5000", 6); // 5000 mUSDC
  if (deployerBalance < requiredAmount) {
    console.log("\n💰 Minting 5000 mUSDC...");
    const mintTx = await mockUSDC.mint(deployer.address, requiredAmount);
    await mintTx.wait();
    console.log("✅ Minted 5000 mUSDC to deployer");
  }

  // 5. Approve bridge to spend mUSDC
  console.log("\n📝 Approving bridge to spend mUSDC...");
  const approveTx = await mockUSDC.approve(bridgeAddress, requiredAmount);
  await approveTx.wait();
  console.log("✅ Approved bridge to spend 5000 mUSDC");

  // 6. Add reserves to bridge
  console.log("\n🏦 Adding 5000 mUSDC reserves to bridge...");
  const addReservesTx = await bridge.addReserves(MOCK_USDC_ADDRESS, requiredAmount);
  await addReservesTx.wait();
  console.log("✅ Added 5000 mUSDC reserves to bridge");

  // 7. Verify reserves
  console.log("\n📊 Checking bridge reserves...");
  const reserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
  console.log("Bridge reserves:", {
    balance: ethers.formatUnits(reserves.balance, 6) + " mUSDC",
    totalBridgedIn: ethers.formatUnits(reserves.totalBridgedIn, 6) + " mUSDC", 
    totalBridgedOut: ethers.formatUnits(reserves.totalBridgedOut, 6) + " mUSDC",
    feesCollected: ethers.formatUnits(reserves.feesCollected, 6) + " mUSDC"
  });

  // 8. Contract balance verification
  const contractBalance = await mockUSDC.balanceOf(bridgeAddress);
  console.log("Contract mUSDC balance:", ethers.formatUnits(contractBalance, 6), "mUSDC");

  // 9. Deployment summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(50));
  console.log("New CrossChainBridge Address:", bridgeAddress);
  console.log("Mock USDC Address:", MOCK_USDC_ADDRESS);
  console.log("Bridge Reserves:", ethers.formatUnits(reserves.balance, 6), "mUSDC");
  console.log("Bridge Owner/Relayer:", deployer.address);
  console.log("=".repeat(50));

  // 10. Update instructions
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Update contract addresses in:");
  console.log("   - /Users/rakeshsahoo/Documents/1inchETH/frontend/src/config/contracts.ts");
  console.log("   - /Users/rakeshsahoo/Documents/1inchETH/backend-relayer/fixed-relayer.js");
  console.log("");
  console.log("2. Update contract addresses to:");
  console.log(`   crossChainBridge: "${bridgeAddress}"`);
  console.log("");
  console.log("3. Add your relayer address as authorized:");
  console.log("4. Test the bridges!");

  return {
    bridgeAddress,
    mockUSDCAddress: MOCK_USDC_ADDRESS,
    reserves: reserves.balance
  };
}

// Run deployment
if (require.main === module) {
  main()
    .then((result) => {
      console.log("\n✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = { main };