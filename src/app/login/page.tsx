import { Suspense } from 'react';
import LoginForm from './login-form';

// A simple loading placeholder
function LoadingSkeleton() {
    return (
        <div className="w-full max-w-md h-[400px] p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700 animate-pulse">
        </div>
    );
}

export default function LoginPage() {
  return (
    <main 
      className="flex items-center justify-center min-h-screen bg-slate-900 text-white"
      style={{
        background: 'radial-gradient(circle, rgba(23,37,64,1) 0%, rgba(10,25,47,1) 100%)'
      }}
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
