// State Machine Definitions for Asset Processing

export const assetStateMachines = {
  // Mutual Fund State Machine - Most Complex (T+1/T+2 Settlement)
  mutualFund: {
    name: 'Mutual Fund',
    description: 'MF orders are processed in batches at specific cut-off times with T+1 or T+2 settlement',
    states: [
      {
        id: 'initiated',
        name: 'Order Initiated',
        description: 'User clicks buy/sell button',
        icon: '🚀',
        duration: 'Instant',
        details: 'Order request received from user interface'
      },
      {
        id: 'payment_pending',
        name: 'Payment Pending',
        description: 'Awaiting payment confirmation',
        icon: '💳',
        duration: '5-15 mins',
        details: 'Payment gateway processes transaction. Bank validates funds.'
      },
      {
        id: 'payment_confirmed',
        name: 'Payment Confirmed',
        description: 'Funds debited from bank account',
        icon: '✅',
        duration: 'Instant',
        details: 'Payment successful. Funds moved to clearing account.'
      },
      {
        id: 'order_queued',
        name: 'Order Queued',
        description: 'Order placed in batch queue',
        icon: '📋',
        duration: 'Until cut-off',
        details: 'Order waits for market cut-off time (1:30 PM or 3:00 PM IST)'
      },
      {
        id: 'sent_to_amc',
        name: 'Sent to AMC',
        description: 'Order transmitted to Asset Management Company',
        icon: '📤',
        duration: '1-2 hours',
        details: 'Order file sent to AMC via BSE/NSE MF platform'
      },
      {
        id: 'nav_applied',
        name: 'NAV Applied',
        description: 'Applicable NAV determined',
        icon: '📊',
        duration: 'End of day',
        details: 'NAV as on order date applied. Units calculated = Amount/NAV'
      },
      {
        id: 'units_allotted',
        name: 'Units Allotted',
        description: 'Units credited to folio',
        icon: '📈',
        duration: 'T+1 day',
        details: 'AMC allots units to investor folio. Statement generated.'
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Transaction complete',
        icon: '🎉',
        duration: '-',
        details: 'Units visible in demat/folio. Transaction successful.'
      }
    ],
    failureStates: ['payment_failed', 'order_rejected', 'amc_rejection'],
    estimatedTime: 'T+1 to T+2 days',
    color: 'blue'
  },

  // Stock State Machine - Medium Complexity (T+1 Settlement)
  stock: {
    name: 'Stocks',
    description: 'Real-time trading during market hours with T+1 settlement',
    states: [
      {
        id: 'initiated',
        name: 'Order Initiated',
        description: 'User places buy/sell order',
        icon: '🚀',
        duration: 'Instant',
        details: 'Order request created with price, quantity, type'
      },
      {
        id: 'margin_check',
        name: 'Margin Check',
        description: 'Validating available margin/funds',
        icon: '🔍',
        duration: '< 1 sec',
        details: 'Broker validates if user has sufficient margin/balance'
      },
      {
        id: 'sent_to_exchange',
        name: 'Sent to Exchange',
        description: 'Order transmitted to NSE/BSE',
        icon: '📤',
        duration: '< 1 sec',
        details: 'Order routed to exchange order matching engine'
      },
      {
        id: 'pending_execution',
        name: 'Order Book',
        description: 'Waiting in exchange order book',
        icon: '📋',
        duration: 'Variable',
        details: 'Limit orders wait for price match. Market orders execute immediately.'
      },
      {
        id: 'executed',
        name: 'Trade Executed',
        description: 'Order matched and executed',
        icon: '⚡',
        duration: 'Instant',
        details: 'Buyer and seller matched. Trade confirmation generated.'
      },
      {
        id: 'clearing',
        name: 'Clearing',
        description: 'Trade sent to clearing corporation',
        icon: '🏦',
        duration: 'T+0',
        details: 'NSCCL/ICCL processes trade for settlement'
      },
      {
        id: 'settlement',
        name: 'Settlement',
        description: 'Funds and securities exchanged',
        icon: '🔄',
        duration: 'T+1',
        details: 'Depository transfers shares. Bank transfers funds.'
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Securities in demat account',
        icon: '🎉',
        duration: '-',
        details: 'Shares credited to demat. Transaction complete.'
      }
    ],
    failureStates: ['margin_insufficient', 'order_rejected', 'trade_cancelled'],
    estimatedTime: 'T+1 day (execution instant during market hours)',
    color: 'green'
  },

  // Cryptocurrency State Machine - Simplest (Near-Instant)
  crypto: {
    name: 'Cryptocurrency',
    description: 'Blockchain-based processing with near-instant settlement',
    states: [
      {
        id: 'initiated',
        name: 'Order Initiated',
        description: 'User places crypto order',
        icon: '🚀',
        duration: 'Instant',
        details: 'Order request for buy/sell cryptocurrency'
      },
      {
        id: 'wallet_check',
        name: 'Wallet Balance Check',
        description: 'Verifying wallet balance',
        icon: '👛',
        duration: '< 1 sec',
        details: 'Exchange verifies fiat/crypto balance available'
      },
      {
        id: 'order_matching',
        name: 'Order Matching',
        description: 'Finding counterparty on orderbook',
        icon: '🔄',
        duration: '< 1 sec',
        details: 'Exchange matches buy/sell orders on internal orderbook'
      },
      {
        id: 'executed',
        name: 'Trade Executed',
        description: 'Order filled',
        icon: '⚡',
        duration: 'Instant',
        details: 'Trade executed on exchange. Internal ledger updated.'
      },
      {
        id: 'blockchain_confirm',
        name: 'Blockchain Confirmation',
        description: 'On-chain settlement (if withdrawal)',
        icon: '⛓️',
        duration: '1-60 mins',
        details: 'For withdrawals: Transaction broadcast to blockchain network'
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Crypto credited to wallet',
        icon: '🎉',
        duration: '-',
        details: 'Balance updated. Transaction finalized.'
      }
    ],
    failureStates: ['insufficient_balance', 'network_congestion', 'order_expired'],
    estimatedTime: 'Seconds to minutes (on-exchange)',
    color: 'orange'
  }
};

// Transaction states
export const transactionStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Get next state in machine
export const getNextState = (assetType, currentState) => {
  const machine = assetStateMachines[assetType];
  if (!machine) return null;
  
  const currentIndex = machine.states.findIndex(s => s.id === currentState);
  if (currentIndex === -1 || currentIndex === machine.states.length - 1) return null;
  
  return machine.states[currentIndex + 1];
};

// Get state details
export const getStateDetails = (assetType, stateId) => {
  const machine = assetStateMachines[assetType];
  if (!machine) return null;
  
  return machine.states.find(s => s.id === stateId);
};
