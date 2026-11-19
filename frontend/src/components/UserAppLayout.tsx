import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isDriverDevice } from '@/contexts/DriverAuthContext';

interface UserAppLayoutProps {
  children: React.ReactNode;
}

// User pages the driver app links to (DriverFooter, DriverProfile) — everything else is user-only
const SHARED_PATHS = ['/help', '/privacy-policy', '/terms-conditions', '/cancellation-policy', '/refund-policy'];

const UserAppLayout: React.FC<UserAppLayoutProps> = ({ children }) => {
  const { pathname } = useLocation();

  // Driver app never shows user pages ("/", /auth, /bookings, ...), even after driver logout
  // or when the native WebView reloads to the base URL → /driver (→ /driver-auth if logged out)
  if (isDriverDevice() && !SHARED_PATHS.includes(pathname)) {
    return <Navigate to="/driver" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[480px] min-h-[100dvh] bg-white shadow-2xl border-x border-gray-100 flex flex-col relative overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

export default UserAppLayout;
