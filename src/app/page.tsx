// src/app/page.tsx
import { Suspense } from 'react';
import LoginStatus from './auth-status';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <p className="ml-4 text-gray-700">Loading...</p>
      </div>
    }>
      <LoginStatus />
    </Suspense>
  );
}