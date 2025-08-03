#!/bin/bash

# Script to register and mint MockUSDC tokens on Aptos testnet
# Usage: ./mint_mock_usdc.sh <WALLET_ADDRESS> <AMOUNT_IN_USDC>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <WALLET_ADDRESS> <AMOUNT_IN_USDC>"
    echo "Example: $0 0x176ef56313c0e2956cea1af533b1b9e02509555ec1d8c5302fe436db20f2e179 10"
    exit 1
fi

WALLET_ADDRESS=$1
AMOUNT_USDC=$2
# Convert to micro USDC (6 decimals)
AMOUNT_MICRO=$(echo "$AMOUNT_USDC * 1000000" | bc)

echo "🪙 Minting Mock USDC Tokens on Aptos"
echo "======================================"
echo "Wallet: $WALLET_ADDRESS"
echo "Amount: $AMOUNT_USDC mUSDC ($AMOUNT_MICRO micro-USDC)"
echo ""

# First, register the wallet to receive MockUSDC (if not already registered)
echo "📝 Registering wallet to receive MockUSDC..."
aptos move run \
    --function-id 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::register \
    --assume-yes \
    2>/dev/null || echo "⚠️  Registration failed (wallet may already be registered)"

echo ""

# Mint the tokens
echo "🏭 Minting $AMOUNT_USDC MockUSDC tokens..."
aptos move run \
    --function-id 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::mint \
    --args address:$WALLET_ADDRESS u64:$AMOUNT_MICRO \
    --assume-yes

echo ""
echo "✅ MockUSDC tokens minted successfully!"
echo "💡 You can now use mUSDC in cross-chain swaps between Ethereum and Aptos"
echo "💡 Token address: 0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::mock_usdc::MockUSDC"