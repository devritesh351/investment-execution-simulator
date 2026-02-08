import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { transactionService } from '../utils/transactionService';
import { assetStateMachines } from '../utils/stateMachines';
import { validators } from '../utils/validators';
import { TransactionCard } from './TransactionCard';
import { TransactionDetailModal } from './TransactionDetailModal';
import { StateMachineExplainer } from './StateMachineViz';
import { Portfolio } from './Portfolio';

const SAMPLE_ASSETS = {
  mutualFund: [
    { name: 'HDFC Flexi Cap Fund', nav: 1523.45, category: 'Equity', rating: 5, minInvestment: 500 },
    { name: 'ICICI Pru Bluechip Fund', nav: 87.23, category: 'Large Cap', rating: 4, minInvestment: 100 },
    { name: 'SBI Small Cap Fund', nav: 156.78, category: 'Small Cap', rating: 5, minInvestment: 500 },
    { name: 'Axis Long Term Equity', nav: 78.45, category: 'ELSS', rating: 4, minInvestment: 500 },
    { name: 'Parag Parikh Flexi Cap', nav: 67.89, category: 'Flexi Cap', rating: 5, minInvestment: 1000 },
    { name: 'Mirae Asset Large Cap', nav: 98.34, category: 'Large Cap', rating: 4, minInvestment: 100 }
  ],
  stock: [
    { name: 'Reliance Industries', price: 2456.70, change: 1.2, sector: 'Energy' },
    { name: 'TCS', price: 3678.50, change: -0.5, sector: 'IT' },
    { name: 'HDFC Bank', price: 1567.80, change: 0.8, sector: 'Banking' },
    { name: 'Infosys', price: 1456.30, change: -1.1, sector: 'IT' },
    { name: 'ICICI Bank', price: 1089.45, change: 2.1, sector: 'Banking' },
    { name: 'Bharti Airtel', price: 1234.60, change: 0.3, sector: 'Telecom' }
  ],
  crypto: [
    { name: 'Bitcoin (BTC)', price: 5678900, change: 2.5, marketCap: '₹112L Cr' },
    { name: 'Ethereum (ETH)', price: 234567, change: 1.8, marketCap: '₹28L Cr' },
    { name: 'Polygon (MATIC)', price: 89.50, change: -0.3, marketCap: '₹8200 Cr' },
    { name: 'Solana (SOL)', price: 12345, change: 3.2, marketCap: '₹5400 Cr' },
    { name: 'Cardano (ADA)', price: 45.67, change: -1.5, marketCap: '₹1600 Cr' },
    { name: 'Avalanche (AVAX)', price: 2890, change: 4.2, marketCap: '₹1100 Cr' }
  ]
};

