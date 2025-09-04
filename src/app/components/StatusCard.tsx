// File: app/components/StatusCard.tsx
import React from 'react';

const StatusBadge = ({ condition, textTrue, textFalse, colorTrue = 'bg-green-100 text-green-800', colorFalse = 'bg-red-100 text-red-800' }: any) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${condition ? colorTrue : colorFalse}`}>
    {condition ? textTrue : textFalse}
  </span>
);

const StatusCard = ({ status, loginUrl }: any) => {
  if (!status) return <div className="p-6 bg-white rounded-lg shadow-sm animate-pulse h-48"></div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">System Status</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Broker Connection</span>
          {status.broker_connected ? (
            <StatusBadge condition={status.broker_connected} textTrue="Connected" textFalse="Disconnected" />
          ) : (
            <a href={loginUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              Login
            </a>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Trading Engine</span>
          <StatusBadge condition={status.trading_enabled} textTrue="Enabled" textFalse="Disabled" colorFalse="bg-yellow-100 text-yellow-800" />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Trading Mode</span>
          <StatusBadge condition={!status.dry_run_mode} textTrue="Live Trading" textFalse="Dry Run" colorTrue="bg-red-100 text-red-800" colorFalse="bg-blue-100 text-blue-800" />
        </div>
        <div className="flex justify-between items-center text-sm pt-2">
           <span className="text-gray-500">Daily P&L</span>
           <span className={`font-mono ${status.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
             ₹{status.daily_pnl?.toFixed(2) || '0.00'}
           </span>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;