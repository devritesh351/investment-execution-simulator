// Validation middleware and utilities

export const validators = {
  email: (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return { valid: false, message: 'Email is required' };
    if (!emailRegex.test(email)) return { valid: false, message: 'Invalid email format' };
    if (email.length > 254) return { valid: false, message: 'Email too long' };
    return { valid: true };
  },

  password: (password) => {
    const errors = [];
    if (!password) return { valid: false, message: 'Password is required', errors: ['Password is required'] };
    if (password.length < 8) errors.push('At least 8 characters');
    if (password.length > 128) errors.push('Maximum 128 characters');
    if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('At least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('At least one special character');
    if (/\s/.test(password)) errors.push('No spaces allowed');
    
    return {
      valid: errors.length === 0,
      message: errors[0] || '',
      errors
    };
  },

  name: (name) => {
    if (!name) return { valid: false, message: 'Name is required' };
    if (name.length < 2) return { valid: false, message: 'Name must be at least 2 characters' };
    if (name.length > 100) return { valid: false, message: 'Name too long' };
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return { valid: false, message: 'Name contains invalid characters' };
    return { valid: true };
  },

  phone: (phone) => {
    if (!phone) return { valid: false, message: 'Phone is required' };
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      return { valid: false, message: 'Invalid phone number (10-15 digits)' };
    }
    return { valid: true };
  },

  amount: (amount, min = 100, max = 10000000) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return { valid: false, message: 'Invalid amount' };
    if (num < min) return { valid: false, message: `Minimum amount is ₹${min}` };
    if (num > max) return { valid: false, message: `Maximum amount is ₹${max.toLocaleString()}` };
    return { valid: true };
  }
};

export function validateRequest(schema) {
  return (req, res, next) => {
    const errors = {};

    for (const [field, validator] of Object.entries(schema)) {
      const value = req.body[field];
      const result = validator(value);
      
      if (!result.valid) {
        errors[field] = result.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}
