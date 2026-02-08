// API Service - Connects to Express backend
// Falls back to localStorage simulation when backend is unavailable

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.useBackend = true; // Will fallback to localStorage if backend unavailable
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (err) {
      // Check if it's a network error (backend unavailable)
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        console.warn('Backend unavailable, using localStorage fallback');
        this.useBackend = false;
        throw new Error('Backend unavailable. Using offline mode.');
      }
      throw err;
    }
  }

  // Auth endpoints
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    if (!this.token) return null;
    
    try {
      const data = await this.request('/auth/me');
      return data.user;
    } catch {
      this.setToken(null);
      return null;
    }
  }

  // Transaction endpoints
  async getTransactions() {
    const data = await this.request('/transactions');
    return data.transactions;
  }

  async getTransaction(transactionId) {
    const data = await this.request(`/transactions/${transactionId}`);
    return data.transaction;
  }

  async createTransaction(assetType, assetName, amount, orderType = 'buy') {
    const data = await this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({ assetType, assetName, amount, orderType })
    });
    return data.transaction;
  }

  async advanceTransaction(transactionId) {
    const data = await this.request(`/transactions/${transactionId}/advance`, {
      method: 'POST'
    });
    return data.transaction;
  }

  async failTransaction(transactionId, reason) {
    return this.request(`/transactions/${transactionId}/fail`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async cancelTransaction(transactionId) {
    return this.request(`/transactions/${transactionId}/cancel`, {
      method: 'POST'
    });
  }

  // User endpoints (registrar only)
  async getUsers() {
    const data = await this.request('/users');
    return data.users;
  }

  async getUserStats() {
    const data = await this.request('/users/stats');
    return data.stats;
  }

  // Health check
  async healthCheck() {
    try {
      await this.request('/health');
      this.useBackend = true;
      return true;
    } catch {
      this.useBackend = false;
      return false;
    }
  }
}

export const api = new ApiService();
export default api;
