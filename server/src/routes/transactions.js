import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validators } from '../middleware/validate.js';
import { stateMachines, generateTransactionId, getNextState } from '../services/stateMachine.js';

const router = Router();

// Get all transactions (registrar) or user's transactions
router.get('/', authenticate, async (req, res, next) => {
  try {
    let result;
    
    if (req.user.role === 'registrar') {
      // Registrar sees all
      result = await query(`
        SELECT t.*, u.name as user_name, u.email as user_email
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
      `);
    } else {
      // User sees only their own
      result = await query(
        'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
    }

    // Fetch state history for each transaction
    const transactions = await Promise.all(result.rows.map(async (tx) => {
      const historyResult = await query(
        'SELECT state, message, metadata, created_at as timestamp FROM state_history WHERE transaction_id = $1 ORDER BY created_at ASC',
        [tx.transaction_id]
      );
      return {
        ...tx,
        stateHistory: historyResult.rows
      };
    }));

    res.json({ transactions });
  } catch (err) {
    next(err);
  }
});

// Get single transaction
router.get('/:transactionId', authenticate, async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    
    let result;
    if (req.user.role === 'registrar') {
      result = await query('SELECT * FROM transactions WHERE transaction_id = $1', [transactionId]);
    } else {
      result = await query(
        'SELECT * FROM transactions WHERE transaction_id = $1 AND user_id = $2',
        [transactionId, req.user.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = result.rows[0];
    
    // Get state history
    const historyResult = await query(
      'SELECT state, message, metadata, created_at as timestamp FROM state_history WHERE transaction_id = $1 ORDER BY created_at ASC',
      [transactionId]
    );

    res.json({
      transaction: {
        ...tx,
        stateHistory: historyResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

// Create transaction
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { assetType, assetName, amount, orderType = 'buy' } = req.body;

    // Validate
    if (!['mutualFund', 'stock', 'crypto'].includes(assetType)) {
      return res.status(400).json({ error: 'Invalid asset type' });
    }

    const amountValidation = validators.amount(amount);
    if (!amountValidation.valid) {
      return res.status(400).json({ error: amountValidation.message });
    }

    if (!assetName) {
      return res.status(400).json({ error: 'Asset name is required' });
    }

    const machine = stateMachines[assetType];
    const transactionId = generateTransactionId(assetType);
    const initialState = machine.states[0].id;
    
    // Calculate estimated completion
    const estimatedMs = {
      mutualFund: 48 * 60 * 60 * 1000,
      stock: 24 * 60 * 60 * 1000,
      crypto: 5 * 60 * 1000
    };
    const estimatedCompletion = new Date(Date.now() + estimatedMs[assetType]);

    // Create transaction
    const result = await query(`
      INSERT INTO transactions 
        (transaction_id, user_id, asset_type, asset_name, amount, order_type, current_state, status, estimated_completion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', $8)
      RETURNING *
    `, [transactionId, req.user.id, assetType, assetName, amount, orderType, initialState, estimatedCompletion]);

    // Record initial state in history
    await query(`
      INSERT INTO state_history (transaction_id, state, message)
      VALUES ($1, $2, $3)
    `, [transactionId, initialState, 'Transaction initiated']);

    const tx = result.rows[0];
    const historyResult = await query(
      'SELECT state, message, created_at as timestamp FROM state_history WHERE transaction_id = $1',
      [transactionId]
    );

    res.status(201).json({
      success: true,
      transaction: {
        ...tx,
        stateHistory: historyResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

// Advance transaction state (registrar only)
router.post('/:transactionId/advance', authenticate, requireRole('registrar'), async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    // Get current transaction
    const txResult = await query('SELECT * FROM transactions WHERE transaction_id = $1', [transactionId]);
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];
    
    if (tx.status !== 'processing') {
      return res.status(400).json({ error: 'Transaction is not in processing state' });
    }

    // Get next state
    const nextState = getNextState(tx.asset_type, tx.current_state);
    
    if (!nextState) {
      return res.status(400).json({ error: 'Transaction is already at final state' });
    }

    const isCompleted = nextState.id === 'completed';

    // Update transaction
    await query(`
      UPDATE transactions 
      SET current_state = $1, status = $2, updated_at = NOW()
      WHERE transaction_id = $3
    `, [nextState.id, isCompleted ? 'completed' : 'processing', transactionId]);

    // Record in history
    await query(`
      INSERT INTO state_history (transaction_id, state, message)
      VALUES ($1, $2, $3)
    `, [transactionId, nextState.id, nextState.description]);

    // Fetch updated transaction
    const updatedResult = await query('SELECT * FROM transactions WHERE transaction_id = $1', [transactionId]);
    const historyResult = await query(
      'SELECT state, message, created_at as timestamp FROM state_history WHERE transaction_id = $1 ORDER BY created_at ASC',
      [transactionId]
    );

    res.json({
      success: true,
      transaction: {
        ...updatedResult.rows[0],
        stateHistory: historyResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

// Fail/Reject transaction
router.post('/:transactionId/fail', authenticate, async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { reason = 'Transaction failed' } = req.body;

    // Get transaction
    const txResult = await query('SELECT * FROM transactions WHERE transaction_id = $1', [transactionId]);
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    // Check permissions
    if (req.user.role !== 'registrar' && tx.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (tx.status !== 'processing') {
      return res.status(400).json({ error: 'Transaction is not in processing state' });
    }

    // Update transaction
    await query(`
      UPDATE transactions 
      SET current_state = 'failed', status = 'failed', failure_reason = $1, updated_at = NOW()
      WHERE transaction_id = $2
    `, [reason, transactionId]);

    // Record in history
    await query(`
      INSERT INTO state_history (transaction_id, state, message)
      VALUES ($1, 'failed', $2)
    `, [transactionId, reason]);

    res.json({ success: true, message: 'Transaction failed' });
  } catch (err) {
    next(err);
  }
});

// Cancel transaction (user only, before certain states)
router.post('/:transactionId/cancel', authenticate, async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const txResult = await query(
      'SELECT * FROM transactions WHERE transaction_id = $1 AND user_id = $2',
      [transactionId, req.user.id]
    );
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    if (tx.status !== 'processing') {
      return res.status(400).json({ error: 'Cannot cancel - transaction is not processing' });
    }

    await query(`
      UPDATE transactions 
      SET status = 'cancelled', failure_reason = 'Cancelled by user', updated_at = NOW()
      WHERE transaction_id = $1
    `, [transactionId]);

    await query(`
      INSERT INTO state_history (transaction_id, state, message)
      VALUES ($1, 'cancelled', 'Cancelled by user')
    `, [transactionId]);

    res.json({ success: true, message: 'Transaction cancelled' });
  } catch (err) {
    next(err);
  }
});

export default router;
