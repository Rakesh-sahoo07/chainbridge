const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Funding bridge with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Contract addresses
  const BRIDGE_ADDRESS = "0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0";
  const MOCK_USDC_ADDRESS = "0x7a265Db61E004f4242fB322fa72F8a52D2B06664";

  // Get contracts
  const mockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC_ADDRESS);
  const bridge = await ethers.getContractAt("CrossChainBridge", BRIDGE_ADDRESS);

  // Check deployer's mUSDC balance
  const balance = await mockUSDC.balanceOf(deployer.address);
  console.log("Deployer mUSDC balance:", ethers.formatUnits(balance, 6));

  // Amount to fund bridge (5000 mUSDC)
  const fundAmount = ethers.parseUnits("5000", 6);
  console.log("Funding amount:", ethers.formatUnits(fundAmount, 6), "mUSDC");

  // Check if deployer has enough balance
  if (balance < fundAmount) {
    console.log("Insufficient balance, minting more mUSDC...");
    const mintAmount = ethers.parseUnits("10000", 6);
    await mockUSDC.mint(deployer.address, mintAmount);
    console.log("Minted", ethers.formatUnits(mintAmount, 6), "mUSDC");
  }

  // Approve bridge to spend mUSDC
  console.log("\n1. Approving bridge to spend mUSDC...");
  const approveTx = await mockUSDC.approve(BRIDGE_ADDRESS, fundAmount);
  await approveTx.wait();
  console.log("✅ Approved bridge to spend", ethers.formatUnits(fundAmount, 6), "mUSDC");

  // Add reserves to bridge
  console.log("\n2. Adding reserves to bridge...");
  const addReservesTx = await bridge.addReserves(MOCK_USDC_ADDRESS, fundAmount);
  await addReservesTx.wait();
  console.log("✅ Added", ethers.formatUnits(fundAmount, 6), "mUSDC reserves to bridge");

  // Verify reserves
  console.log("\n3. Verifying bridge reserves...");
  const reserves = await bridge.getReserves(MOCK_USDC_ADDRESS);
  console.log("Bridge reserves:", {
    balance: ethers.formatUnits(reserves.balance, 6),
    totalBridgedIn: ethers.formatUnits(reserves.totalBridgedIn, 6),
    totalBridgedOut: ethers.formatUnits(reserves.totalBridgedOut, 6),
    feesCollected: ethers.formatUnits(reserves.feesCollected, 6)
  });

  console.log("\n=== Ethereum Bridge Funding Complete ===");
  console.log("Bridge Address:", BRIDGE_ADDRESS);
  console.log("mUSDC Reserves:", ethers.formatUnits(reserves.balance, 6));
  console.log("Ready for single-sided swaps! 🎉");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });