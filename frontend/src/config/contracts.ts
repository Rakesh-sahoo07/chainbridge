import { ContractAddresses } from '../types';

export const CONTRACT_ADDRESSES: ContractAddresses = {
  ethereum: {
    crossChainSwap: '0x1B361EEEf61b67e66cF7e8C0309cb03EDc34F4F8',
    crossChainBridge: '0x4f1e1b041A9Fc9347731E893d1c06e6c8FbceDb0',
    tokenManager: '0x2A809295cc916E85cF998eA8f8559cfeB85f2e28',
    mockUSDC: '0x7a265Db61E004f4242fB322fa72F8a52D2B06664',
  },
  aptos: {
    crossChainSwap: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4',
    crossChainBridge: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge',
    tokenRegistry: '0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4',
  },
};

export const NETWORK_CONFIG = {
  ethereum: {
    chainId: 11155111, // Sepolia
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  aptos: {
    network: 'testnet',
    name: 'Aptos Testnet',
    rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    blockExplorer: 'https://explorer.aptoslabs.com',
  },
};