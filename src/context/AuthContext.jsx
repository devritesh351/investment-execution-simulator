import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { authService as localAuthService } from '../utils/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useLocalMode, setUseLocalMode] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try backend first
      const backendUser = await api.getCurrentUser();
      if (backendUser) {
        setUser(backendUser);
        setUseLocalMode(false);
      } else {
        // Fallback to local auth
        const localUser = localAuthService.getCurrentUser();
        if (localUser) {
          setUser(localUser);
          setUseLocalMode(true);
        }
      }
    } catch (err) {
      // Backend unavailable, use local
      const localUser = localAuthService.getCurrentUser();
      if (localUser) {
        setUser(localUser);
        setUseLocalMode(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Try backend first
      const result = await api.login(email, password);
      setUser(result.user);
      setUseLocalMode(false);
      return result;
    } catch (err) {
      if (err.message.includes('Backend unavailable') || err.message.includes('Failed to fetch')) {
        // Fallback to local auth
        console.log('Using local authentication');
        const result = await localAuthService.login(email, password);
        setUser(result.user);
        setUseLocalMode(true);
        return result;
      }
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      return await api.register(userData);
    } catch (err) {
      if (err.message.includes('Backend unavailable') || err.message.includes('Failed to fetch')) {
        return await localAuthService.register(userData);
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (!useLocalMode) {
        await api.logout();
      } else {
        await localAuthService.logout();
      }
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      refreshUser,
      isLocalMode: useLocalMode 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
