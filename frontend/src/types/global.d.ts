declare global {
  interface Window {
    ethereum?: {
      request: (params: { method: string; params?: any[] }) => Promise<any>;
      send: (method: string, params?: any[]) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
    aptos?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      disconnect: () => Promise<void>;
      signAndSubmitTransaction: (transaction: any) => Promise<any>;
      signTransaction: (transaction: any) => Promise<any>;
      onAccountChange: (callback: (account: any) => void) => void;
      onNetworkChange: (callback: (network: any) => void) => void;
      isConnected: () => Promise<boolean>;
    };
  }
}

export {};