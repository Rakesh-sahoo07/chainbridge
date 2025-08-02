# 🚀 Bridge Deployment Instructions

## ✅ **Current Status:**
- **Aptos Bridge**: ✅ DEPLOYED
  - Transaction: `0x2a05ba0fda176fc1c5f7d69aa841ad0c848cb88eff026f6384c210b5a0112192`
  - Address: `0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge`

- **Ethereum Bridge**: ✅ COMPILED, ready to deploy

## 🔧 **Deploy Ethereum Bridge:**

### **Command:**
```bash
cd /Users/rakeshsahoo/Documents/1inchETH/smart-contracts/ethereum
npx hardhat run scripts/deploy-bridge.js --network sepolia
```

### **Expected Output:**
```
CrossChainBridge deployed to: 0x[NEW_ADDRESS]
Mock USDC: 0x7a265Db61E004f4242fB322fa72F8a52D2B06664
```

## 💰 **Fund Bridge Contracts:**

### **1. Fund Aptos Bridge:**
```bash
cd /Users/rakeshsahoo/Documents/1inchETH/smart-contracts/aptos

# Add 5000 mUSDC reserves to Aptos bridge
aptos move run --function-id 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge::add_musdc_reserves --args u64:5000000000 --assume-yes
```

### **2. Fund Ethereum Bridge:**
```bash
# First approve bridge to spend your mUSDC
# Then add reserves (replace [BRIDGE_ADDRESS] with deployed address)
npx hardhat run scripts/fund-bridge.js --network sepolia
```

## 📝 **Update Frontend Contract Addresses:**

Update `/Users/rakeshsahoo/Documents/1inchETH/frontend/src/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES: ContractAddresses = {
  ethereum: {
    crossChainSwap: '[OLD_ADDRESS]', // Keep for reference
    crossChainBridge: '[NEW_BRIDGE_ADDRESS]', // Add this line
    mockUSDC: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
  },
  aptos: {
    crossChainSwap: '[OLD_ADDRESS]', // Keep for reference  
    crossChainBridge: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge', // Add this
  },
};
```

## 🧪 **Test Single-Sided Swaps:**

### **ETH → Aptos (Single Approval):**
1. User approves MetaMask transaction
2. Bridge automatically releases from Aptos reserves
3. Done! ✅

### **Aptos → ETH (Single Approval):**
1. User approves Petra transaction  
2. Bridge automatically releases from Ethereum reserves
3. Done! ✅

## 🎯 **New User Experience:**

### **Before (Complex P2P):**
```
ETH → Aptos: 
❌ 4 transactions (2 MetaMask + 2 Petra)
❌ Complex atomic swap flow
❌ User needs tokens on both chains
```

### **After (Simple Bridge):**
```
ETH → Aptos:
✅ 1 transaction (MetaMask only)
✅ Simple deposit to bridge
✅ Automatic release from reserves
```

## 📋 **What You Need To Do:**

1. **Deploy Ethereum Bridge** (run the deploy command above)
2. **Fund Both Bridges** with mUSDC reserves  
3. **Update Frontend** with new contract addresses
4. **Test** the single-sided flow!

## 🔥 **Result:**
Users will only need **ONE wallet approval** instead of multiple transactions across both chains! 🎉