import React from 'react';
import { Funds } from '../types'; // Import the Funds type

// Define the shape of the props
interface FundsCardProps {
  funds: Funds;
}

const FundsCard = ({ funds }: FundsCardProps) => {
  if (!funds) return <div className="p-6 bg-white rounded-lg shadow-sm animate-pulse h-40"></div>;
  
  const formatCurrency = (value: number) => `₹${(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Funds Overview</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Available Margin</span>
          <span className="font-mono text-green-600 font-medium">{formatCurrency(funds.available_margin)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Used Margin</span>
          <span className="font-mono text-gray-700">{formatCurrency(funds.used_margin)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t mt-3">
          <span className="text-gray-800 font-semibold">Total Balance</span>
          <span className="font-mono text-gray-900 font-bold">{formatCurrency(funds.total_balance)}</span>
        </div>
      </div>
    </div>
  );
};

export default FundsCard;