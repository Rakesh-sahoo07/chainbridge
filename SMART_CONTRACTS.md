# Smart Contracts Architecture

## Ethereum Smart Contracts

### 1. CrossChainSwapEthereum.sol
- **Purpose**: Handle Ethereum side of cross-chain swaps
- **Key Functions**:
  - `initiateSwap()` - Lock tokens with hashlock/timelock
  - `completeSwap()` - Complete swap with secret reveal
  - `refund()` - Refund after timelock expiry
  - `getSwapDetails()` - Query swap status

### 2. TokenManager.sol
- **Purpose**: Manage supported tokens and balances
- **Key Functions**:
  - `addSupportedToken()`
  - `removeSupportedToken()`
  - `getTokenBalance()`

## Aptos Smart Contracts (Move)

### 1. CrossChainSwapAptos.move
- **Purpose**: Handle Aptos side of cross-chain swaps
- **Key Features**:
  - Implement hashlock/timelock in Move
  - Resource-based token management
  - Event emission for cross-chain coordination

### 2. TokenRegistry.move
- **Purpose**: Manage Aptos token types and mappings
- **Features**:
  - Token type registration
  - Cross-chain token mapping
  - Balance management

## Key Implementation Details

### Hashlock/Timelock Pattern
```solidity
struct Swap {
    bytes32 hashlock;
    uint256 timelock;
    address initiator;
    address recipient;
    uint256 amount;
    address token;
    bool completed;
    bool refunded;
}
```

### Move Equivalent
```move
struct Swap has key {
    hashlock: vector<u8>,
    timelock: u64,
    initiator: address,
    recipient: address,
    amount: u64,
    completed: bool,
    refunded: bool,
}
```

## Security Considerations
- Reentrancy protection
- Timelock validation
- Hash collision resistance
- Access control mechanisms