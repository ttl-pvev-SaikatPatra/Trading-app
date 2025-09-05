// File: src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import StatusCard from './components/StatusCard';
import FundsCard from './components/FundsCard';
import ControlsCard from './components/ControlsCard';
import PositionsTable from './components/PositionsTable';
import Watchlist from './components/Watchlist';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { broker_connected: false };
    }
    const error = new Error('An error occurred while fetching the data.');
    console.error(res.statusText);
    throw error;
  }
  return res.json();
});

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  const { data: status, mutate: mutateStatus } = useSWR(`${apiUrl}/api/status`, fetcher, { refreshInterval: 5000 });
  const { data: funds } = useSWR(status?.broker_connected ? `${apiUrl}/api/funds` : null, fetcher, { refreshInterval: 10000 });
  const { data: positions } = useSWR(status?.broker_connected ? `${apiUrl}/api/positions` : null, fetcher, { refreshInterval: 5000 });
  // Get the mutate function for the universe data
  const { data: universe, mutate: mutateUniverse } = useSWR(status?.broker_connected ? `${apiUrl}/api/universe` : null, fetcher, { refreshInterval: 60000 });

  useEffect(() => {
    if (status && !status.broker_connected) {
      router.push('/login');
    }
  }, [status, router]);
  
  if (!status) {
    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 items-center justify-center">
            <p>Loading and verifying session...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      <aside className="w-72 bg-white p-4 overflow-y-auto border-r border-gray-200">
        <h2 className="text-xl font-bold mb-4">Universe</h2>
        <Watchlist universe={universe} apiUrl={apiUrl} />
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Delayed data from free sources. Not for live trading decisions.</p>
        </header>

        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatusCard status={status} loginUrl={`${apiUrl}/auth/login`} />
              <FundsCard funds={funds} />
              {/* Pass the mutateUniverse function to the ControlsCard */}
              <ControlsCard status={status} apiUrl={apiUrl} mutateStatus={mutateStatus} mutateUniverse={mutateUniverse} />
            </div>
            <div>
              <PositionsTable positions={positions} />
            </div>
        </div>
      </main>
    </div>
  );
}
