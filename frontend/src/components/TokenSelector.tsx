import React, { useState } from 'react';
import { Token } from '../types';
import { cn } from '../utils/cn';

interface TokenSelectorProps {
  selectedToken: Token;
  onTokenSelect: (token: Token) => void;
  availableTokens: Token[];
  className?: string;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenSelect,
  availableTokens,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getChainColor = (chain: string) => {
    return chain === 'ethereum' ? 'text-primary-400' : 'text-accent-green';
  };

  const getChainBadge = (chain: string) => {
    return chain === 'ethereum' ? 'ETH' : 'APT';
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cyber-button flex items-center space-x-3 px-4 py-3 min-w-[140px]"
      >
        <div className="flex items-center space-x-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
            selectedToken.chain === 'ethereum' 
              ? 'bg-primary-500/20 text-primary-400' 
              : 'bg-green-500/20 text-accent-green'
          )}>
            {selectedToken.symbol[0]}
          </div>
          <div className="text-left">
            <div className="font-semibold">{selectedToken.symbol}</div>
            <div className={cn('text-xs', getChainColor(selectedToken.chain))}>
              {getChainBadge(selectedToken.chain)}
            </div>
          </div>
        </div>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full bg-dark-800 border border-primary-500/30 rounded-lg shadow-2xl z-20 backdrop-blur-xl">
            {availableTokens.map((token) => (
              <button
                key={`${token.chain}-${token.symbol}`}
                onClick={() => {
                  onTokenSelect(token);
                  setIsOpen(false);
                }}
                disabled={token.symbol === selectedToken.symbol && token.chain === selectedToken.chain}
                className={cn(
                  'w-full px-4 py-3 flex items-center space-x-3 hover:bg-dark-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg',
                  token.symbol === selectedToken.symbol && token.chain === selectedToken.chain && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  token.chain === 'ethereum' 
                    ? 'bg-primary-500/20 text-primary-400' 
                    : 'bg-green-500/20 text-accent-green'
                )}>
                  {token.symbol[0]}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-xs text-gray-400">{token.name}</div>
                </div>
                <div className={cn(
                  'text-xs px-2 py-1 rounded bg-dark-700',
                  getChainColor(token.chain)
                )}>
                  {getChainBadge(token.chain)}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};