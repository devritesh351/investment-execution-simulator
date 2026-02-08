import { useState, useMemo } from 'react';
import { assetStateMachines } from '../utils/stateMachines';

export function Portfolio({ transactions }) {
  const [sortBy, setSortBy] = useState('value');
  
  const portfolio = useMemo(() => {
    // Group completed transactions by asset
    const completedTx = transactions.filter(t => t.status === 'completed');
    const holdings = {};

    completedTx.forEach(tx => {
      const key = `${tx.assetType}:${tx.assetName}`;
      if (!holdings[key]) {
        holdings[key] = {
          assetType: tx.assetType,
          assetName: tx.assetName,
          totalInvested: 0,
          transactions: [],
          firstPurchase: tx.createdAt,
          lastPurchase: tx.createdAt
        };
      }
      holdings[key].totalInvested += tx.amount;
      holdings[key].transactions.push(tx);
      if (new Date(tx.createdAt) > new Date(holdings[key].lastPurchase)) {
        holdings[key].lastPurchase = tx.createdAt;
      }
    });

    // Calculate mock current values (±10% of invested)
    return Object.values(holdings).map(h => {
      const randomReturn = (Math.random() - 0.3) * 0.2; // -3% to +17%
      const currentValue = h.totalInvested * (1 + randomReturn);
      const gain = currentValue - h.totalInvested;
      const gainPercent = (gain / h.totalInvested) * 100;
      
      return {
        ...h,
        currentValue,
        gain,
        gainPercent
      };
    });
  }, [transactions]);

  const totalInvested = portfolio.reduce((sum, h) => sum + h.totalInvested, 0);
  const totalCurrentValue = portfolio.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGain = totalCurrentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const sortedPortfolio = useMemo(() => {
    return [...portfolio].sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.currentValue - a.currentValue;
        case 'gain':
          return b.gainPercent - a.gainPercent;
        case 'invested':
          return b.totalInvested - a.totalInvested;
        case 'recent':
          return new Date(b.lastPurchase) - new Date(a.lastPurchase);
        default:
          return 0;
      }
    });
  }, [portfolio, sortBy]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const assetIcons = {
    mutualFund: '📊',
    stock: '📈',
    crypto: '₿'
  };

  const assetLabels = {
    mutualFund: 'Mutual Fund',
    stock: 'Stock',
    crypto: 'Crypto'
  };

  if (portfolio.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Holdings Yet</h3>
        <p className="text-gray-400">Complete some transactions to build your portfolio</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Invested</p>
          <p className="text-2xl font-bold text-white mt-1">{formatAmount(totalInvested)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Current Value</p>
          <p className="text-2xl font-bold text-white mt-1">{formatAmount(totalCurrentValue)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Returns</p>
          <p className={`text-2xl font-bold mt-1 ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGain >= 0 ? '+' : ''}{formatAmount(totalGain)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Return %</p>
          <p className={`text-2xl font-bold mt-1 ${totalGainPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Holdings List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Your Holdings</h3>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="value">Current Value</option>
              <option value="gain">Returns %</option>
              <option value="invested">Amount Invested</option>
              <option value="recent">Recent</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-800">
          {sortedPortfolio.map((holding, index) => (
            <div key={index} className="p-4 hover:bg-gray-800/50 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl">
                    {assetIcons[holding.assetType]}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{holding.assetName}</h4>
                    <p className="text-gray-500 text-sm">
                      {assetLabels[holding.assetType]} • {holding.transactions.length} transactions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{formatAmount(holding.currentValue)}</p>
                  <p className={`text-sm ${holding.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {holding.gain >= 0 ? '+' : ''}{formatAmount(holding.gain)} ({holding.gainPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Invested:</span>
                  <span className="text-gray-300">{formatAmount(holding.totalInvested)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Avg. Cost:</span>
                  <span className="text-gray-300">{formatAmount(holding.totalInvested / holding.transactions.length)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Allocation Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
        <div className="flex items-center gap-6">
          {/* Simple bar chart */}
          <div className="flex-1 space-y-3">
            {Object.entries(assetStateMachines).map(([type, machine]) => {
              const typeValue = portfolio
                .filter(h => h.assetType === type)
                .reduce((sum, h) => sum + h.currentValue, 0);
              const percentage = totalCurrentValue > 0 ? (typeValue / totalCurrentValue) * 100 : 0;
              
              const colors = {
                mutualFund: 'bg-blue-500',
                stock: 'bg-green-500',
                crypto: 'bg-orange-500'
              };

              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">{machine.name}</span>
                    <span className="text-white">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[type]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2">
            {Object.entries(assetStateMachines).map(([type, machine]) => {
              const typeValue = portfolio
                .filter(h => h.assetType === type)
                .reduce((sum, h) => sum + h.currentValue, 0);
              
              const colors = {
                mutualFund: 'bg-blue-500',
                stock: 'bg-green-500',
                crypto: 'bg-orange-500'
              };

              return (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 rounded ${colors[type]}`} />
                  <span className="text-gray-400">{formatAmount(typeValue)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
