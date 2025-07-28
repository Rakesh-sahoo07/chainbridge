# 1inch Cross-chain Swap Extension: Ethereum ↔ Aptos

## Project Overview
Build a novel cross-chain swap extension for 1inch Fusion+ enabling bidirectional token swaps between Ethereum and Aptos networks while preserving hashlock and timelock functionality.

## Core Requirements
- ✅ Preserve hashlock and timelock functionality for non-EVM (Aptos) implementation
- ✅ Bidirectional swaps (Ethereum ↔ Aptos)
- ✅ Onchain execution on mainnet/testnet for demo
- ✅ Maximum usage of 1inch SDK

## Stretch Goals
- 🎯 User Interface
- 🎯 Partial fills support
- 🎯 Relayer and resolver implementation

## Technology Stack
- **Ethereum**: Solidity smart contracts, 1inch SDK
- **Aptos**: Move smart contracts, Aptos SDK
- **Frontend**: React/Next.js with 1inch SDK integration
- **Backend**: Node.js relayer service (stretch goal)

## Architecture Components
1. **Smart Contracts** (Ethereum & Aptos)
2. **Frontend Interface**
3. **Cross-chain Bridge Logic**
4. **Relayer Service** (stretch goal)
5. **Resolver Service** (stretch goal)