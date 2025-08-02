const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Authorizing relayer with deployer account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Contract addresses
  const BRIDGE_ADDRESS = "0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0";
  
  // ⚠️ REPLACE THIS WITH YOUR ACTUAL RELAYER ADDRESS ⚠️
  const RELAYER_ADDRESS = "0xc02165A362fae2A55d4341e71e262D6Ad1c8F301"; 
  
  if (RELAYER_ADDRESS === "REPLACE_WITH_YOUR_ETHEREUM_RELAYER_ADDRESS") {
    console.error("❌ Please replace RELAYER_ADDRESS with your actual relayer address!");
    console.error("   Run this to get your relayer address:");
    console.error("   node -e \"const { ethers } = require('ethers'); const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY'); console.log(wallet.address);\"");
    process.exit(1);
  }

  // Get bridge contract
  const bridge = await ethers.getContractAt("CrossChainBridge", BRIDGE_ADDRESS);
  
  // Check if already authorized
  const isCurrentlyRelayer = await bridge.isRelayer(RELAYER_ADDRESS);
  if (isCurrentlyRelayer) {
    console.log("✅ Address is already an authorized relayer");
    return;
  }

  // Add relayer
  console.log("Adding relayer:", RELAYER_ADDRESS);
  const tx = await bridge.addRelayer(RELAYER_ADDRESS);
  console.log("Transaction submitted:", tx.hash);
  
  // Wait for confirmation
  await tx.wait();
  console.log("✅ Transaction confirmed");
  
  // Verify authorization
  const isRelayer = await bridge.isRelayer(RELAYER_ADDRESS);
  console.log("Verification - Is authorized relayer:", isRelayer);
  
  if (isRelayer) {
    console.log("🎉 Relayer successfully authorized on Ethereum bridge!");
  } else {
    console.error("❌ Relayer authorization failed");
  }

  // Show current relayers (for debugging)
  console.log("\n📊 Bridge status:");
  const owner = await bridge.owner();
  const isOwnerRelayer = await bridge.isRelayer(owner);
  console.log("Contract owner:", owner);
  console.log("Owner is relayer:", isOwnerRelayer);
  console.log("New relayer:", RELAYER_ADDRESS);
  console.log("New relayer authorized:", isRelayer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });