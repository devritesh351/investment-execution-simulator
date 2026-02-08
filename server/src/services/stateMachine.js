// State Machine Definitions for Asset Processing

export const stateMachines = {
  mutualFund: {
    name: 'Mutual Fund',
    description: 'MF orders are processed in batches at specific cut-off times with T+1 or T+2 settlement',
    states: [
      { id: 'initiated', name: 'Order Initiated', description: 'Order received', icon: '🚀', duration: 'Instant' },
      { id: 'payment_pending', name: 'Payment Pending', description: 'Awaiting payment', icon: '💳', duration: '5-15 mins' },
      { id: 'payment_confirmed', name: 'Payment Confirmed', description: 'Funds debited', icon: '✅', duration: 'Instant' },
      { id: 'order_queued', name: 'Order Queued', description: 'In batch queue', icon: '📋', duration: 'Until cut-off' },
      { id: 'sent_to_amc', name: 'Sent to AMC', description: 'Transmitted to AMC', icon: '📤', duration: '1-2 hours' },
      { id: 'nav_applied', name: 'NAV Applied', description: 'NAV determined', icon: '📊', duration: 'End of day' },
      { id: 'units_allotted', name: 'Units Allotted', description: 'Units credited', icon: '📈', duration: 'T+1 day' },
      { id: 'completed', name: 'Completed', description: 'Transaction complete', icon: '🎉', duration: '-' }
    ],
    estimatedTime: 'T+1 to T+2 days',
    color: 'blue'
  },

  stock: {
    name: 'Stocks',
    description: 'Real-time trading during market hours with T+1 settlement',
    states: [
      { id: 'initiated', name: 'Order Initiated', description: 'Order placed', icon: '🚀', duration: 'Instant' },
      { id: 'margin_check', name: 'Margin Check', description: 'Validating funds', icon: '🔍', duration: '< 1 sec' },
      { id: 'sent_to_exchange', name: 'Sent to Exchange', description: 'Transmitted to NSE/BSE', icon: '📤', duration: '< 1 sec' },
      { id: 'pending_execution', name: 'Order Book', description: 'In exchange order book', icon: '📋', duration: 'Variable' },
      { id: 'executed', name: 'Trade Executed', description: 'Order matched', icon: '⚡', duration: 'Instant' },
      { id: 'clearing', name: 'Clearing', description: 'At clearing corp', icon: '🏦', duration: 'T+0' },
      { id: 'settlement', name: 'Settlement', description: 'Funds/securities exchanged', icon: '🔄', duration: 'T+1' },
      { id: 'completed', name: 'Completed', description: 'In demat account', icon: '🎉', duration: '-' }
    ],
    estimatedTime: 'T+1 day',
    color: 'green'
  },

  crypto: {
    name: 'Cryptocurrency',
    description: 'Blockchain-based processing with near-instant settlement',
    states: [
      { id: 'initiated', name: 'Order Initiated', description: 'Order placed', icon: '🚀', duration: 'Instant' },
      { id: 'wallet_check', name: 'Wallet Check', description: 'Verifying balance', icon: '👛', duration: '< 1 sec' },
      { id: 'order_matching', name: 'Order Matching', description: 'Finding counterparty', icon: '🔄', duration: '< 1 sec' },
      { id: 'executed', name: 'Trade Executed', description: 'Order filled', icon: '⚡', duration: 'Instant' },
      { id: 'blockchain_confirm', name: 'Blockchain Confirmation', description: 'On-chain settlement', icon: '⛓️', duration: '1-60 mins' },
      { id: 'completed', name: 'Completed', description: 'Credited to wallet', icon: '🎉', duration: '-' }
    ],
    estimatedTime: 'Seconds to minutes',
    color: 'orange'
  }
};

export function generateTransactionId(assetType) {
  const prefix = assetType === 'mutualFund' ? 'MF' : assetType === 'stock' ? 'STK' : 'CRY';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export function getNextState(assetType, currentState) {
  const machine = stateMachines[assetType];
  if (!machine) return null;

  const currentIndex = machine.states.findIndex(s => s.id === currentState);
  if (currentIndex === -1 || currentIndex >= machine.states.length - 1) return null;

  return machine.states[currentIndex + 1];
}

export function getStateDetails(assetType, stateId) {
  const machine = stateMachines[assetType];
  if (!machine) return null;

  return machine.states.find(s => s.id === stateId);
}

export default { stateMachines, generateTransactionId, getNextState, getStateDetails };
