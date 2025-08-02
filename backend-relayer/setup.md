# 🌉 Bridge Relayer Setup Guide

The Bridge Relayer is the **critical backend service** that enables cross-chain transfers by:

1. **Monitoring Ethereum bridge events** when users deposit tokens
2. **Verifying tokens are actually locked** in the bridge contract  
3. **Triggering token release** from Aptos bridge reserves
4. **Processing both directions** (ETH↔Aptos)

## 🔧 **How It Works:**

```
User deposits 10 mUSDC on Ethereum
         ↓
Ethereum emits BridgeRequestCreated event
         ↓  
Relayer detects event & verifies lock
         ↓
Relayer calls Aptos process_ethereum_to_aptos_musdc()
         ↓
User receives 10 mUSDC from Aptos reserves
```

## 📦 **Installation:**

```bash
cd backend-relayer
npm install
cp .env.example .env
```

## ⚙️ **Configuration:**

Edit `.env` file:

```bash
# Ethereum Configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
RELAYER_PRIVATE_KEY=0x1234567890abcdef... # Must be authorized relayer

# Aptos Configuration  
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
APTOS_RELAYER_PRIVATE_KEY=0x1234567890abcdef... # Must be authorized relayer
```

## 🔑 **Important Notes:**

### **Relayer Authorization:**
The relayer wallet must be added as an authorized relayer on both contracts:

**Ethereum:**
```solidity
// Only contract owner can add relayers
bridge.addRelayer(RELAYER_ADDRESS);
```

**Aptos:**
```move
// Only contract owner can add relayers  
aptos move run --function-id BRIDGE_MODULE::add_relayer --args address:RELAYER_ADDRESS
```

### **Funding Requirements:**
- **Ethereum wallet**: Needs ETH for gas fees
- **Aptos wallet**: Needs APT for gas fees
- **Bridge reserves**: Must be funded with mUSDC on both sides

## 🚀 **Running the Relayer:**

```bash
# Start the relayer
npm start

# Check health status
npm run health

# Development mode (auto-restart)
npm run dev
```

## 📊 **Monitoring:**

The relayer logs all activities:

```
🌉 Bridge Relayer initialized
📡 Ethereum Bridge: 0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0
🟣 Aptos Bridge: 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge
🚀 Starting Cross-Chain Bridge Relayer...
👀 Monitoring Ethereum bridge events...

📢 Ethereum BridgeRequestCreated event detected:
   requestId: 0x1234...
   user: 0xabc...
   amount: 10.0 mUSDC
   destination: aptos

🔍 Verifying Ethereum lock...
✅ Ethereum lock verification successful

🔄 Processing ETH→Aptos bridge release...
📤 Aptos transaction submitted: 0x5678...
✅ Aptos transaction confirmed
🎉 ETH→Aptos bridge completed successfully!
```

## 🔒 **Security Features:**

1. **Lock Verification**: Always verifies tokens are actually locked before releasing
2. **Duplicate Prevention**: Prevents processing the same request twice
3. **Amount Matching**: Ensures exact amount is released (no more, no less)
4. **Authorization**: Only authorized relayers can process transfers
5. **Historical Processing**: Catches up on missed events when restarted

## 🏗️ **Production Deployment:**

For production, consider:

1. **Multiple Relayers**: Deploy multiple instances for redundancy
2. **Monitoring**: Set up alerts for failed transactions
3. **Backup Keys**: Secure backup of relayer private keys
4. **Auto-restart**: Use PM2 or similar for auto-restart
5. **Load Balancing**: Distribute across multiple servers

## 🧪 **Testing:**

```bash
# Test the verification flow
node -e "
const {CrossChainBridgeRelayer} = require('./relayer.js');
const relayer = new CrossChainBridgeRelayer();
relayer.getStatus().then(console.log);
"
```

This will show if the relayer can connect to both chains and access the contracts.

## ⚡ **Ready to Bridge!**

Once the relayer is running:
1. Users see **real-time progress** in the frontend
2. **Automatic processing** of cross-chain transfers  
3. **Sub-minute completion** times
4. **Perfect 1:1 transfers** with verification

The bridge is now fully operational! 🎉