import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { validators, validateRequest } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Register
router.post('/register', validateRequest({
  email: validators.email,
  password: validators.password,
  name: validators.name,
  phone: validators.phone
}), async (req, res, next) => {
  try {
    const { email, password, name, phone, role = 'user' } = req.body;
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(`
      INSERT INTO users (email, password_hash, name, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role
    `, [normalizedEmail, passwordHash, name.trim(), phone.replace(/[^\d+]/g, ''), role]);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const userResult = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Check if locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until) - new Date();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return res.status(423).json({ 
        error: `Account locked. Try again in ${remainingMins} minutes.` 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      const newAttempts = (user.login_attempts || 0) + 1;
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        await query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, new Date(Date.now() + LOCKOUT_DURATION), user.id]
        );
        return res.status(423).json({ 
          error: 'Too many failed attempts. Account locked for 15 minutes.' 
        });
      }

      await query('UPDATE users SET login_attempts = $1 WHERE id = $2', [newAttempts, user.id]);
      
      return res.status(401).json({ 
        error: `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.` 
      });
    }

    // Reset login attempts
    await query('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Store session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Return user data (without password)
    const { password_hash, login_attempts, locked_until, ...safeUser } = user;

    res.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await query('DELETE FROM sessions WHERE token = $1', [req.token]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// Cleanup expired sessions (can be called periodically)
router.delete('/sessions/expired', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
    res.json({ deleted: result.rowCount });
  } catch (err) {
    next(err);
  }
});

export default router;
