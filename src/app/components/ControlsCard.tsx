// File: src/app/components/ControlsCard.tsx
'use client';
import React, { useState } from 'react';
import { Status } from '../types';

interface ControlsCardProps {
  status: Status;
  apiUrl: string | undefined;
  mutateStatus: () => void;
}

const ControlsCard = ({ status, apiUrl, mutateStatus }: ControlsCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // ==================================================================
  // THIS IS THE FIX:
  // If status data hasn't loaded yet, show a placeholder.
  // This prevents the build from crashing.
  // ==================================================================
  if (!status) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const handleControlAction = async (action: string) => {
    setIsLoading(true);
    try {
      await fetch(`${apiUrl}/api/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      mutateStatus();
    } catch (error) {
      console.error(`Failed to perform action: ${action}`, error);
      alert(`Error: Could not perform action '${action}'.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Engine Controls</h2>
      <div className="space-y-4">
        <button
          onClick={() => handleControlAction(status.trading_enabled ? 'stop' : 'start')}
          disabled={isLoading || !status.broker_connected}
          className={`w-full px-4 py-2 font-semibold rounded-md transition-colors
            ${status.trading_enabled ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}
            disabled:bg-gray-300 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Processing...' : (status.trading_enabled ? 'Stop Trading Engine' : 'Start Trading Engine')}
        </button>

        <button
          onClick={() => handleControlAction('toggle_dry_run')}
          disabled={isLoading || !status.broker_connected}
          className="w-full px-4 py-2 font-semibold rounded-md transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : (status.dry_run_mode ? 'Switch to Live Trading' : 'Switch to Dry Run')}
        </button>
        {status.dry_run_mode === false && (
          <p className="text-xs text-center text-red-600 font-bold">WARNING: Live Trading is Active.</p>
        )}
      </div>
    </div>
  );
};

export default ControlsCard;
