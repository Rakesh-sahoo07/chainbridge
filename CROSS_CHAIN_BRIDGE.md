# Cross-Chain Bridge Logic

## Overview
Implement atomic cross-chain swaps using hashlock/timelock mechanism to ensure trustless token exchanges between Ethereum and Aptos.

## Atomic Swap Protocol

### Phase 1: Initiation (Ethereum → Aptos)
1. User initiates swap on Ethereum
2. Generate secret and hash
3. Lock tokens with hashlock/timelock on Ethereum
4. Emit event with swap details

### Phase 2: Commitment (Aptos)
1. Monitor Ethereum events
2. User commits equivalent tokens on Aptos
3. Use same hashlock, appropriate timelock
4. Lock tokens in Aptos contract

### Phase 3: Completion
1. User reveals secret on Aptos to claim tokens
2. Secret becomes public on Aptos blockchain
3. Anyone can use secret to complete Ethereum side
4. Both swaps complete atomically

### Phase 4: Refund (if needed)
1. If timelock expires without completion
2. Both parties can refund their locked tokens
3. Swap fails safely without loss

## Technical Implementation

### Hashlock Generation
```typescript
// Frontend generates secret and hash
const secret = crypto.randomBytes(32);
const hashlock = keccak256(secret);
```

### Timelock Calculation
```typescript
// Ethereum timelock (longer for safety)
const ethereumTimelock = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours

// Aptos timelock (shorter to encourage completion)
const aptosTimelock = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 hours
```

## Event Monitoring

### Ethereum Events
```solidity
event SwapInitiated(
    bytes32 indexed swapId,
    bytes32 indexed hashlock,
    address indexed initiator,
    address recipient,
    uint256 amount,
    address token,
    uint256 timelock
);
```

### Aptos Events
```move
struct SwapInitiated has drop, store {
    swap_id: vector<u8>,
    hashlock: vector<u8>,
    initiator: address,
    recipient: address,
    amount: u64,
    timelock: u64,
}
```

## Cross-Chain Coordination

### 1. Event Indexing Service
- Monitor both chains for swap events
- Maintain swap state database
- Provide APIs for frontend queries

### 2. Oracle Integration (Optional)
- Price feeds for fair exchange rates
- Network status monitoring
- Gas price optimization

### 3. Relayer Service (Stretch Goal)
- Automated swap completion
- Gas optimization
- MEV protection

## Security Considerations

### Hashlock Security
- Use cryptographically secure random numbers
- Prevent hash collision attacks
- Implement proper hash verification

### Timelock Security
- Sufficient time for cross-chain operations
- Account for network congestion
- Prevent front-running attacks

### Economic Security
- Fair exchange rates
- Slippage protection
- Fee transparency