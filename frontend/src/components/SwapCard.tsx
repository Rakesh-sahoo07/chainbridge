import React, { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface SwapCardProps {
  children: ReactNode;
  className?: string;
}

export const SwapCard: React.FC<SwapCardProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'cyber-card p-8 backdrop-blur-xl bg-dark-800/60 border-primary-500/20',
      'hover:border-primary-400/40 transition-all duration-300',
      'shadow-2xl shadow-primary-900/20',
      className
    )}>
      {children}
    </div>
  );
};