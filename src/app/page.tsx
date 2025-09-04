'use client';

import useSWR from 'swr';
import StatusCard from './components/StatusCard';
import FundsCard from './components/FundsCard';
import ControlsCard from './components/ControlsCard';
import PositionsTable from './components/PositionsTable';
import Watchlist from './components/Watchlist'; // Import the new component

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    console.error(res.statusText);
    throw error;
  }
  return res.json();
});

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const { data: status, error: statusError, mutate: mutateStatus } = useSWR(`${apiUrl}/api/status`, fetcher, { refreshInterval: 5000 });
  const { data: funds, error: fundsError } = useSWR(`${apiUrl}/api/funds`, fetcher, { refreshInterval: 10000 });
  const { data: positions, error: positionsError } = useSWR(`${apiUrl}/api/positions`, fetcher, { refreshInterval: 5000 });
  const { data: universe, error: universeError } = useSWR(`${apiUrl}/api/universe`, fetcher, { refreshInterval: 60000 });

  const hasError = statusError || fundsError || positionsError || universeError;

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar - Watchlist */}
      <aside className="w-72 bg-white p-4 overflow-y-auto border-r border-gray-200">
        <h2 className="text-xl font-bold mb-4">Watchlist</h2>
        <Watchlist universe={universe} apiUrl={apiUrl} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Delayed data from free sources. Not for live trading decisions.</p>
        </header>

        {hasError && <p className="text-center text-red-500">Failed to load data from the backend. Ensure the backend is running and reachable.</p>}

        {!hasError && (
          <div className="space-y-6">
            {/* Top Row Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatusCard status={status} loginUrl={`${apiUrl}/auth/login`} />
              <FundsCard funds={funds} />
              <ControlsCard status={status} apiUrl={apiUrl} mutateStatus={mutateStatus} />
            </div>

            {/* Positions Table */}
            <div>
              <PositionsTable positions={positions} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
