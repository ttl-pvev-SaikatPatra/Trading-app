// File: app/components/ControlsCard.tsx
'use client';
import React, { useState } from 'react';

const ControlsCard = ({ status, apiUrl, mutateStatus }: any) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleControlAction = async (action: string) => {
    setIsLoading(true);
    try {
      await fetch(`${apiUrl}/api/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      // Re-fetch the status data to update the UI
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