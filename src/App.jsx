import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { UserDashboard } from './components/UserDashboard';
import { RegistrarDashboard } from './components/RegistrarDashboard';

function OfflineBanner() {
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
        <span className="text-yellow-400">⚠️</span>
        <span className="text-yellow-200">
          Running in offline mode (localStorage). Connect backend for full functionality.
        </span>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, login, register, loading, isLocalMode } = useAuth();
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      await login(email, password);
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const handleRegister = async (userData) => {
    setAuthError('');
    await register(userData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-gray-400">Loading AssetFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return (
        <Register
          onRegister={handleRegister}
          onSwitchToLogin={() => {
            setAuthView('login');
            setAuthError('');
          }}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => {
          setAuthView('register');
          setAuthError('');
        }}
        error={authError}
      />
    );
  }

  // Route based on user role
  if (user.role === 'registrar') {
    return (
      <>
        {isLocalMode && <OfflineBanner />}
        <RegistrarDashboard />
      </>
    );
  }

  return (
    <>
      {isLocalMode && <OfflineBanner />}
      <UserDashboard />
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
