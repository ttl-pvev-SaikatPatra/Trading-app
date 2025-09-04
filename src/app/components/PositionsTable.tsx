// File: app/components/PositionsTable.tsx
import React from 'react';

const PositionsTable = ({ positions }: any) => {
  const formatCurrency = (value: number) => (value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Live Positions</h2>
      <div className="overflow-x-auto">
        {positions && positions.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LTP</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.map((pos: any) => (
                <tr key={pos.symbol}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{pos.symbol}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono">{pos.quantity}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono">₹{formatCurrency(pos.average_price)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono">₹{formatCurrency(pos.last_price)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-mono font-semibold ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{formatCurrency(pos.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-4">No open positions.</p>
        )}
      </div>
    </div>
  );
};

export default PositionsTable;