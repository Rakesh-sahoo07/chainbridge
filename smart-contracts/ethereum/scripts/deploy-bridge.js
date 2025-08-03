const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying Bridge contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get existing Mock USDC address (already deployed)
  const MOCK_USDC_ADDRESS = "0x7a265Db61E004f4242fB322fa72F8a52D2B06664";
  console.log("Using existing Mock USDC at:", MOCK_USDC_ADDRESS);

  // Deploy CrossChainBridge
  console.log("\nDeploying CrossChainBridge...");
  const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
  const bridge = await CrossChainBridge.deploy(MOCK_USDC_ADDRESS);
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("CrossChainBridge deployed to:", bridgeAddress);

  // Verify the bridge setup
  console.log("\nVerifying bridge setup...");
  const isOwnerRelayer = await bridge.isRelayer(deployer.address);
  const isMockUSDCSupported = await bridge.supportedTokens(MOCK_USDC_ADDRESS);
  
  console.log("Owner is relayer:", isOwnerRelayer);
  console.log("Mock USDC is supported:", isMockUSDCSupported);

  // Get bridge reserves info
  const reserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
  console.log("Current reserves:", {
    balance: reserves.balance.toString(),
    totalBridgedIn: reserves.totalBridgedIn.toString(),
    totalBridgedOut: reserves.totalBridgedOut.toString(),
    feesCollected: reserves.feesCollected.toString()
  });

  console.log("\n=== Bridge Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("CrossChainBridge:", bridgeAddress);
  console.log("Mock USDC:", MOCK_USDC_ADDRESS);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      CrossChainBridge: bridgeAddress,
      MockUSDC: MOCK_USDC_ADDRESS
    },
    timestamp: new Date().toISOString(),
    bridgeFeatures: {
      singleSidedSwaps: true,
      liquidityPools: true,
      automaticRelease: true,
      supportedTokens: ["mUSDC"]
    }
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));

  // Instructions for next steps
  console.log("\n=== Next Steps ===");
  console.log("1. Fund bridge with mUSDC reserves:");
  console.log(`   bridge.addReserves("${MOCK_USDC_ADDRESS}", amount)`);
  console.log("2. Update frontend contract addresses");
  console.log("3. Test single-sided swaps!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });