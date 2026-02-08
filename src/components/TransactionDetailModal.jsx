import { useState, useEffect } from 'react';
import { assetStateMachines, getStateDetails } from '../utils/stateMachines';

export function TransactionDetailModal({ transaction, onClose, onAdvance, onFail, onRetry, onCancel, isRegistrar = false }) {
  const [activeStepIndex, setActiveStepIndex] = useState(null);
  const [showTimeline, setShowTimeline] = useState(true);
  
  const machine = assetStateMachines[transaction.assetType];
  if (!machine) return null;

  const currentIndex = machine.states.findIndex(s => s.id === transaction.currentState);
  const isFailed = transaction.status === 'failed';
  const isCompleted = transaction.status === 'completed';

  const getStateStatus = (stateIndex) => {
    if (isFailed) {
      const completedStates = transaction.stateHistory
        .filter(h => h.state !== 'failed')
        .map(h => h.state);
      const state = machine.states[stateIndex];
      if (completedStates.includes(state.id)) return 'completed';
      return 'failed';
    }
    if (stateIndex < currentIndex) return 'completed';
    if (stateIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStateTimestamp = (stateId) => {
    const historyEntry = transaction.stateHistory.find(h => h.state === stateId);
    return historyEntry?.timestamp;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    if (diffMs < 1000) return `${diffMs}ms`;
    if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
    if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m`;
    return `${Math.round(diffMs / 3600000)}h`;
  };

  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-500/20',
      border: 'border-blue-500',
      text: 'text-blue-400',
      gradient: 'from-blue-500 to-blue-600'
    },
    green: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-500/20',
      border: 'border-green-500',
      text: 'text-green-400',
      gradient: 'from-green-500 to-green-600'
    },
    orange: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-500/20',
      border: 'border-orange-500',
      text: 'text-orange-400',
      gradient: 'from-orange-500 to-orange-600'
    }
  };

  const colors = colorClasses[machine.color] || colorClasses.blue;

  // Technical details for each state
  const getTechnicalDetails = (state, assetType) => {
    const details = {
      mutualFund: {
        initiated: {
          action: 'POST /api/orders/create',
          payload: { assetType, amount: transaction.amount, userId: 'user_xxx' },
          validation: ['Amount validation', 'User KYC check', 'Folio verification'],
          nextStep: 'Initiate payment gateway'
        },
        payment_pending: {
          action: 'POST /api/payments/initiate',
          payload: { orderId: transaction.transactionId, amount: transaction.amount, gateway: 'razorpay' },
          validation: ['Bank account verification', 'UPI/Netbanking flow', 'Payment timeout: 15 mins'],
          nextStep: 'Await payment confirmation webhook'
        },
        payment_confirmed: {
          action: 'Webhook: payment.success',
          payload: { paymentId: 'pay_xxx', status: 'captured', amount: transaction.amount },
          validation: ['Payment signature verification', 'Amount match check', 'Idempotency check'],
          nextStep: 'Queue order for batch processing'
        },
        order_queued: {
          action: 'Internal: BatchQueue.add()',
          payload: { orderId: transaction.transactionId, cutoffTime: '14:30 IST' },
          validation: ['Order cutoff check (1:30 PM / 3:00 PM)', 'Business day validation', 'Holiday calendar check'],
          nextStep: 'Wait for batch execution at cutoff'
        },
        sent_to_amc: {
          action: 'POST BSE/NSE MF API',
          payload: { orderType: 'FRESH_PURCHASE', schemeCode: 'xxx', amount: transaction.amount },
          validation: ['BSE StarMF authentication', 'Order file generation', 'Transmission confirmation'],
          nextStep: 'Await AMC confirmation'
        },
        nav_applied: {
          action: 'Callback: NAV Confirmation',
          payload: { nav: 156.78, navDate: new Date().toISOString(), units: (transaction.amount / 156.78).toFixed(3) },
          validation: ['NAV date validation', 'Units calculation', 'Load charges applied'],
          nextStep: 'Initiate units allotment'
        },
        units_allotted: {
          action: 'AMC Confirmation',
          payload: { folioNumber: 'xxx12345', unitsAllotted: (transaction.amount / 156.78).toFixed(3) },
          validation: ['Folio update confirmation', 'CAS update initiated', 'Statement generation'],
          nextStep: 'Mark transaction complete'
        },
        completed: {
          action: 'Transaction.complete()',
          payload: { status: 'completed', completedAt: new Date().toISOString() },
          validation: ['Final confirmation sent', 'Email/SMS notification', 'Portfolio updated'],
          nextStep: 'N/A'
        }
      },
      stock: {
        initiated: {
          action: 'POST /api/orders/equity/create',
          payload: { symbol: transaction.assetName, orderType: 'MARKET', quantity: 1 },
          validation: ['Trading hours check (9:15 AM - 3:30 PM)', 'Circuit limit check', 'Scrip validation'],
          nextStep: 'Check margin availability'
        },
        margin_check: {
          action: 'GET /api/margins/check',
          payload: { userId: 'user_xxx', requiredMargin: transaction.amount },
          validation: ['Available margin >= Required', 'Collateral valuation', 'Exposure limit check'],
          nextStep: 'Route to exchange'
        },
        sent_to_exchange: {
          action: 'FIX Protocol: NewOrderSingle',
          payload: { clOrdId: transaction.transactionId, symbol: transaction.assetName, side: 'BUY' },
          validation: ['Exchange connectivity', 'Order acknowledgement', 'Queue position assigned'],
          nextStep: 'Await order matching'
        },
        pending_execution: {
          action: 'Exchange Order Book',
          payload: { orderId: 'NSE_xxx', status: 'OPEN', pendingQty: 1 },
          validation: ['Price-time priority matching', 'Limit price check', 'Partial fill handling'],
          nextStep: 'Trade execution'
        },
        executed: {
          action: 'FIX: ExecutionReport',
          payload: { execType: 'TRADE', lastPx: transaction.amount, lastQty: 1 },
          validation: ['Trade confirmation', 'Contract note generation', 'Position update'],
          nextStep: 'Send to clearing'
        },
        clearing: {
          action: 'NSCCL/ICCL Clearing',
          payload: { tradeId: 'xxx', clearingMember: 'CM001', obligation: transaction.amount },
          validation: ['Netting computation', 'Pay-in/Pay-out calculation', 'MTM settlement'],
          nextStep: 'T+1 Settlement'
        },
        settlement: {
          action: 'Depository Settlement',
          payload: { dpId: 'IN300xxx', clientId: 'xxxxxxxx', isin: 'INE123xxx' },
          validation: ['Securities movement', 'Funds settlement', 'DP account credit'],
          nextStep: 'Confirm completion'
        },
        completed: {
          action: 'Settlement.complete()',
          payload: { status: 'completed', sharesCredit: true },
          validation: ['Demat credit confirmed', 'Contract note sent', 'Holdings updated'],
          nextStep: 'N/A'
        }
      },
      crypto: {
        initiated: {
          action: 'POST /api/crypto/order',
          payload: { pair: transaction.assetName + '/INR', side: 'BUY', amount: transaction.amount },
          validation: ['Trading pair validation', 'Order size limits', 'Market status check'],
          nextStep: 'Check wallet balance'
        },
        wallet_check: {
          action: 'GET /api/wallet/balance',
          payload: { currency: 'INR', required: transaction.amount },
          validation: ['Available balance >= Required', 'KYC tier limits', 'Withdrawal lock check'],
          nextStep: 'Submit to orderbook'
        },
        order_matching: {
          action: 'Matching Engine',
          payload: { orderId: transaction.transactionId, price: 'MARKET', status: 'MATCHING' },
          validation: ['Orderbook depth check', 'Slippage calculation', 'Best bid/ask matching'],
          nextStep: 'Execute trade'
        },
        executed: {
          action: 'Trade Execution',
          payload: { tradeId: 'xxx', avgPrice: transaction.amount * 0.95, fee: transaction.amount * 0.001 },
          validation: ['Trade confirmation', 'Fee deduction', 'Wallet balance update'],
          nextStep: 'Blockchain confirmation (if withdrawal)'
        },
        blockchain_confirm: {
          action: 'Blockchain TX',
          payload: { txHash: '0x' + Math.random().toString(16).substr(2, 64), confirmations: 6 },
          validation: ['Transaction broadcast', 'Block confirmations', 'Mempool status'],
          nextStep: 'Finalize transaction'
        },
        completed: {
          action: 'Transaction.finalize()',
          payload: { status: 'completed', walletBalance: 'updated' },
          validation: ['Balance credited', 'Transaction history updated', 'Notification sent'],
          nextStep: 'N/A'
        }
      }
    };

    return details[assetType]?.[state.id] || {
      action: 'Processing',
      payload: {},
      validation: [],
      nextStep: 'Continue processing'
    };
  };

  const handleStepClick = (index) => {
    const status = getStateStatus(index);
    if (status === 'completed' || status === 'current' || status === 'failed') {
      setActiveStepIndex(activeStepIndex === index ? null : index);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-2xl`}>
                {machine.states[0]?.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{transaction.assetName}</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {transaction.transactionId} • {transaction.orderType.toUpperCase()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                    isCompleted ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    isFailed ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {transaction.status.toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-sm">•</span>
                  <span className="text-white font-semibold">{formatAmount(transaction.amount)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* State Machine Visualization */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Processing Pipeline</h3>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Click any completed step to view details</span>
              </div>
            </div>

            {/* Horizontal State Machine */}
            <div className="relative bg-gray-800/50 rounded-xl p-6 overflow-x-auto">
              <div className="flex items-start justify-between min-w-max gap-4">
                {machine.states.map((state, index) => {
                  const status = getStateStatus(index);
                  const timestamp = getStateTimestamp(state.id);
                  const isClickable = status === 'completed' || status === 'current';
                  const isActive = activeStepIndex === index;
                  
                  // Calculate duration to next state
                  const nextState = machine.states[index + 1];
                  const nextTimestamp = nextState ? getStateTimestamp(nextState.id) : null;
                  const duration = calculateDuration(timestamp, nextTimestamp);

                  return (
                    <div key={state.id} className="flex items-start">
                      <div 
                        className={`flex flex-col items-center relative ${isClickable ? 'cursor-pointer' : ''}`}
                        onClick={() => handleStepClick(index)}
                      >
                        {/* Step Circle */}
                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl transition-all ${
                            isActive ? 'ring-4 ring-white/20 scale-110' : ''
                          } ${
                            status === 'completed' ? `${colors.bg} ${colors.border} text-white` :
                            status === 'current' ? `${colors.bgLight} ${colors.border} ${colors.text} animate-pulse` :
                            status === 'failed' ? 'bg-red-500/20 border-red-500 text-red-400' :
                            'bg-gray-700 border-gray-600 text-gray-500'
                          }`}
                        >
                          {status === 'completed' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : status === 'failed' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            state.icon
                          )}
                        </div>

                        {/* Step Info */}
                        <div className="mt-3 text-center max-w-[100px]">
                          <p className={`text-xs font-medium ${
                            status === 'current' ? 'text-white' : 
                            status === 'completed' ? colors.text : 'text-gray-500'
                          }`}>
                            {state.name}
                          </p>
                          {timestamp && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              {new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        {/* Click indicator */}
                        {isClickable && (
                          <div className={`mt-2 px-2 py-0.5 rounded-full text-[10px] ${
                            isActive ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {isActive ? 'Close' : 'View'}
                          </div>
                        )}
                      </div>

                      {/* Connector Arrow */}
                      {index < machine.states.length - 1 && (
                        <div className="flex flex-col items-center mx-2 mt-5">
                          <div className={`w-12 h-0.5 ${
                            status === 'completed' ? colors.bg : 'bg-gray-700'
                          }`} />
                          {duration && (
                            <span className="text-[10px] text-gray-500 mt-1">{duration}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step Detail Panel */}
          {activeStepIndex !== null && (
            <div className="mb-6 animate-fade-in">
              <div className={`bg-gray-800 border ${colors.border}/30 rounded-xl p-5`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${colors.bgLight} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {machine.states[activeStepIndex]?.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">
                      {machine.states[activeStepIndex]?.name}
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">
                      {machine.states[activeStepIndex]?.details}
                    </p>

                    {/* Technical Details */}
                    {(() => {
                      const techDetails = getTechnicalDetails(machine.states[activeStepIndex], transaction.assetType);
                      return (
                        <div className="mt-4 space-y-4">
                          {/* API Action */}
                          <div className="bg-gray-900 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-mono">
                                {techDetails.action.split(' ')[0]}
                              </span>
                              <code className="text-gray-300 text-sm font-mono">
                                {techDetails.action.split(' ').slice(1).join(' ')}
                              </code>
                            </div>
                            <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                              {JSON.stringify(techDetails.payload, null, 2)}
                            </pre>
                          </div>

                          {/* Validations */}
                          <div>
                            <p className="text-gray-400 text-xs font-medium mb-2">Validations & Checks:</p>
                            <div className="flex flex-wrap gap-2">
                              {techDetails.validation.map((v, i) => (
                                <span key={i} className="px-2 py-1 rounded-full bg-gray-700 text-gray-300 text-xs">
                                  ✓ {v}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Timestamp */}
                          {getStateTimestamp(machine.states[activeStepIndex].id) && (
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Processed at: </span>
                                <span className="text-gray-300">
                                  {formatDate(getStateTimestamp(machine.states[activeStepIndex].id))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showTimeline ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-medium">Transaction Timeline</span>
              <span className="text-gray-600">({transaction.stateHistory.length} events)</span>
            </button>
          </div>

          {/* Timeline */}
          {showTimeline && (
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 mb-6">
              {transaction.stateHistory.map((entry, index) => {
                const stateInfo = machine.states.find(s => s.id === entry.state);
                const isLast = index === transaction.stateHistory.length - 1;
                
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        entry.state === 'failed' ? 'bg-red-500/20 text-red-400' :
                        isLast && !isCompleted ? `${colors.bgLight} ${colors.text}` :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {stateInfo?.icon || '❌'}
                      </div>
                      {index < transaction.stateHistory.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-700" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${
                          entry.state === 'failed' ? 'text-red-400' : 'text-white'
                        }`}>
                          {stateInfo?.name || 'Failed'}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{entry.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Transaction Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Created</p>
              <p className="text-white text-sm mt-1">{formatDate(transaction.createdAt)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Last Updated</p>
              <p className="text-white text-sm mt-1">{formatDate(transaction.updatedAt)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Est. Completion</p>
              <p className="text-white text-sm mt-1">{formatDate(transaction.estimatedCompletion)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Asset Type</p>
              <p className="text-white text-sm mt-1">{machine.name}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFailed && onRetry && (
                <button
                  onClick={() => onRetry(transaction.transactionId)}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition text-sm font-medium"
                >
                  🔄 Retry Transaction
                </button>
              )}
              {!isCompleted && !isFailed && onCancel && (
                <button
                  onClick={() => onCancel(transaction.transactionId)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isRegistrar && !isCompleted && !isFailed && (
                <>
                  <button
                    onClick={() => onAdvance(transaction.transactionId)}
                    className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition text-sm font-medium"
                  >
                    ▶ Advance State
                  </button>
                  <button
                    onClick={() => onFail(transaction.transactionId, 'Rejected by registrar')}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition text-sm font-medium"
                  >
                    ✕ Reject
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
