import React from 'react';
import { SwapStatus as SwapStatusType } from '../types';
import { SwapCard } from './SwapCard';
import { cn } from '../utils/cn';

interface SwapStatusProps {
  status: SwapStatusType;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Initializing', description: 'Preparing swap parameters' },
  { key: 'initiated', label: 'Initiated', description: 'Funds locked on source chain' },
  { key: 'committed', label: 'Committed', description: 'Counterparty committed funds' },
  { key: 'completed', label: 'Completed', description: 'Atomic swap successful' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'status-success';
    case 'failed':
      return 'status-error';
    case 'pending':
    case 'initiated':
    case 'committed':
      return 'status-pending';
    default:
      return 'text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'pending':
      return '⏳';
    case 'initiated':
      return '🔒';
    case 'committed':
      return '🤝';
    case 'refunded':
      return '↩️';
    default:
      return '⏳';
  }
};

export const SwapStatus: React.FC<SwapStatusProps> = ({ status }) => {
  const currentStepIndex = STATUS_STEPS.findIndex(step => step.key === status.status);
  
  return (
    <SwapCard>
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-primary-400 mb-2">
            Swap Status
          </h3>
          <p className="text-sm text-gray-400 font-mono">
            ID: {status.id}
          </p>
        </div>

        {/* Current Status */}
        <div className="text-center">
          <div className={cn(
            'text-4xl mb-2',
            status.status === 'failed' && 'animate-pulse'
          )}>
            {getStatusIcon(status.status)}
          </div>
          <div className={cn(
            'text-lg font-semibold mb-1',
            getStatusColor(status.status)
          )}>
            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
          </div>
          {status.error && (
            <p className="text-sm text-red-400 mt-2">
              Error: {status.error}
            </p>
          )}
        </div>

        {/* Progress Steps */}
        {status.status !== 'failed' && (
          <div className="space-y-4">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex || status.status === 'completed';
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;

              return (
                <div
                  key={step.key}
                  className={cn(
                    'flex items-center space-x-4 p-3 rounded-lg transition-all duration-300',
                    isCompleted && 'bg-primary-900/20',
                    isCurrent && 'bg-yellow-900/20 border border-yellow-500/30',
                    isPending && 'bg-dark-800/30'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    isCompleted && 'bg-primary-500 text-dark-900',
                    isCurrent && 'bg-yellow-500 text-dark-900 animate-pulse',
                    isPending && 'bg-dark-600 text-gray-400'
                  )}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      'font-medium',
                      isCompleted && 'text-primary-400',
                      isCurrent && 'text-yellow-400',
                      isPending && 'text-gray-400'
                    )}>
                      {step.label}
                    </div>
                    <div className="text-sm text-gray-400">
                      {step.description}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Transaction Links */}
        {(status.fromTx || status.toTx) && (
          <div className="border-t border-primary-900/30 pt-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Transaction Hashes</h4>
            {status.fromTx && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Source Chain:</span>
                <a
                  href={`#tx-${status.fromTx}`}
                  className="text-primary-400 hover:text-accent-green transition-colors font-mono text-xs"
                >
                  {status.fromTx.slice(0, 8)}...{status.fromTx.slice(-6)}
                </a>
              </div>
            )}
            {status.toTx && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Destination Chain:</span>
                <a
                  href={`#tx-${status.toTx}`}
                  className="text-accent-green hover:text-primary-400 transition-colors font-mono text-xs"
                >
                  {status.toTx.slice(0, 8)}...{status.toTx.slice(-6)}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-center text-xs text-gray-500">
          Started: {new Date(status.timestamp).toLocaleString()}
        </div>
      </div>
    </SwapCard>
  );
};