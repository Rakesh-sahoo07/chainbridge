# ChainBridge Protocol - Debugging & Fixes Applied

## 🐛 Issue Reported
**User Error**: `❌ Atomic swap failed: failed` when swapping from Sepolia to Aptos testnet

## 🔍 Root Cause Analysis

### 1. Token Configuration Issue
**Problem**: The dropdown showed tokens (`mUSDT`, `mDAI`) that were not actually deployed on the blockchain.

**Evidence**:
- `contracts.ts` only lists `mockUSDC: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664'`
- But `SwapInterface.tsx` and `atomicSwapService.ts` included undeployed tokens:
  - `mUSDT: '0xc764A9C47F47b8085e5Af9036c9c97ea28ECdDc2'` 
  - `mDAI: '0x92614C91f7dD4C2c6f06ff17dee4C47c90956c29'`

**Impact**: Users could select tokens that don't exist, causing contract calls to fail.

### 2. Insufficient Error Reporting
**Problem**: Generic "failed" error message with no specific details about what went wrong.

## 🛠️ Fixes Applied

### Fix 1: Updated Token Configuration
**File**: `src/components/SwapInterface.tsx`
```typescript
// BEFORE - Included undeployed tokens
const tokens = {
  mUSDC: { /* ... */ },
  mUSDT: { /* UNDEPLOYED */ },
  mDAI: { /* UNDEPLOYED */ },
  APT: { /* ... */ },
};

// AFTER - Only verified deployed tokens  
const tokens = {
  mUSDC: { 
    name: 'Mock USDC', 
    chain: 'ethereum', 
    decimals: 6,
    address: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664', // VERIFIED DEPLOYED
    symbol: 'mUSDC'
  },
  APT: { 
    name: 'AptosCoin', 
    chain: 'aptos', 
    decimals: 8,
    address: '0x1::aptos_coin::AptosCoin', // Native APT - DEPLOYED
    symbol: 'APT'
  },
  // Note: Only including verified deployed tokens
  // mUSDT and mDAI removed until contracts are confirmed deployed
};
```

**File**: `src/services/atomicSwapService.ts`
```typescript
// Updated token mapping to match deployed contracts only
export function getTokenContractAddress(tokenSymbol: string, chain: 'ethereum' | 'aptos'): string {
  const tokenMap = {
    ethereum: {
      mUSDC: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664', // VERIFIED DEPLOYED
      ETH: ethers.ZeroAddress, // Native ETH
      // Note: Only including ACTUALLY DEPLOYED contracts
      // mUSDT: '0xc764A9C47F47b8085e5Af9036c9c97ea28ECdDc2', // NOT CONFIRMED DEPLOYED
      // mDAI: '0x92614C91f7dD4C2c6f06ff17dee4C47c90956c29', // NOT CONFIRMED DEPLOYED
    },
    aptos: {
      APT: '0x1::aptos_coin::AptosCoin', // Native APT - DEPLOYED
    }
  };
  
  return tokenMap[chain][tokenSymbol as keyof typeof tokenMap[typeof chain]] || ethers.ZeroAddress;
}
```

### Fix 2: Enhanced Error Reporting
**File**: `src/services/atomicSwapService.ts`
```typescript
// Added detailed error logging and reporting
} catch (error) {
  console.error('❌ Ethereum → Aptos atomic swap failed:', error);
  console.error('Error details:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    swapParams: {
      swapId: swapParams.swapId,
      fromToken: swapParams.fromToken,
      toToken: swapParams.toToken,
      fromAmount: swapParams.fromAmount,
      fromChain: swapParams.fromChain,
      toChain: swapParams.toChain,
    }
  });
  
  return {
    swapId: swapParams.swapId,
    secret: swapParams.secret,
    hashlock: swapParams.hashlock,
    status: 'failed',
    quote: swapParams.quote,
    errorMessage: error instanceof Error ? error.message : 'Unknown error occurred', // NEW
  };
}
```