export function UserDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState('mutualFund');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyError, setBuyError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentNotification, setRecentNotification] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(loadTransactions, 2000);
    return () => clearInterval(interval);
  }, [user]);

  const loadTransactions = useCallback(() => {
    if (user) {
      const userTransactions = transactionService.getUserTransactions(user.id);
      setTransactions(userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  }, [user]);

  const handleBuy = async () => {
    const minAmount = selectedAsset?.minInvestment || 100;
    const validation = validators.amount.validate(buyAmount, minAmount);
    if (!validation.valid) {
      setBuyError(validation.message);
      return;
    }

    setProcessing(true);
    try {
      const tx = await transactionService.createTransaction(
        user.id,
        selectedAssetType,
        selectedAsset.name,
        buyAmount,
        'buy'
      );
      
      simulateTransactionProgress(tx.transactionId);
      
      setShowBuyModal(false);
      setBuyAmount('');
      setSelectedAsset(null);
      loadTransactions();
      
      // Show notification
      setRecentNotification({
        type: 'success',
        title: 'Order Placed!',
        message: `Your ${selectedAsset.name} order is being processed.`
      });
      setTimeout(() => setRecentNotification(null), 5000);
      
      setActiveTab('dashboard');
    } catch (err) {
      setBuyError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const simulateTransactionProgress = async (transactionId) => {
    const delays = {
      mutualFund: [2000, 3000, 5000, 4000, 6000, 3000, 2000],
      stock: [500, 500, 1000, 2000, 1500, 3000, 2000],
      crypto: [300, 300, 500, 500, 2000]
    };
    
    const tx = transactionService.getTransaction(transactionId);
    const typeDelays = delays[tx?.assetType] || delays.stock;
    
    for (const delay of typeDelays) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const currentTx = transactionService.getTransaction(transactionId);
      if (currentTx && currentTx.status === 'processing') {
        await transactionService.advanceState(transactionId);
        loadTransactions();
      } else {
        break;
      }
    }
  };

  const handleRetryTransaction = async (transactionId) => {
    const tx = transactionService.getTransaction(transactionId);
    if (tx) {
      const newTx = await transactionService.createTransaction(
        user.id,
        tx.assetType,
        tx.assetName,
        tx.amount,
        tx.orderType
      );
      simulateTransactionProgress(newTx.transactionId);
      setSelectedTransaction(null);
      loadTransactions();
      
      setRecentNotification({
        type: 'info',
        title: 'Transaction Retried',
        message: `New order created for ${tx.assetName}`
      });
      setTimeout(() => setRecentNotification(null), 5000);
    }
  };

  const handleCancelTransaction = async (transactionId) => {
    await transactionService.failTransaction(transactionId, 'Cancelled by user');
    setSelectedTransaction(null);
    loadTransactions();
    
    setRecentNotification({
      type: 'warning',
      title: 'Transaction Cancelled',
      message: 'Your order has been cancelled'
    });
    setTimeout(() => setRecentNotification(null), 5000);
  };

  const stats = {
    total: transactions.length,
    processing: transactions.filter(t => t.status === 'processing').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    totalInvested: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0)
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tx.assetName.toLowerCase().includes(query) || 
             tx.transactionId.toLowerCase().includes(query);
    }
    return true;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: price > 1000 ? 0 : 2
    }).format(price);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">AssetFlow</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quick Stats in Header */}
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Portfolio Value</p>
                  <p className="text-white font-semibold">{formatAmount(stats.totalInvested)}</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Processing</p>
                  <p className="text-yellow-400 font-semibold">{stats.processing}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-white font-medium">{user?.name}</p>
                <p className="text-gray-400 text-sm">Investor</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                title="Logout"
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
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'invest', label: 'Invest', icon: '💰' },
              { id: 'portfolio', label: 'Portfolio', icon: '📈' },
              { id: 'learn', label: 'Learn', icon: '📚' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400'
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
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Processing</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.processing}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Failed</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:col-span-1 col-span-2">
                <p className="text-gray-400 text-sm">Total Invested</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{formatAmount(stats.totalInvested)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              <button
                onClick={() => setActiveTab('invest')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition flex items-center gap-2"
              >
                <span>+ New Investment</span>
              </button>
            </div>

            {/* Transactions */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Your Transactions
                {filteredTransactions.length !== transactions.length && (
                  <span className="text-gray-500 text-sm font-normal ml-2">
                    (showing {filteredTransactions.length} of {transactions.length})
                  </span>
                )}
              </h2>
              {filteredTransactions.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {transactions.length === 0 ? 'Start investing to see your transaction history' : 'Try adjusting your filters'}
                  </p>
                  {transactions.length === 0 && (
                    <button
                      onClick={() => setActiveTab('invest')}
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition"
                    >
                      Start Investing
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map(tx => (
                    <TransactionCard 
                      key={tx.id} 
                      transaction={tx}
                      onClick={() => setSelectedTransaction(tx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <div className="space-y-6">
            {/* Asset Type Selector */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(assetStateMachines).map(([type, machine]) => (
                <button
                  key={type}
                  onClick={() => setSelectedAssetType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    selectedAssetType === type
                      ? type === 'mutualFund' ? 'bg-blue-500 text-white' :
                        type === 'stock' ? 'bg-green-500 text-white' :
                        'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{machine.states[0]?.icon}</span>
                  {machine.name}
                </button>
              ))}
            </div>

            {/* Asset List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_ASSETS[selectedAssetType]?.map((asset, index) => (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium group-hover:text-blue-400 transition">{asset.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {asset.category && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">{asset.category}</span>
                        )}
                        {asset.sector && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">{asset.sector}</span>
                        )}
                        {asset.rating && (
                          <span className="text-yellow-400 text-xs">{'★'.repeat(asset.rating)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-gray-500 text-xs">{asset.nav ? 'NAV' : 'Price'}</p>
                      <p className="text-white font-semibold text-lg">
                        {formatPrice(asset.price || asset.nav)}
                      </p>
                      {asset.change !== undefined && (
                        <span className={`text-sm ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {asset.change >= 0 ? '↑' : '↓'} {Math.abs(asset.change)}%
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowBuyModal(true);
                        setBuyError('');
                      }}
                      className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition text-sm font-medium"
                    >
                      Buy Now
                    </button>
                  </div>

                  {asset.minInvestment && (
                    <p className="text-gray-500 text-xs mt-2">Min. investment: ₹{asset.minInvestment}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Info Banner */}
            <div className={`rounded-xl p-4 border ${
              selectedAssetType === 'mutualFund' ? 'bg-blue-500/10 border-blue-500/20' :
              selectedAssetType === 'stock' ? 'bg-green-500/10 border-green-500/20' :
              'bg-orange-500/10 border-orange-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedAssetType === 'mutualFund' ? 'bg-blue-500/20' :
                  selectedAssetType === 'stock' ? 'bg-green-500/20' :
                  'bg-orange-500/20'
                }`}>
                  <span className="text-xl">{assetStateMachines[selectedAssetType]?.states[0]?.icon}</span>
                </div>
                <div>
                  <h4 className={`font-medium ${
                    selectedAssetType === 'mutualFund' ? 'text-blue-400' :
                    selectedAssetType === 'stock' ? 'text-green-400' :
                    'text-orange-400'
                  }`}>
                    About {assetStateMachines[selectedAssetType]?.name} Processing
                  </h4>
                  <p className="text-gray-400 text-sm mt-1">
                    {assetStateMachines[selectedAssetType]?.description}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    ⏱️ Estimated time: <strong>{assetStateMachines[selectedAssetType]?.estimatedTime}</strong>
                  </p>
                  <p className="text-gray-500 text-sm">
                    📋 Processing steps: <strong>{assetStateMachines[selectedAssetType]?.states.length}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <Portfolio transactions={transactions} />
        )}

        {activeTab === 'learn' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">How Asset Processing Works</h2>
              <p className="text-gray-400 mt-2">Understand what happens after you click "Buy" - click on any transaction to see live progress</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(assetStateMachines).map(([type, machine]) => (
                <StateMachineExplainer key={type} assetType={type} />
              ))}
            </div>

            {/* Additional Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Key Differences</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400">Feature</th>
                      <th className="text-left py-3 px-4 text-blue-400">Mutual Funds</th>
                      <th className="text-left py-3 px-4 text-green-400">Stocks</th>
                      <th className="text-left py-3 px-4 text-orange-400">Crypto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr>
                      <td className="py-3 px-4 text-gray-400">Settlement Time</td>
                      <td className="py-3 px-4 text-white">T+1 to T+2</td>
                      <td className="py-3 px-4 text-white">T+1</td>
                      <td className="py-3 px-4 text-white">Near Instant</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-400">Trading Hours</td>
                      <td className="py-3 px-4 text-white">Until 3 PM</td>
                      <td className="py-3 px-4 text-white">9:15 AM - 3:30 PM</td>
                      <td className="py-3 px-4 text-white">24/7</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-400">Price Discovery</td>
                      <td className="py-3 px-4 text-white">End of Day NAV</td>
                      <td className="py-3 px-4 text-white">Real-time</td>
                      <td className="py-3 px-4 text-white">Real-time</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-400">Order Type</td>
                      <td className="py-3 px-4 text-white">Batch Processing</td>
                      <td className="py-3 px-4 text-white">Individual Order</td>
                      <td className="py-3 px-4 text-white">Individual Order</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-400">Minimum Investment</td>
                      <td className="py-3 px-4 text-white">₹100 - ₹500</td>
                      <td className="py-3 px-4 text-white">1 Share</td>
                      <td className="py-3 px-4 text-white">₹100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Buy Modal */}
      {showBuyModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Buy {selectedAsset.name}</h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-sm">{selectedAsset.nav ? 'Current NAV' : 'Current Price'}</p>
                    <p className="text-xl font-bold text-white">
                      {formatPrice(selectedAsset.price || selectedAsset.nav)}
                    </p>
                  </div>
                  {selectedAsset.change !== undefined && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedAsset.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedAsset.change >= 0 ? '+' : ''}{selectedAsset.change}%
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount (₹)
                </label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => {
                    setBuyAmount(e.target.value);
                    setBuyError('');
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter amount (min ₹${selectedAsset.minInvestment || 100})`}
                />
                {buyError && <p className="mt-1 text-sm text-red-400">{buyError}</p>}
                
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 5000, 10000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setBuyAmount(amount.toString())}
                      className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition"
                    >
                      ₹{amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {buyAmount && !buyError && (
                <div className="p-3 bg-gray-800 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Investment Amount</span>
                    <span className="text-white">{formatAmount(parseFloat(buyAmount) || 0)}</span>
                  </div>
                  {selectedAsset.nav && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Est. Units</span>
                      <span className="text-white">~{((parseFloat(buyAmount) || 0) / selectedAsset.nav).toFixed(3)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className={`p-3 rounded-lg border ${
                selectedAssetType === 'mutualFund' ? 'bg-blue-500/10 border-blue-500/20' :
                selectedAssetType === 'stock' ? 'bg-green-500/10 border-green-500/20' :
                'bg-orange-500/10 border-orange-500/20'
              }`}>
                <p className={`text-sm ${
                  selectedAssetType === 'mutualFund' ? 'text-blue-400' :
                  selectedAssetType === 'stock' ? 'text-green-400' :
                  'text-orange-400'
                }`}>
                  ⏱️ This transaction will take approximately{' '}
                  <strong>{assetStateMachines[selectedAssetType]?.estimatedTime}</strong> to complete.
                  You can track each step in real-time!
                </p>
              </div>

              <button
                onClick={handleBuy}
                disabled={processing}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>Confirm Purchase</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onRetry={handleRetryTransaction}
          onCancel={handleCancelTransaction}
        />
      )}
    </div>
  );
}
