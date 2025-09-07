"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Spinner, Alert, Button } from 'flowbite-react';
import { FaPlay } from 'react-icons/fa';

export default function Home() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false); // New state to check for client-side render

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    // This effect runs only once, on the client
    setIsClient(true);
    
    // Check for login status from URL parameters
    const loginStatus = searchParams.get('login_status');
    const userIdParam = searchParams.get('user_id');
    const errorMessage = searchParams.get('error');

    if (loginStatus === 'success' && userIdParam) {
      setIsLoggedIn(true);
      setUserId(userIdParam);
      setError(null);
    } else if (loginStatus === 'failed') {
      setError(errorMessage || 'Authentication failed. Please try again.');
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(false);
    }

    setLoading(false);
  }, [searchParams]);

  const handleLogin = () => {
    window.location.href = `${backendUrl}/auth/login`;
  };

  // Render a loading spinner on the server and initial client-side render
  if (!isClient || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="xl" />
        <p className="ml-4 text-gray-700">Loading...</p>
      </div>
    );
  }

  // --- Dashboard View ---
  if (isLoggedIn) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900">Trading Bot Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connected as User ID: <span className="font-semibold">{userId}</span>
          <span className="ml-2 px-2 py-0.5 text-xs font-medium text-white bg-green-500 rounded-full">
            Active
          </span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <Card>
            <h5 className="text-2xl font-bold tracking-tight text-gray-900">Funds</h5>
            <p className="font-normal text-gray-700">Displaying your available funds.</p>
          </Card>
          <Card>
            <h5 className="text-2xl font-bold tracking-tight text-gray-900">Live Trades</h5>
            <p className="font-normal text-gray-700">Shows current and past trades.</p>
          </Card>
          <Card>
            <h5 className="text-2xl font-bold tracking-tight text-gray-900">Universe</h5>
            <p className="font-normal text-gray-700">Shows today&apos;s selected universe.</p>
          </Card>
        </div>
      </div>
    );
  }

  // --- Login View ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md w-full text-center">
        <h5 className="text-2xl font-bold tracking-tight text-gray-900">
          Intraday Trading Bot
        </h5>
        <p className="font-normal text-gray-700">
          Automate your Indian equity trades with a free, reliable bot.
        </p>
        <Button onClick={handleLogin} color="success">
          <FaPlay className="mr-2" /> Login with Zerodha
        </Button>
        {error && (
          <Alert color="failure" className="mt-4">
            <span>
              <span className="font-medium">Error:</span> {error}
            </span>
          </Alert>
        )}
      </Card>
    </div>
  );
}