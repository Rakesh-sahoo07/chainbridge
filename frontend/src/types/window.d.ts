declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
    aptos?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      disconnect: () => Promise<void>;
      isConnected: () => Promise<boolean>;
      signAndSubmitTransaction: (transaction: any) => Promise<any>;
      signTransaction: (transaction: any) => Promise<any>;
      onAccountChange: (callback: (account: any) => void) => void;
      onNetworkChange: (callback: (network: any) => void) => void;
      getChainId?: () => Promise<{ chainId: number }>;
      network?: (() => Promise<any>) | any;
    };
  }
}

export {};