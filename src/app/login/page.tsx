'use client';

import { useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const searchParams = useSearchParams();
  const authError = searchParams.get('error') === 'auth_failed';

  return (
    <main 
      className="flex items-center justify-center min-h-screen bg-slate-900 text-white"
      style={{
        background: 'radial-gradient(circle, rgba(23,37,64,1) 0%, rgba(10,25,47,1) 100%)'
      }}
    >
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-100">
            Trading Bot
          </h1>
          <p className="mt-3 text-slate-400">
            Please log in to access your dashboard.
          </p>
        </div>

        {authError && (
          <div className="p-3 text-center text-sm text-red-400 bg-red-900/50 rounded-md border border-red-500/50">
            Authentication with Zerodha failed. Please try again.
          </div>
        )}

        <div className="flex flex-col items-center space-y-4">
          {/* ================================================================== */}
          {/* THE FIX IS IN THE <LogIn> COMPONENT'S className BELOW           */}
          {/* ================================================================== */}
          <a
            href={`${apiUrl}/auth/login`}
            className="group flex w-full items-center justify-center gap-3 px-5 py-3 text-center font-medium text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
          >
            <LogIn className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            <span>Login with Zerodha</span>
          </a>
        </div>

        <p className="text-xs text-center text-slate-500">
          You will be securely redirected to Kite by Zerodha to authorize this application.
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
