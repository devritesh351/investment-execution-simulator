// Authentication Service - Simulates backend auth logic
import { db } from './database';
import { validators, sanitize } from './validators';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const authService = {
  register: async (userData) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { email, password, confirmPassword, name, phone, role = 'user' } = userData;
    
    // Validation
    const emailValidation = validators.email.validate(email);
    if (!emailValidation.valid) throw new Error(emailValidation.message);
    
    const passwordValidation = validators.password.validate(password);
    if (!passwordValidation.valid) throw new Error(passwordValidation.message);
    
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    
    const nameValidation = validators.name.validate(name);
    if (!nameValidation.valid) throw new Error(nameValidation.message);
    
    const phoneValidation = validators.phone.validate(phone);
    if (!phoneValidation.valid) throw new Error(phoneValidation.message);
    
    // Check if email already exists
    const existingUser = db.findOne('users', { email: sanitize.email(email) });
    if (existingUser) throw new Error('An account with this email already exists');
    
    // Create user
    const newUser = db.insert('users', {
      email: sanitize.email(email),
      password: password, // In real app, this would be hashed
      name: sanitize.name(name),
      phone: sanitize.phone(phone),
      role,
      createdAt: new Date().toISOString(),
      isVerified: false,
      loginAttempts: 0,
      lockedUntil: null
    });
    
    return { success: true, message: 'Account created successfully. Please login.' };
  },
  
  login: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const emailValidation = validators.email.validate(email);
    if (!emailValidation.valid) throw new Error(emailValidation.message);
    
    if (!password) throw new Error('Password is required');
    
    const user = db.findOne('users', { email: sanitize.email(email) });
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
    }
    
    // Validate password
    if (user.password !== password) {
      const newAttempts = (user.loginAttempts || 0) + 1;
      const updates = { loginAttempts: newAttempts };
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
        db.update('users', { id: user.id }, updates);
        throw new Error(`Too many failed attempts. Account locked for 15 minutes.`);
      }
      
      db.update('users', { id: user.id }, updates);
      throw new Error(`Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.`);
    }
    
    // Reset login attempts on successful login
    db.update('users', { id: user.id }, { loginAttempts: 0, lockedUntil: null });
    
    // Create session
    const session = {
      userId: user.id,
      token: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16),
      expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    db.insert('sessions', session);
    
    // Store session token
    localStorage.setItem('auth_token', session.token);
    
    const { password: _, ...safeUser } = user;
    return { success: true, user: safeUser, token: session.token };
  },
  
  logout: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      db.delete('sessions', { token });
    }
    localStorage.removeItem('auth_token');
    return { success: true };
  },
  
  getCurrentUser: () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    const session = db.findOne('sessions', { token });
    if (!session) return null;
    
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem('auth_token');
      db.delete('sessions', { token });
      return null;
    }
    
    const user = db.findOne('users', { id: session.userId });
    if (!user) return null;
    
    const { password: _, ...safeUser } = user;
    return safeUser;
  },
  
  isAuthenticated: () => {
    return authService.getCurrentUser() !== null;
  }
};
