import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Get all users (registrar only)
router.get('/', authenticate, requireRole('registrar'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        u.id, u.email, u.name, u.phone, u.role, u.is_verified, u.created_at,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_volume
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// Get user stats
router.get('/stats', authenticate, requireRole('registrar'), async (req, res, next) => {
  try {
    const statsResult = await query(`
      SELECT
        COUNT(DISTINCT CASE WHEN role = 'user' THEN id END) as total_users,
        COUNT(DISTINCT CASE WHEN role = 'registrar' THEN id END) as total_registrars
      FROM users
    `);

    const txStatsResult = await query(`
      SELECT
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COALESCE(SUM(amount), 0) as total_volume,
        COUNT(CASE WHEN asset_type = 'mutualFund' THEN 1 END) as mf_count,
        COUNT(CASE WHEN asset_type = 'stock' THEN 1 END) as stock_count,
        COUNT(CASE WHEN asset_type = 'crypto' THEN 1 END) as crypto_count
      FROM transactions
    `);

    res.json({
      stats: {
        ...statsResult.rows[0],
        ...txStatsResult.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get single user (registrar only)
router.get('/:userId', authenticate, requireRole('registrar'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    const userResult = await query(
      'SELECT id, email, name, phone, role, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const transactionsResult = await query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      user: userResult.rows[0],
      transactions: transactionsResult.rows
    });
  } catch (err) {
    next(err);
  }
});

export default router;
