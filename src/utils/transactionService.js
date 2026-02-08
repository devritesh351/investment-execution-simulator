// Transaction Service - Handles asset transactions and state machine progression
import { db } from './database';
import { assetStateMachines, getNextState } from './stateMachines';

const generateTransactionId = (type) => {
  const prefix = type === 'mutualFund' ? 'MF' : type === 'stock' ? 'STK' : 'CRY';
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
};

export const transactionService = {
  createTransaction: async (userId, assetType, assetName, amount, orderType = 'buy') => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const machine = assetStateMachines[assetType];
    if (!machine) throw new Error('Invalid asset type');
    
    const transaction = db.insert('transactions', {
      transactionId: generateTransactionId(assetType),
      userId,
      assetType,
      assetName,
      amount: parseFloat(amount),
      orderType,
      currentState: machine.states[0].id,
      stateHistory: [{
        state: machine.states[0].id,
        timestamp: new Date().toISOString(),
        message: 'Transaction initiated'
      }],
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedCompletion: calculateEstimatedCompletion(assetType)
    });
    
    return transaction;
  },

  advanceState: async (transactionId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const transaction = db.findOne('transactions', { transactionId });
    if (!transaction) throw new Error('Transaction not found');
    
    const nextState = getNextState(transaction.assetType, transaction.currentState);
    if (!nextState) {
      // Already at final state
      if (transaction.status !== 'completed') {
        return db.update('transactions', { transactionId }, { 
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
      }
      return transaction;
    }
    
    const newHistory = [...transaction.stateHistory, {
      state: nextState.id,
      timestamp: new Date().toISOString(),
      message: nextState.description
    }];
    
    const isCompleted = nextState.id === 'completed';
    
    return db.update('transactions', { transactionId }, {
      currentState: nextState.id,
      stateHistory: newHistory,
      status: isCompleted ? 'completed' : 'processing',
      updatedAt: new Date().toISOString()
    });
  },

  failTransaction: async (transactionId, reason) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const transaction = db.findOne('transactions', { transactionId });
    if (!transaction) throw new Error('Transaction not found');
    
    const newHistory = [...transaction.stateHistory, {
      state: 'failed',
      timestamp: new Date().toISOString(),
      message: reason || 'Transaction failed'
    }];
    
    return db.update('transactions', { transactionId }, {
      currentState: 'failed',
      stateHistory: newHistory,
      status: 'failed',
      failureReason: reason,
      updatedAt: new Date().toISOString()
    });
  },

  getUserTransactions: (userId) => {
    return db.findMany('transactions', { userId });
  },

  getAllTransactions: () => {
    return db.getAll('transactions');
  },

  getTransaction: (transactionId) => {
    return db.findOne('transactions', { transactionId });
  },

  // Simulate automatic progression (for demo)
  simulateProgress: async (transactionId, speed = 1000) => {
    const transaction = db.findOne('transactions', { transactionId });
    if (!transaction || transaction.status !== 'processing') return;
    
    const machine = assetStateMachines[transaction.assetType];
    const currentIndex = machine.states.findIndex(s => s.id === transaction.currentState);
    
    if (currentIndex < machine.states.length - 1) {
      await new Promise(resolve => setTimeout(resolve, speed));
      await transactionService.advanceState(transactionId);
    }
  }
};

function calculateEstimatedCompletion(assetType) {
  const now = new Date();
  switch (assetType) {
    case 'crypto':
      return new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 mins
    case 'stock':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 1 day
    case 'mutualFund':
      return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 2 days
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}
