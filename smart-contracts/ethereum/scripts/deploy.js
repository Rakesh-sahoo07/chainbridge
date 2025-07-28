const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy TokenManager
  console.log("\nDeploying TokenManager...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy();
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Deploy CrossChainSwapEthereum
  console.log("\nDeploying CrossChainSwapEthereum...");
  const feeRecipient = deployer.address; // Using deployer as fee recipient for now
  const CrossChainSwapEthereum = await ethers.getContractFactory("CrossChainSwapEthereum");
  const crossChainSwap = await CrossChainSwapEthereum.deploy(feeRecipient);
  await crossChainSwap.waitForDeployment();
  console.log("CrossChainSwapEthereum deployed to:", await crossChainSwap.getAddress());

  // Deploy Mock Tokens for testing
  console.log("\nDeploying Mock Tokens...");
  
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  
  // Deploy USDC Mock
  const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
  await mockUSDC.waitForDeployment();
  console.log("Mock USDC deployed to:", await mockUSDC.getAddress());

  // Deploy USDT Mock
  const mockUSDT = await MockERC20.deploy("Mock USDT", "mUSDT", 6);
  await mockUSDT.waitForDeployment();
  console.log("Mock USDT deployed to:", await mockUSDT.getAddress());

  // Deploy DAI Mock
  const mockDAI = await MockERC20.deploy("Mock DAI", "mDAI", 18);
  await mockDAI.waitForDeployment();
  console.log("Mock DAI deployed to:", await mockDAI.getAddress());

  // Add mock tokens to CrossChainSwap supported tokens
  console.log("\nAdding tokens to CrossChainSwap...");
  await crossChainSwap.addSupportedToken(await mockUSDC.getAddress());
  console.log("Added Mock USDC to supported tokens");
  
  await crossChainSwap.addSupportedToken(await mockUSDT.getAddress());
  console.log("Added Mock USDT to supported tokens");
  
  await crossChainSwap.addSupportedToken(await mockDAI.getAddress());
  console.log("Added Mock DAI to supported tokens");

  // Add tokens to TokenManager
  console.log("\nAdding tokens to TokenManager...");
  
  // Add USDC
  await tokenManager.addToken(
    await mockUSDC.getAddress(),
    "Mock USDC",
    "mUSDC",
    6,
    ethers.parseUnits("1", 6), // min 1 USDC
    ethers.parseUnits("10000", 6) // max 10,000 USDC
  );
  console.log("Added Mock USDC to TokenManager");

  // Add USDT
  await tokenManager.addToken(
    await mockUSDT.getAddress(),
    "Mock USDT",
    "mUSDT",
    6,
    ethers.parseUnits("1", 6), // min 1 USDT
    ethers.parseUnits("10000", 6) // max 10,000 USDT
  );
  console.log("Added Mock USDT to TokenManager");

  // Add DAI
  await tokenManager.addToken(
    await mockDAI.getAddress(),
    "Mock DAI",
    "mDAI",
    18,
    ethers.parseEther("1"), // min 1 DAI
    ethers.parseEther("10000") // max 10,000 DAI
  );
  console.log("Added Mock DAI to TokenManager");

  // Set cross-chain mappings (example Aptos addresses)
  console.log("\nSetting cross-chain mappings...");
  await tokenManager.setCrossChainMapping(
    await mockUSDC.getAddress(),
    "aptos",
    "0x1::aptos_coin::AptosCoin" // Example Aptos address
  );
  console.log("Set USDC cross-chain mapping for Aptos");

  // Mint some tokens to deployer for testing
  console.log("\nMinting test tokens...");
  const mintAmount = ethers.parseUnits("100000", 6); // 100,000 tokens
  const mintAmountDAI = ethers.parseEther("100000"); // 100,000 DAI

  await mockUSDC.mint(deployer.address, mintAmount);
  await mockUSDT.mint(deployer.address, mintAmount);
  await mockDAI.mint(deployer.address, mintAmountDAI);
  console.log("Minted test tokens to deployer");

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("TokenManager:", await tokenManager.getAddress());
  console.log("CrossChainSwapEthereum:", await crossChainSwap.getAddress());
  console.log("Mock USDC:", await mockUSDC.getAddress());
  console.log("Mock USDT:", await mockUSDT.getAddress());
  console.log("Mock DAI:", await mockDAI.getAddress());

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      TokenManager: await tokenManager.getAddress(),
      CrossChainSwapEthereum: await crossChainSwap.getAddress(),
      MockUSDC: await mockUSDC.getAddress(),
      MockUSDT: await mockUSDT.getAddress(),
      MockDAI: await mockDAI.getAddress()
    },
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });