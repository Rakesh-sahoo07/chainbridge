# Frontend Architecture

## Technology Stack
- **Framework**: React/Next.js
- **State Management**: Zustand or Context API
- **Styling**: Tailwind CSS
- **Web3 Integration**: 
  - 1inch SDK (primary)
  - Ethers.js/Viem for Ethereum
  - Aptos SDK for Aptos network

## Component Structure

### 1. Core Components
- `SwapInterface.tsx` - Main swap interface
- `TokenSelector.tsx` - Token selection dropdown
- `NetworkSelector.tsx` - Ethereum/Aptos network toggle
- `SwapDetails.tsx` - Transaction details display
- `SwapHistory.tsx` - Previous swaps tracking

### 2. Wallet Components
- `WalletConnector.tsx` - Multi-wallet connection
- `WalletBalance.tsx` - Display token balances
- `NetworkSwitcher.tsx` - Network switching UI

### 3. Transaction Components
- `SwapProgress.tsx` - Step-by-step progress
- `TransactionStatus.tsx` - Real-time status updates
- `SwapConfirmation.tsx` - Final confirmation modal

## 1inch SDK Integration

### Key SDK Features to Use
```typescript
// Quote fetching
import { QuoteRequest, QuoteResponse } from '@1inch/sdk';

// Swap execution
import { SwapRequest, SwapResponse } from '@1inch/sdk';

// Token lists
import { TokenList } from '@1inch/sdk';
```

### Integration Points
1. **Token Discovery**: Use 1inch token lists
2. **Price Quotes**: Leverage 1inch aggregation
3. **Route Optimization**: Use 1inch routing algorithms
4. **Transaction Building**: SDK transaction construction

## User Flow
1. Connect wallets (Ethereum + Aptos)
2. Select source/destination tokens and networks
3. Enter swap amount
4. Review quote and fees
5. Initiate cross-chain swap
6. Monitor progress across both chains
7. Complete swap or handle refunds

## State Management
```typescript
interface SwapState {
  sourceNetwork: 'ethereum' | 'aptos';
  destinationNetwork: 'ethereum' | 'aptos';
  sourceToken: Token;
  destinationToken: Token;
  amount: string;
  quote: QuoteResponse | null;
  swapStatus: SwapStatus;
  transactionHashes: {
    ethereum?: string;
    aptos?: string;
  };
}
```

## API Integration
- 1inch API for quotes and routes
- Custom backend for cross-chain coordination
- Blockchain RPC endpoints for transaction monitoring