import { useState } from 'react';
import { StateMachineViz } from './StateMachineViz';
import { assetStateMachines } from '../utils/stateMachines';

export function TransactionCard({ transaction, onAdvance, onFail, isRegistrar = false, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const machine = assetStateMachines[transaction.assetType];
  
  const statusColors = {
    processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const assetIcons = {
    mutualFund: '📊',
    stock: '📈',
    crypto: '₿'
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const currentIndex = machine?.states.findIndex(s => s.id === transaction.currentState) || 0;
  const totalStates = machine?.states.length || 1;
  const progress = transaction.status === 'completed' ? 100 : 
                   transaction.status === 'failed' ? ((currentIndex) / totalStates) * 100 :
                   ((currentIndex + 1) / totalStates) * 100;

  const currentState = machine?.states[currentIndex];

  const handleCardClick = (e) => {
    if (onClick && !isRegistrar) {
      onClick(transaction);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition ${
      onClick ? 'hover:border-blue-500/50 cursor-pointer' : 'hover:border-gray-700'
    }`}>
      {/* Header */}
      <div 
        className="p-4"
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
              transaction.status === 'processing' ? 'bg-yellow-500/20' :
              transaction.status === 'completed' ? 'bg-green-500/20' :
              transaction.status === 'failed' ? 'bg-red-500/20' :
              'bg-gray-800'
            }`}>
              {assetIcons[transaction.assetType]}
            </div>
            <div>
              <h4 className="text-white font-medium">{transaction.assetName}</h4>
              <p className="text-gray-400 text-sm">
                {transaction.orderType.toUpperCase()} • {transaction.transactionId}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-semibold">{formatAmount(transaction.amount)}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs border ${statusColors[transaction.status]}`}>
              {transaction.status}
            </span>
          </div>
        </div>

        {/* Progress & Current State */}
        <div className="mt-3">
          {/* Current state indicator */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {transaction.status === 'processing' && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                </span>
              )}
              <span className="text-sm text-gray-400">
                {transaction.status === 'completed' ? '✓ Completed' :
                 transaction.status === 'failed' ? '✕ Failed at: ' + (currentState?.name || 'Unknown') :
                 currentState?.name || 'Processing...'}
              </span>
            </div>
            <span className="text-xs text-gray-500">{formatDate(transaction.updatedAt)}</span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                transaction.status === 'completed' ? 'bg-green-500' :
                transaction.status === 'failed' ? 'bg-red-500' :
                machine?.color === 'blue' ? 'bg-blue-500' :
                machine?.color === 'green' ? 'bg-green-500' :
                'bg-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-2">
            {machine?.states.map((state, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex && transaction.status === 'processing';
              const isFailed = transaction.status === 'failed' && index === currentIndex;
              
              return (
                <div 
                  key={state.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    isCompleted ? `${machine.color === 'blue' ? 'bg-blue-500' : machine.color === 'green' ? 'bg-green-500' : 'bg-orange-500'} text-white` :
                    isCurrent ? `ring-2 ${machine.color === 'blue' ? 'ring-blue-500 bg-blue-500/20' : machine.color === 'green' ? 'ring-green-500 bg-green-500/20' : 'ring-orange-500 bg-orange-500/20'}` :
                    isFailed ? 'bg-red-500/20 ring-2 ring-red-500' :
                    transaction.status === 'completed' ? `${machine.color === 'blue' ? 'bg-blue-500' : machine.color === 'green' ? 'bg-green-500' : 'bg-orange-500'} text-white` :
                    'bg-gray-700'
                  }`}
                  title={state.name}
                >
                  {isCompleted || transaction.status === 'completed' ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isFailed ? '!' : (
                    <span className={isCurrent ? (
                      machine.color === 'blue' ? 'text-blue-400' : 
                      machine.color === 'green' ? 'text-green-400' : 
                      'text-orange-400'
                    ) : 'text-gray-500'}>{index + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Click hint */}
        {onClick && !isRegistrar && (
          <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Click to view step-by-step details
          </div>
        )}
      </div>

      {/* Expanded Content (for registrar) */}
      {expanded && isRegistrar && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
          {/* Full State Machine */}
          <StateMachineViz 
            assetType={transaction.assetType}
            currentState={transaction.currentState}
            stateHistory={transaction.stateHistory}
          />

          {/* History Timeline */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-300 mb-3">Transaction History</h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transaction.stateHistory.map((history, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-600 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-gray-300">{history.message}</p>
                    <p className="text-gray-500 text-xs">{formatDate(history.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registrar Actions */}
          {transaction.status === 'processing' && (
            <div className="flex gap-3 pt-2 border-t border-gray-800">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvance(transaction.transactionId);
                }}
                className="flex-1 py-2 px-4 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition text-sm font-medium"
              >
                ▶ Advance State
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFail(transaction.transactionId, 'Rejected by registrar');
                }}
                className="flex-1 py-2 px-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition text-sm font-medium"
              >
                ✕ Reject
              </button>
            </div>
          )}

          {/* Transaction Details */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800 text-sm">
            <div>
              <p className="text-gray-500">Created</p>
              <p className="text-gray-300">{formatDate(transaction.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Est. Completion</p>
              <p className="text-gray-300">{formatDate(transaction.estimatedCompletion)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
