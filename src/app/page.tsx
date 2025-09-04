// File: app/page.tsx
'use client';

import useSWR from 'swr';
import StatusCard from './components/StatusCard';
import FundsCard from './components/FundsCard';
import ControlsCard from './components/ControlsCard';
import PositionsTable from './components/PositionsTable';

// A simple fetcher function that throws an error on non-2xx responses
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
});

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Fetch all necessary data using SWR for automatic re-fetching
  const { data: status, error: statusError, mutate: mutateStatus } = useSWR(`${apiUrl}/api/status`, fetcher, { refreshInterval: 5000 });
  const { data: funds, error: fundsError } = useSWR(`${apiUrl}/api/funds`, fetcher, { refreshInterval: 10000 });
  const { data: positions, error: positionsError } = useSWR(`${apiUrl}/api/positions`, fetcher, { refreshInterval: 5000 });

  // Handle loading and error states
  const isLoading = !status && !statusError;
  const hasError = statusError || fundsError || positionsError;

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Bot Dashboard</h1>
          <p className="text-gray-500 mt-1">Your automated command center for Indian Equities.</p>
        </header>

        {isLoading && <p className="text-center text-gray-500">Loading dashboard...</p>}
        {hasError && <p className="text-center text-red-500">Failed to load data from the backend. Ensure the backend is running.</p>}
        
        {!isLoading && !hasError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Column 1 */}
            <div className="space-y-6">
              <StatusCard status={status} loginUrl={`${apiUrl}/auth/login`} />
              <FundsCard funds={funds} />
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
               <ControlsCard status={status} apiUrl={apiUrl} mutateStatus={mutateStatus} />
            </div>

            {/* Column 3 (Full Width on Mobile) */}
            <div className="md:col-span-2 lg:col-span-3">
              <PositionsTable positions={positions} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}