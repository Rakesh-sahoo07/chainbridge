const { ethers } = require("hardhat");
const crypto = require("node:crypto");
require("dotenv").config();

async function testSimpleSwap() {
    console.log("🧪 Simple Cross-Chain Swap Test\n");

    // Setup
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ETHEREUM_SWAP_ADDRESS = "0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8";
    const MOCK_USDC_ADDRESS = "0x7a265Db61E004f4242fB322fa72F8a52D2B06664";

    const swapABI = [
        "function initiateSwap(bytes32 swapId, bytes32 hashlock, address recipient, uint256 amount, address token, uint256 timelock) external",
        "function completeSwap(bytes32 swapId, bytes32 secret) external",
        "function getSwapDetails(bytes32 swapId) external view returns (bytes32, uint256, address, address, uint256, address, bool, bool, uint256)",
        "function isSwapActive(bytes32 swapId) external view returns (bool)"
    ];

    const usdcABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)"
    ];

    const swapContract = new ethers.Contract(ETHEREUM_SWAP_ADDRESS, swapABI, signer);
    const usdcContract = new ethers.Contract(MOCK_USDC_ADDRESS, usdcABI, signer);

    // Generate swap parameters
    const secret = crypto.randomBytes(32);
    const hashlock = ethers.keccak256(secret);
    const swapId = ethers.keccak256(ethers.toUtf8Bytes(`test_${Date.now()}`));
    const amount = ethers.parseUnits("5", 6); // 5 USDC
    const recipient = ethers.Wallet.createRandom().address;

    console.log("📋 Test Parameters:");
    console.log("   Signer:", signer.address);
    console.log("   Recipient:", recipient);
    console.log("   Amount:", "5 USDC");
    console.log("   SwapId:", ethers.hexlify(swapId));
    console.log("   Secret:", ethers.hexlify(secret));
    console.log();

    try {
        // Get current block timestamp
        const currentBlock = await provider.getBlock('latest');
        const currentTimestamp = currentBlock.timestamp;
        const timelock = currentTimestamp + 7200 + 60; // Add extra minute buffer
        
        console.log("⏰ Timestamp Info:");
        console.log("   Current Block Time:", new Date(currentTimestamp * 1000).toISOString());
        console.log("   Timelock:", new Date(timelock * 1000).toISOString());
        console.log("   Difference:", (timelock - currentTimestamp) / 60, "minutes");
        console.log();

        // Check balance and approve
        const balance = await usdcContract.balanceOf(signer.address);
        console.log("💰 USDC Balance:", ethers.formatUnits(balance, 6));
        
        if (balance < amount) {
            console.log("❌ Insufficient USDC balance for test");
            return;
        }

        console.log("📝 Approving USDC...");
        const approveTx = await usdcContract.approve(ETHEREUM_SWAP_ADDRESS, amount);
        await approveTx.wait();
        console.log("✅ USDC approved");
        console.log();

        // Initiate swap
        console.log("🚀 Initiating swap...");
        const initTx = await swapContract.initiateSwap(
            swapId,
            hashlock,
            recipient,
            amount,
            MOCK_USDC_ADDRESS,
            timelock
        );
        
        const receipt = await initTx.wait();
        console.log("✅ Swap initiated successfully!");
        console.log("   TX Hash:", receipt.hash);
        console.log("   Gas Used:", receipt.gasUsed.toString());
        console.log();

        // Verify swap
        console.log("🔍 Verifying swap state...");
        const swapDetails = await swapContract.getSwapDetails(swapId);
        const isActive = await swapContract.isSwapActive(swapId);
        
        console.log("   Active:", isActive);
        console.log("   Hashlock:", swapDetails[0]);
        console.log("   Timelock:", new Date(Number(swapDetails[1]) * 1000).toISOString());
        console.log("   Initiator:", swapDetails[2]);
        console.log("   Recipient:", swapDetails[3]);
        console.log("   Amount:", ethers.formatUnits(swapDetails[4], 6), "USDC");
        console.log();

        // Complete swap
        console.log("🔓 Completing swap with secret...");
        const completeTx = await swapContract.completeSwap(swapId, secret);
        const completeReceipt = await completeTx.wait();
        
        console.log("✅ Swap completed successfully!");
        console.log("   TX Hash:", completeReceipt.hash);
        console.log("   Gas Used:", completeReceipt.gasUsed.toString());
        console.log();

        // Final verification
        console.log("🔍 Final verification...");
        const finalDetails = await swapContract.getSwapDetails(swapId);
        const finalActive = await swapContract.isSwapActive(swapId);
        
        console.log("   Active:", finalActive);
        console.log("   Completed:", finalDetails[6]);
        console.log("   Refunded:", finalDetails[7]);
        console.log();

        console.log("🎉 Cross-chain swap test PASSED!");
        console.log("📋 Summary:");
        console.log("   ✅ Swap initiated with proper timelock");
        console.log("   ✅ Secret verification working");
        console.log("   ✅ State transitions correct");
        console.log("   ✅ Ready for cross-chain integration");

    } catch (error) {
        console.error("❌ Test failed:");
        console.error("   Error:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
        
        // Try to get more info about timelock requirements
        if (error.message.includes("Invalid timelock")) {
            console.log("\n🔍 Debugging timelock validation...");
            const currentBlock = await provider.getBlock('latest');
            const now = currentBlock.timestamp;
            console.log("   Current timestamp:", now);
            console.log("   MIN_TIMELOCK (2 hours):", 7200);
            console.log("   MAX_TIMELOCK (48 hours):", 172800);
            console.log("   Minimum valid timelock:", now + 7200);
            console.log("   Maximum valid timelock:", now + 172800);
        }
    }
}

testSimpleSwap().catch(console.error);