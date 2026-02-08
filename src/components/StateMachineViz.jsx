import { useState, useEffect } from 'react';
import { assetStateMachines } from '../utils/stateMachines';

export function StateMachineViz({ assetType, currentState, stateHistory = [], compact = false }) {
  const machine = assetStateMachines[assetType];
  if (!machine) return null;

  const currentIndex = machine.states.findIndex(s => s.id === currentState);
  const isFailed = currentState === 'failed';

  const getStateStatus = (stateIndex) => {
    if (isFailed) {
      const failedAtIndex = stateHistory.findIndex(h => h.state === 'failed');
      if (failedAtIndex > -1) {
        const completedStates = stateHistory.slice(0, failedAtIndex).map(h => h.state);
        const state = machine.states[stateIndex];
        if (completedStates.includes(state.id)) return 'completed';
      }
      return stateIndex <= currentIndex ? 'failed' : 'pending';
    }
    if (stateIndex < currentIndex) return 'completed';
    if (stateIndex === currentIndex) return 'current';
    return 'pending';
  };

  const colorClasses = {
    blue: {
      completed: 'bg-blue-500 border-blue-500 text-white',
      current: 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse',
      pending: 'bg-gray-800 border-gray-700 text-gray-500',
      line: 'bg-blue-500',
      linePending: 'bg-gray-700'
    },
    green: {
      completed: 'bg-green-500 border-green-500 text-white',
      current: 'bg-green-500/20 border-green-500 text-green-400 animate-pulse',
      pending: 'bg-gray-800 border-gray-700 text-gray-500',
      line: 'bg-green-500',
      linePending: 'bg-gray-700'
    },
    orange: {
      completed: 'bg-orange-500 border-orange-500 text-white',
      current: 'bg-orange-500/20 border-orange-500 text-orange-400 animate-pulse',
      pending: 'bg-gray-800 border-gray-700 text-gray-500',
      line: 'bg-orange-500',
      linePending: 'bg-gray-700'
    }
  };

  const colors = colorClasses[machine.color] || colorClasses.blue;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {machine.states.map((state, index) => {
          const status = getStateStatus(index);
          return (
            <div key={state.id} className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === 'completed' ? colors.line
                    : status === 'current' ? colors.line + ' animate-pulse'
                    : status === 'failed' ? 'bg-red-500'
                    : 'bg-gray-600'
                }`}
                title={state.name}
              />
              {index < machine.states.length - 1 && (
                <div className={`w-3 h-0.5 ${
                  status === 'completed' || status === 'current' ? colors.line : 'bg-gray-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex justify-between items-center">
          {machine.states.map((state, index) => {
            const status = getStateStatus(index);
            return (
              <div key={state.id} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all duration-300 ${
                    status === 'completed' ? colors.completed
                      : status === 'current' ? colors.current
                      : status === 'failed' ? 'bg-red-500/20 border-red-500 text-red-400'
                      : colors.pending
                  }`}
                >
                  {status === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : status === 'failed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    state.icon
                  )}
                </div>
                <span className={`mt-2 text-xs text-center max-w-[80px] ${
                  status === 'current' ? 'text-white font-medium' : 'text-gray-400'
                }`}>
                  {state.name}
                </span>
              </div>
            );
          })}
        </div>
        {/* Connection Lines */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-700 -z-0">
          <div
            className={`h-full ${isFailed ? 'bg-red-500' : colors.line} transition-all duration-500`}
            style={{
              width: `${Math.min(100, (currentIndex / (machine.states.length - 1)) * 100)}%`
            }}
          />
        </div>
      </div>

      {/* Current State Details */}
      {currentState && (
        <div className={`p-4 rounded-xl border ${
          isFailed ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
              isFailed ? 'bg-red-500/20' : 'bg-gray-700'
            }`}>
              {isFailed ? '❌' : machine.states[currentIndex]?.icon}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${isFailed ? 'text-red-400' : 'text-white'}`}>
                {isFailed ? 'Transaction Failed' : machine.states[currentIndex]?.name}
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                {isFailed
                  ? stateHistory.find(h => h.state === 'failed')?.message || 'An error occurred'
                  : machine.states[currentIndex]?.details}
              </p>
              {!isFailed && machine.states[currentIndex]?.duration && (
                <p className="text-xs text-gray-500 mt-2">
                  Estimated duration: {machine.states[currentIndex].duration}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StateMachineExplainer({ assetType }) {
  const machine = assetStateMachines[assetType];
  if (!machine) return null;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[machine.color]} flex items-center justify-center text-2xl`}>
          {machine.states[0]?.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{machine.name}</h3>
          <p className="text-sm text-gray-400">{machine.estimatedTime}</p>
        </div>
      </div>
      
      <p className="text-gray-300 text-sm mb-6">{machine.description}</p>
      
      <div className="space-y-3">
        {machine.states.map((state, index) => (
          <div key={state.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm">
                {state.icon}
              </div>
              {index < machine.states.length - 1 && (
                <div className="w-0.5 h-8 bg-gray-700 my-1" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <h4 className="text-white font-medium text-sm">{state.name}</h4>
              <p className="text-gray-400 text-xs mt-0.5">{state.description}</p>
              <span className="text-gray-500 text-xs">{state.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
