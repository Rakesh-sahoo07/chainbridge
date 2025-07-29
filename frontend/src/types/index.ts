export interface SwapParams {
  id: string;
  fromChain: 'ethereum' | 'aptos';
  toChain: 'ethereum' | 'aptos';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  recipient: string;
  hashlock: string;
  secret?: string;
  timelock: number;
}

export interface SwapStatus {
  id: string;
  status: 'pending' | 'initiated' | 'committed' | 'completed' | 'refunded' | 'failed';
  fromTx?: string;
  toTx?: string;
  timestamp: number;
  error?: string;
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chain: 'ethereum' | 'aptos';
  logo?: string;
}

export interface WalletState {
  ethereum: {
    connected: boolean;
    address?: string;
    balance?: string;
  };
  aptos: {
    connected: boolean;
    address?: string;
    balance?: string;
  };
}

export interface ContractAddresses {
  ethereum: {
    crossChainSwap: string;
    tokenManager: string;
    mockUSDC: string;
  };
  aptos: {
    crossChainSwap: string;
    tokenRegistry: string;
  };
}