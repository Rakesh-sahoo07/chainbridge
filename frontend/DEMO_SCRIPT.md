# ChainBridge Protocol - Live Demo Script

## 🎬 Hackathon Demo Flow

### Demo Setup (30 seconds)
1. **Open Application**: Navigate to the ChainBridge Protocol interface
2. **Show Architecture**: Point out the deployed smart contracts
   - Ethereum: `0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8`
   - Aptos: `0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4`
3. **Highlight Features**: 1inch Fusion+ integration, atomic swap security

### Part 1: Ethereum → Aptos Swap Demo (2 minutes)

#### Step 1: Wallet Connection
- **Connect MetaMask** (Sepolia Testnet)
- **Connect Petra Wallet** (Aptos Testnet)
- **Show Balance Display**: Demonstrate live balance fetching

#### Step 2: Configure Swap
- **From**: Select `100 mUSDC` on Ethereum
- **To**: Select `APT` on Aptos
- **Show Live Quote**: 1inch API provides optimized routing
- **Route Display**: Ethereum Sepolia → Aptos Testnet
- **Fee Calculation**: Show gas and protocol fees

#### Step 3: Execute Atomic Swap
- **Click "Initiate Cross-Chain Swap"**
- **Phase 1**: Lock mUSDC tokens on Ethereum (show transaction)
- **Phase 2**: Lock APT tokens on Aptos (show transaction)
- **Phase 3**: Reveal secret to complete atomically
- **Success**: Show completion with both transaction hashes

### Part 2: Aptos → Ethereum Swap Demo (2 minutes)

#### Step 1: Reverse Direction
- **From**: Select `10 APT` on Aptos
- **To**: Select `mUSDC` on Ethereum
- **Show Quote**: Demonstrate reverse quote calculation
- **Rate Display**: 1 APT = ~8.3 mUSDC

#### Step 2: Execute Reverse Swap
- **Initiate Swap**: Start the atomic process
- **Monitor Progress**: Show real-time status updates
- **Complete Swap**: Demonstrate successful completion
- **Verify Balances**: Show updated wallet balances

### Part 3: Advanced Features Demo (1 minute)

#### Security Features
- **Atomic Guarantees**: Explain all-or-nothing execution
- **Timelock Safety**: Show 2-hour expiration protection
- **Refund Mechanism**: Demonstrate automatic fund recovery

#### Technical Excellence
- **1inch Integration**: Highlight Fusion+ optimization
- **Smart Contract Security**: Show hashlock/timelock implementation
- **Cross-Chain Monitoring**: Real-time status across both chains

### Demo Talking Points

#### Opening (30 seconds)
*"Welcome to ChainBridge Protocol - a production-ready atomic swap solution that bridges Ethereum and Aptos using 1inch Fusion+ optimization. We've deployed real smart contracts on both testnets and built a complete DeFi application that you can use right now."*

#### During Ethereum → Aptos Swap
*"Watch as we lock 100 mUSDC on Ethereum Sepolia, which triggers a corresponding lock of APT tokens on Aptos Testnet. The magic happens when we reveal the cryptographic secret - this atomically completes both sides of the swap, ensuring no partial executions are possible."*

#### During Aptos → Ethereum Swap  
*"Now let's go the other direction. Starting with APT on Aptos, we're creating a cross-chain atomic swap that will deliver mUSDC to our Ethereum wallet. Notice how the 1inch Fusion+ integration provides optimal routing and pricing."*

#### Technical Highlights
*"Under the hood, we're using 256-bit cryptographic secrets, keccak256 hashlocks, and 2-hour timelocks. If anything goes wrong, funds are automatically refunded after expiration. This isn't a simulation - these are real blockchain transactions."*

#### Closing (30 seconds)
*"ChainBridge Protocol demonstrates that truly decentralized cross-chain swaps are possible today. We've combined 1inch's industry-leading optimization with atomic swap security to create a protocol that's both efficient and safe. Thank you!"*

### Key Demo Messages
- ✅ **Real Implementation**: Live smart contracts, not simulations
- ✅ **1inch Integration**: Genuine Fusion+ SDK usage
- ✅ **Atomic Security**: Cryptographic guarantees, not trust assumptions
- ✅ **Production Ready**: Complete error handling and user experience
- ✅ **Cross-Chain Native**: Truly bridging different blockchain ecosystems

### Backup Demo Elements
- **Error Handling**: Show graceful failure recovery
- **Network Switching**: Demonstrate proper testnet configuration
- **Transaction Tracking**: Explorer links for verification
- **Mobile Responsive**: Show UI adaptation across devices

### Demo Success Metrics
- **Functional Swaps**: Both directions working flawlessly
- **UI Excellence**: Smooth, intuitive user experience  
- **Technical Depth**: Real smart contract integration shown
- **Innovation**: 1inch + atomic swaps combination demonstrated
- **Security**: Cryptographic guarantees explained clearly

---

## 🎯 Demo Preparation Checklist

- [ ] Test environment fully functional
- [ ] Both wallets funded with testnet tokens
- [ ] Network connections stable
- [ ] Browser developer tools ready (for technical audience)
- [ ] Backup demo scenarios prepared
- [ ] Contract explorer pages bookmarked
- [ ] Speaking points practiced
- [ ] Time allocation planned (5 minutes total)

**Ready to showcase the future of cross-chain DeFi!** 🚀