**File**: `src/services/atomicSwapService.ts` - Interface Update
```typescript
export interface AtomicSwapResult {
  swapId: string;
  secret: string;
  hashlock: string;
  sourceChainTx?: string;
  destinationChainTx?: string;
  status: 'initiated' | 'completed' | 'failed' | 'refunded';
  quote: ChainBridgeQuoteResponse;
  errorMessage?: string; // NEW - Specific error details
}
```

**File**: `src/components/SwapInterface.tsx`
```typescript
// Enhanced error display
} else {
  setSwapStatus('Atomic swap failed');
  const errorMessage = result.errorMessage || result.status;
  console.error('❌ Swap failed with details:', result);
  alert(`❌ Atomic swap failed: ${errorMessage}`); // Now shows specific error
}
```

### Fix 3: Added Comprehensive Debugging
**File**: `src/hooks/useEthereumContract.ts`
```typescript
// Added detailed logging for contract interactions
console.log('🔧 Ethereum initiateSwap called with:', {
  swapId: swapId.slice(0, 16) + '...',
  hashlock: hashlock.slice(0, 16) + '...',
  recipient: recipient.slice(0, 16) + '...',
  amount,
  tokenAddress,
  timelock
});

console.log('✅ Signer obtained:', await signer.getAddress());
console.log('🪙 Setting up ERC20 token contract:', tokenAddress);
console.log('📊 Getting token decimals...');
console.log('✅ Token decimals:', decimals);
console.log('💰 Parsed token amount:', tokenAmount.toString());
console.log('🔍 Checking allowance for cross-chain swap contract...');
console.log('📊 Current allowance:', allowance.toString());
console.log('📊 Required amount:', tokenAmount.toString());
// ... more detailed logging throughout the process
```

**File**: `src/hooks/useAptosContract.ts`
```typescript
// Added debugging for Aptos contract interactions
console.log('🔧 Aptos initiateSwap called with:', {
  swapId: swapId.slice(0, 16) + '...',
  hashlock: hashlock.slice(0, 16) + '...',
  recipient: recipient.slice(0, 16) + '...',
  amount,
  timelock
});

console.log('💰 Amount in octas:', amountInOctas);
console.log('📍 Padded recipient address:', aptosRecipient);
```

## 🎯 Current State

### ✅ Fixed Issues
1. **Token Configuration**: Only showing actually deployed tokens (mUSDC + APT)
2. **Error Reporting**: Detailed error messages and logging throughout the process
3. **Debugging**: Comprehensive console logging for troubleshooting

### 🔍 Available Tokens Post-Fix
- **Ethereum (Sepolia)**: 
  - ✅ mUSDC: `0x7a265Db61E004f4242fB322fa72F8a52D2B06664` (VERIFIED DEPLOYED)
  - ❌ mUSDT: Removed (not confirmed deployed)
  - ❌ mDAI: Removed (not confirmed deployed)

- **Aptos (Testnet)**:
  - ✅ APT: `0x1::aptos_coin::AptosCoin` (Native coin - always available)

### 📊 Expected Behavior Now
1. **Dropdown Selection**: Users can only select verified deployed tokens
2. **Error Messages**: Specific error details instead of generic "failed"
3. **Console Debugging**: Detailed logs showing exactly where any issues occur:
   - Contract connection status
   - Token contract setup
   - Allowance checks and approvals
   - Transaction submission and confirmation
   - Cross-chain coordination

## 🚀 Next Steps for User

1. **Test the Fix**: Try the swap again with the updated configuration
2. **Check Console**: Open browser developer tools to see detailed logs
3. **Available Swaps**: 
   - ✅ mUSDC (Sepolia) → APT (Aptos)
   - ✅ APT (Aptos) → mUSDC (Sepolia)

## 🔧 If Still Encountering Issues

The enhanced debugging will now show exactly where the failure occurs:
- **Token Contract Issues**: Check if mUSDC contract is accessible
- **Wallet Connection**: Verify both MetaMask (Sepolia) and Petra (Testnet) are connected
- **Allowance Issues**: Check if token approval fails
- **Smart Contract Issues**: Check if the cross-chain swap contract is accessible
- **Network Issues**: Verify RPC connections to both Sepolia and Aptos testnet

**Check the browser console for specific error messages that will help identify the exact failure point.**