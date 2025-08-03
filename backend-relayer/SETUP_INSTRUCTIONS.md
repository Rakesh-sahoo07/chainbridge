# 🚀 Manual Relayer Setup & Testing

Since automated setup isn't working, here are the **exact commands** to run manually:

## 📦 **Step 1: Install Dependencies**

```bash
cd /Users/rakeshsahoo/Documents/1inchETH/backend-relayer
npm install ethers@^6.7.1 aptos@^1.21.0 dotenv@^16.3.1 nodemon@^3.0.1
```

## ⚙️ **Step 2: Configure Environment**

```bash
cp .env.example .env
```

Then edit `.env` with your **actual private keys**:

```bash
# Ethereum Configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
RELAYER_PRIVATE_KEY=0xYOUR_ETHEREUM_PRIVATE_KEY

# Aptos Configuration  
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
APTOS_RELAYER_PRIVATE_KEY=0xYOUR_APTOS_PRIVATE_KEY
```

## 🔑 **Step 3: Authorize Relayer Wallets**

The relayer addresses must be added as authorized relayers on both contracts.

### **Get your relayer addresses:**
```bash
node -e "
const { ethers } = require('ethers');
const { AptosAccount, HexString } = require('aptos');

const ethWallet = new ethers.Wallet('0xYOUR_ETHEREUM_PRIVATE_KEY');
const aptosAccount = new AptosAccount(HexString.ensure('0xYOUR_APTOS_PRIVATE_KEY').toUint8Array());

console.log('Ethereum Relayer Address:', ethWallet.address);
console.log('Aptos Relayer Address:', aptosAccount.address());
"
```

### **Authorize on Ethereum:**
```bash
cd /Users/rakeshsahoo/Documents/1inchETH/smart-contracts/ethereum

# Create authorization script
cat > authorize-relayer.js << 'EOF'
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const BRIDGE_ADDRESS = "0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0";
  const RELAYER_ADDRESS = "YOUR_ETHEREUM_RELAYER_ADDRESS"; // Replace with actual address
  
  const bridge = await ethers.getContractAt("CrossChainBridge", BRIDGE_ADDRESS);
  
  console.log("Adding relayer:", RELAYER_ADDRESS);
  const tx = await bridge.addRelayer(RELAYER_ADDRESS);
  await tx.wait();
  
  console.log("✅ Relayer authorized on Ethereum");
  
  // Verify
  const isRelayer = await bridge.isRelayer(RELAYER_ADDRESS);
  console.log("Verification - Is relayer:", isRelayer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
EOF

# Run authorization (replace YOUR_ETHEREUM_RELAYER_ADDRESS first!)
npx hardhat run authorize-relayer.js --network sepolia
```

### **Authorize on Aptos:**
```bash
cd /Users/rakeshsahoo/Documents/1inchETH/smart-contracts/aptos

# Replace YOUR_APTOS_RELAYER_ADDRESS with actual address
aptos move run \
  --function-id 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge::add_relayer \
  --args address:YOUR_APTOS_RELAYER_ADDRESS \
  --assume-yes
```

## 🚀 **Step 4: Test Relayer Connection**

```bash
cd /Users/rakeshsahoo/Documents/1inchETH/backend-relayer

# Test connection
node -e "
const { CrossChainBridgeRelayer } = require('./relayer.js');

async function test() {
  try {
    const relayer = new CrossChainBridgeRelayer();
    const status = await relayer.getStatus();
    console.log('✅ Relayer Status:', JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('❌ Relayer Error:', error.message);
  }
}

test();
"
```

## 🎬 **Step 5: Start the Relayer**

```bash
cd /Users/rakeshsahoo/Documents/1inchETH/backend-relayer
node relayer.js
```

You should see:
```
🌉 Bridge Relayer initialized
📡 Ethereum Bridge: 0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0
🟣 Aptos Bridge: 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge
🚀 Starting Cross-Chain Bridge Relayer...
👀 Monitoring Ethereum bridge events...
✅ Bridge Relayer started successfully
```

## 🧪 **Step 6: Test End-to-End Bridge**

1. **Keep relayer running** in one terminal
2. **Start frontend** in another terminal:
   ```bash
   cd /Users/rakeshsahoo/Documents/1inchETH/frontend
   npm start
   ```
3. **Open browser** to `http://localhost:3000`
4. **Connect both wallets** (MetaMask + Petra)
5. **Bridge 1 mUSDC** from Ethereum to Aptos
6. **Watch relayer logs** for event detection
7. **Monitor frontend** for real-time progress

## 📊 **Expected Flow:**

```
Frontend: User clicks "Bridge Tokens"
    ↓
Frontend: "Confirming transaction..."
    ↓
Relayer logs: "📢 Ethereum BridgeRequestCreated event detected"
    ↓  
Relayer logs: "🔍 Verifying Ethereum lock..."
    ↓
Relayer logs: "✅ Ethereum lock verification successful"
    ↓
Relayer logs: "🔄 Processing ETH→Aptos bridge release..."
    ↓
Relayer logs: "📤 Aptos transaction submitted: 0x..."
    ↓
Frontend: "🎉 Bridge completed! Tokens released on Aptos"
    ↓
User receives mUSDC on Aptos! 🎉
```

## 🔧 **Troubleshooting:**

**If relayer can't connect:**
- Check private keys are correct
- Verify RPC URLs work
- Ensure wallets have gas fees (ETH/APT)

**If authorization fails:**
- Make sure deployer wallet is used
- Verify contract addresses are correct
- Check network matches (Sepolia/Aptos testnet)

**If events aren't detected:**
- Check Ethereum RPC is working
- Verify bridge contract address
- Ensure event filters are correct

Ready to test! 🚀