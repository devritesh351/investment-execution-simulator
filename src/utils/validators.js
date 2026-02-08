// Real-world validation constraints

export const validators = {
  email: {
    validate: (email) => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!email) return { valid: false, message: 'Email is required' };
      if (!emailRegex.test(email)) return { valid: false, message: 'Invalid email format' };
      if (email.length > 254) return { valid: false, message: 'Email too long (max 254 characters)' };
      return { valid: true, message: '' };
    }
  },
  
  password: {
    validate: (password) => {
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
        message: errors.length > 0 ? errors[0] : '',
        errors
      };
    },
    
    getStrength: (password) => {
      if (!password) return { score: 0, label: 'None', color: 'gray' };
      let score = 0;
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
      if (password.length >= 16) score++;
      
      if (score <= 2) return { score, label: 'Weak', color: 'red' };
      if (score <= 4) return { score, label: 'Medium', color: 'yellow' };
      if (score <= 5) return { score, label: 'Strong', color: 'blue' };
      return { score, label: 'Very Strong', color: 'green' };
    }
  },
  
  name: {
    validate: (name) => {
      if (!name) return { valid: false, message: 'Name is required' };
      if (name.length < 2) return { valid: false, message: 'Name must be at least 2 characters' };
      if (name.length > 100) return { valid: false, message: 'Name too long (max 100 characters)' };
      if (!/^[a-zA-Z\s'-]+$/.test(name)) return { valid: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
      return { valid: true, message: '' };
    }
  },
  
  phone: {
    validate: (phone) => {
      if (!phone) return { valid: false, message: 'Phone number is required' };
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        return { valid: false, message: 'Invalid phone number (10-15 digits)' };
      }
      return { valid: true, message: '' };
    }
  },

  amount: {
    validate: (amount, min = 100, max = 10000000) => {
      const num = parseFloat(amount);
      if (isNaN(num)) return { valid: false, message: 'Invalid amount' };
      if (num < min) return { valid: false, message: `Minimum amount is ₹${min}` };
      if (num > max) return { valid: false, message: `Maximum amount is ₹${max.toLocaleString()}` };
      return { valid: true, message: '' };
    }
  }
};

export const sanitize = {
  email: (email) => email?.toLowerCase().trim(),
  name: (name) => name?.trim().replace(/\s+/g, ' '),
  phone: (phone) => phone?.replace(/[^\d+]/g, '')
};
