import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { transactionService } from '../utils/transactionService';
import { assetStateMachines } from '../utils/stateMachines';
import { db } from '../utils/database';
import { TransactionCard } from './TransactionCard';
import { TransactionDetailModal } from './TransactionDetailModal';

export function RegistrarDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [recentNotification, setRecentNotification] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const allTransactions = transactionService.getAllTransactions();
    setTransactions(allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    
    const allUsers = db.getAll('users').filter(u => u.role === 'user');
    setUsers(allUsers);
  };

  const handleAdvance = async (transactionId) => {
    await transactionService.advanceState(transactionId);
    loadData();
    
    const tx = transactionService.getTransaction(transactionId);
    if (tx) {
      setSelectedTransaction(tx);
      showNotification('success', 'State Advanced', `Transaction moved to ${tx.currentState}`);
    }
  };

  const handleFail = async (transactionId, reason) => {
    await transactionService.failTransaction(transactionId, reason);
    loadData();
    setSelectedTransaction(null);
    showNotification('warning', 'Transaction Rejected', reason);
  };

  const showNotification = (type, title, message) => {
    setRecentNotification({ type, title, message });
    setTimeout(() => setRecentNotification(null), 5000);
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    if (filterType !== 'all' && tx.assetType !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tx.assetName.toLowerCase().includes(query) || 
             tx.transactionId.toLowerCase().includes(query);
    }
    return true;
  });

  const stats = {
    totalTransactions: transactions.length,
    processing: transactions.filter(t => t.status === 'processing').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    totalUsers: users.length,
    totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0),
    byType: {
      mutualFund: transactions.filter(t => t.assetType === 'mutualFund').length,
      stock: transactions.filter(t => t.assetType === 'stock').length,
      crypto: transactions.filter(t => t.assetType === 'crypto').length
    },
    todayTransactions: transactions.filter(t => {
      const today = new Date().toDateString();
      return new Date(t.createdAt).toDateString() === today;
    }).length
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserById = (userId) => {
    return db.findOne('users', { id: userId });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Notification Toast */}
      {recentNotification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`p-4 rounded-xl border backdrop-blur-sm ${
            recentNotification.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
            recentNotification.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
            recentNotification.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-blue-500/10 border-blue-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {recentNotification.type === 'success' && <span className="text-green-400">✓</span>}
                {recentNotification.type === 'error' && <span className="text-red-400">✕</span>}
                {recentNotification.type === 'warning' && <span className="text-yellow-400">⚠</span>}
                {recentNotification.type === 'info' && <span className="text-blue-400">ℹ</span>}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{recentNotification.title}</p>
                <p className="text-gray-400 text-sm">{recentNotification.message}</p>
              </div>
              <button 
                onClick={() => setRecentNotification(null)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-white">AssetFlow</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                  Registrar
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live Stats */}
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                  </span>
                  <span className="text-gray-400 text-sm">Live</span>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Pending</p>
                  <p className="text-yellow-400 font-semibold">{stats.processing}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Today</p>
                  <p className="text-white font-semibold">{stats.todayTransactions}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-white font-medium">{user?.name}</p>
                <p className="text-gray-400 text-sm">Registrar Admin</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'transactions', label: 'Transactions', icon: '📋' },
              { id: 'pipeline', label: 'Pipeline', icon: '🔄' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
              { id: 'users', label: 'Users', icon: '👥' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-purple-400 border-purple-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-2xl font-bold text-white mt-1">{formatAmount(stats.totalVolume)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalTransactions}</p>
              </div>
              <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-4 bg-yellow-500/5">
                <p className="text-yellow-400 text-sm">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.processing}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by asset or ID..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <svg className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="mutualFund">Mutual Funds</option>
                <option value="stock">Stocks</option>
                <option value="crypto">Crypto</option>
              </select>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400 text-sm">{filteredTransactions.length} transactions</span>
              </div>
            </div>

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No transactions found</h3>
                <p className="text-gray-400">Transactions will appear here when users make investments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map(tx => {
                  const txUser = getUserById(tx.userId);
                  return (
                    <div key={tx.id} className="relative">
                      {/* User badge */}
                      <div className="absolute top-4 right-32 z-10 hidden md:flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {txUser?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-gray-500 text-xs">{txUser?.name || 'Unknown'}</span>
                      </div>
                      <TransactionCard 
                        transaction={tx} 
                        isRegistrar={true}
                        onAdvance={handleAdvance}
                        onFail={handleFail}
                        onClick={() => setSelectedTransaction(tx)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Transaction Pipeline</h2>
            <p className="text-gray-400">View transactions organized by their current state in the processing pipeline</p>
            
            {Object.entries(assetStateMachines).map(([type, machine]) => {
              const typeTransactions = transactions.filter(t => t.assetType === type && t.status === 'processing');
              if (typeTransactions.length === 0) return null;
              
              return (
                <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                      type === 'mutualFund' ? 'bg-blue-500/20' :
                      type === 'stock' ? 'bg-green-500/20' :
                      'bg-orange-500/20'
                    }`}>
                      {machine.states[0]?.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{machine.name}</h3>
                      <p className="text-gray-400 text-sm">{typeTransactions.length} processing</p>
                    </div>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {machine.states.map((state, stateIndex) => {
                      const stateTransactions = typeTransactions.filter(t => t.currentState === state.id);
                      
                      return (
                        <div 
                          key={state.id}
                          className={`flex-shrink-0 w-48 rounded-lg border p-3 ${
                            stateTransactions.length > 0 
                              ? type === 'mutualFund' ? 'bg-blue-500/5 border-blue-500/30' :
                                type === 'stock' ? 'bg-green-500/5 border-green-500/30' :
                                'bg-orange-500/5 border-orange-500/30'
                              : 'bg-gray-800/50 border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{state.icon}</span>
                            <span className="text-white text-sm font-medium">{state.name}</span>
                          </div>
                          <div className="text-2xl font-bold text-white mb-2">
                            {stateTransactions.length}
                          </div>
                          {stateTransactions.length > 0 && (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {stateTransactions.slice(0, 3).map(tx => (
                                <button
                                  key={tx.id}
                                  onClick={() => setSelectedTransaction(tx)}
                                  className="w-full text-left px-2 py-1 rounded bg-gray-800/50 text-gray-300 text-xs hover:bg-gray-800 transition truncate"
                                >
                                  {tx.transactionId}
                                </button>
                              ))}
                              {stateTransactions.length > 3 && (
                                <p className="text-gray-500 text-xs pl-2">+{stateTransactions.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {transactions.filter(t => t.status === 'processing').length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400">No transactions currently in processing</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Transaction Analytics</h2>
            
            {/* Volume by Asset Type */}
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(assetStateMachines).map(([type, machine]) => {
                const typeTransactions = transactions.filter(t => t.assetType === type);
                const volume = typeTransactions.reduce((sum, t) => sum + t.amount, 0);
                const count = typeTransactions.length;
                const successRate = count > 0 
                  ? ((typeTransactions.filter(t => t.status === 'completed').length / count) * 100).toFixed(1)
                  : 0;
                
                const colors = {
                  mutualFund: 'from-blue-500 to-blue-600',
                  stock: 'from-green-500 to-green-600',
                  crypto: 'from-orange-500 to-orange-600'
                };
                
                return (
                  <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[type]} flex items-center justify-center text-2xl mb-4`}>
                      {machine.states[0]?.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{machine.name}</h3>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Total Orders</span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Volume</span>
                        <span className="text-white font-medium">{formatAmount(volume)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Success Rate</span>
                        <span className="text-green-400 font-medium">{successRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Processing</span>
                        <span className="text-yellow-400 font-medium">
                          {typeTransactions.filter(t => t.status === 'processing').length}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* State Machine Flow Visualization */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Processing Pipeline Overview</h3>
              <p className="text-gray-400 text-sm mb-6">
                Each asset type follows a different state machine for processing transactions.
              </p>
              
              <div className="space-y-6">
                {Object.entries(assetStateMachines).map(([type, machine]) => (
                  <div key={type} className="border-t border-gray-800 pt-4 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">{machine.name}</h4>
                      <span className="text-gray-500 text-sm">{machine.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {machine.states.map((state, index) => (
                        <div key={state.id} className="flex items-center">
                          <div className="flex flex-col items-center min-w-[80px]">
                            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg">
                              {state.icon}
                            </div>
                            <span className="text-xs text-gray-400 mt-1 text-center">{state.name}</span>
                            <span className="text-[10px] text-gray-600">{state.duration}</span>
                          </div>
                          {index < machine.states.length - 1 && (
                            <svg className="w-6 h-6 text-gray-600 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Registered Users</h2>
              <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-sm">
                {users.length} users
              </span>
            </div>

            {users.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400">No users registered yet</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Joined</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Transactions</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {users.map(u => {
                      const userTransactions = transactions.filter(t => t.userId === u.id);
                      const userVolume = userTransactions.reduce((sum, t) => sum + t.amount, 0);
                      return (
                        <tr key={u.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{u.email}</td>
                          <td className="px-4 py-3 text-gray-400">{u.phone}</td>
                          <td className="px-4 py-3 text-gray-400">{formatDate(u.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                              {userTransactions.length}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-medium">{formatAmount(userVolume)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onAdvance={handleAdvance}
          onFail={handleFail}
          isRegistrar={true}
        />
      )}
    </div>
  );
}
