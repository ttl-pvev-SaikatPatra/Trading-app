import React from 'react';
import useSWR from 'swr';
import { UniverseStock } from '../types'; // Assuming you have a types.ts

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Watchlist = ({ universe, apiUrl }: { universe: UniverseStock[], apiUrl: string | undefined }) => {
  // Create a query string of symbols from the universe
  const symbols = universe?.map(stock => stock.symbol).join('&symbols=');
  const batchDataUrl = symbols ? `${apiUrl}/api/market-data?symbols=${symbols}` : null;
  
  // Fetch batch data for all symbols, refreshing every 10 seconds
  const { data: marketData, error } = useSWR(batchDataUrl, fetcher, { refreshInterval: 10000 });

  if (!universe) {
    return <div>Loading watchlist...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 text-sm">Could not load prices.</div>;
  }

  return (
    <div className="space-y-2">
      {universe.map(stock => {
        const data = marketData?.[stock.symbol];
        const price = data?.last_price || 0;
        const change = data?.change || 0;
        const changePct = data?.change_pct || 0;
        const isPositive = change >= 0;

        return (
          <div key={stock.symbol} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
            <span className="font-semibold text-sm">{stock.symbol}</span>
            <div className="text-right">
              <span className="font-mono text-sm block">
                {price > 0 ? `₹${price.toFixed(2)}` : '--'}
              </span>
              <span className={`font-mono text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {change !== 0 ? `${isPositive ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)` : '0.00 (0.00%)'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Watchlist;
