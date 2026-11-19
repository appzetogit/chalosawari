import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
const Bookings = lazy(() => import("./pages/Bookings"));
const Help = lazy(() => import("./pages/Help"));
const Profile = lazy(() => import("./pages/Profile"));
const VehicleSearch = lazy(() => import("./pages/VehicleSearch"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const CancellationPolicy = lazy(() => import("./pages/CancellationPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));

import NotFound from "./pages/NotFound";
const DriverAuth = lazy(() => import("./driver/pages/DriverAuth"));
const DriverHome = lazy(() => import("./driver/pages/DriverHome"));
const DriverRequests = lazy(() => import("./driver/pages/DriverRequests"));
const DriverMyVehicle = lazy(() => import("./driver/pages/DriverMyVehicle"));
const DriverProfile = lazy(() => import("./driver/pages/DriverProfile"));
const DriverTermsConditions = lazy(() => import("./driver/pages/DriverTermsConditions"));
const DriverPrivacyPolicy = lazy(() => import("./driver/pages/DriverPrivacyPolicy"));
const AdminAuth = lazy(() => import("./admin/pages/AdminAuth"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("./admin/pages/AdminUserManagement"));
const AdminDriverManagement = lazy(() => import("./admin/pages/AdminDriverManagement"));
const AdminVehicleManagement = lazy(() => import("./admin/pages/AdminVehicleManagement"));
const AdminVehicleSettings = lazy(() => import("./admin/pages/AdminVehicleSettings"));

const AdminPaymentManagement = lazy(() => import("./admin/pages/AdminPaymentManagement"));
const AdminNotifications = lazy(() => import("./admin/pages/AdminNotifications"));

const AdminBookingManagement = lazy(() => import("./admin/pages/AdminBookingManagement"));
const AdminEarnings = lazy(() => import("./admin/pages/AdminEarnings"));
const AdminProfile = lazy(() => import("./admin/pages/AdminProfile"));
const AdminOffers = lazy(() => import("./admin/pages/AdminOffers"));
const AdminReviews = lazy(() => import("./admin/pages/AdminReviews"));
const AdminHelpSupport = lazy(() => import("./admin/pages/AdminHelpSupport"));
const AdminPolicyManagement = lazy(() => import("./admin/pages/AdminPolicyManagement"));
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedDriverRoute from "./components/ProtectedDriverRoute";
import ProtectedUserRoute from "./components/ProtectedUserRoute";
import MobileAuthWrapper from "./components/MobileAuthWrapper";
import UserAppLayout from "./components/UserAppLayout";
import DriverAppLayout from "./driver/components/DriverAppLayout";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { DriverAuthProvider } from "./contexts/DriverAuthContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Retry on rate limiting errors
        if (error?.message?.includes('429') || (error as any)?.status === 429) {
          return failureCount < 3;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Global error handler for rate limiting
const GlobalErrorHandler = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (error?.message?.includes('429') || (error as any)?.status === 429) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // After a deploy, an open tab still points at old chunk files (now 404): reload once to get the new build
    const handlePreloadError = (event: Event) => {
      event.preventDefault();
      if (sessionStorage.getItem('chunkReload') !== '1') {
        sessionStorage.setItem('chunkReload', '1');
        window.location.reload();
      }
    };
    window.addEventListener('vite:preloadError', handlePreloadError);
    const clearFlag = setTimeout(() => sessionStorage.removeItem('chunkReload'), 10000);

    // Warm the main screens in the background so the first tap opens them instantly
    const warm = setTimeout(() => {
      const driverSide = localStorage.getItem('appSide') === 'driver' || window.location.pathname.startsWith('/driver');
      if (driverSide) {
        import("./driver/pages/DriverHome");
        import("./driver/pages/DriverRequests");
      } else if (!window.location.pathname.startsWith('/admin')) {
        import("./pages/VehicleSearch");
        import("./pages/Bookings");
        import("./pages/Profile");
      }
    }, 1500);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('vite:preloadError', handlePreloadError);
      clearTimeout(clearFlag);
      clearTimeout(warm);
    };
  }, []);

  return null;
};

// Shown only while a lazily loaded screen downloads (first visit to that screen)
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalErrorHandler />
      <AdminAuthProvider>
        <DriverAuthProvider>
          <UserAuthProvider>
            <BrowserRouter>
              <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<UserAppLayout><MobileAuthWrapper><Index /></MobileAuthWrapper></UserAppLayout>} />
                <Route path="/auth" element={<UserAppLayout><Auth /></UserAppLayout>} />
                <Route path="/bookings" element={<UserAppLayout><ProtectedUserRoute><Bookings /></ProtectedUserRoute></UserAppLayout>} />
                <Route path="/help" element={<UserAppLayout><MobileAuthWrapper><Help /></MobileAuthWrapper></UserAppLayout>} />
                <Route path="/privacy-policy" element={<UserAppLayout><PrivacyPolicy /></UserAppLayout>} />
                <Route path="/terms-conditions" element={<UserAppLayout><TermsConditions /></UserAppLayout>} />
                <Route path="/cancellation-policy" element={<UserAppLayout><CancellationPolicy /></UserAppLayout>} />
                <Route path="/refund-policy" element={<UserAppLayout><RefundPolicy /></UserAppLayout>} />
                <Route path="/profile" element={<UserAppLayout><ProtectedUserRoute><Profile /></ProtectedUserRoute></UserAppLayout>} />
                <Route path="/vehicle-search" element={<UserAppLayout><MobileAuthWrapper><VehicleSearch /></MobileAuthWrapper></UserAppLayout>} />

                {/* User Module Route Aliases */}
                <Route path="/user" element={<Navigate to="/" replace />} />
                <Route path="/user/home" element={<Navigate to="/" replace />} />
                <Route path="/user/auth" element={<Navigate to="/auth" replace />} />
                <Route path="/user/login" element={<Navigate to="/auth" replace />} />
                <Route path="/user/bookings" element={<Navigate to="/bookings" replace />} />
                <Route path="/user/profile" element={<Navigate to="/profile" replace />} />
                <Route path="/user/help" element={<Navigate to="/help" replace />} />
                <Route path="/user/vehicle-search" element={<Navigate to="/vehicle-search" replace />} />
                <Route path="/user/search" element={<Navigate to="/vehicle-search" replace />} />
                <Route path="/user/*" element={<Navigate to="/" replace />} />

                {/* Driver Module Routes */}
                <Route path="/driver-auth" element={<DriverAppLayout><DriverAuth /></DriverAppLayout>} />
                <Route path="/driver/auth" element={<DriverAppLayout><DriverAuth /></DriverAppLayout>} />
                <Route path="/driver/login" element={<DriverAppLayout><DriverAuth /></DriverAppLayout>} />
                <Route path="/driver" element={<DriverAppLayout><ProtectedDriverRoute><DriverHome /></ProtectedDriverRoute></DriverAppLayout>} />
                <Route path="/driver/requests" element={<DriverAppLayout><ProtectedDriverRoute><DriverRequests /></ProtectedDriverRoute></DriverAppLayout>} />
                <Route path="/driver/myvehicle" element={<DriverAppLayout><ProtectedDriverRoute><DriverMyVehicle /></ProtectedDriverRoute></DriverAppLayout>} />
                <Route path="/driver/profile" element={<DriverAppLayout><ProtectedDriverRoute><DriverProfile /></ProtectedDriverRoute></DriverAppLayout>} />
                <Route path="/driver/terms-conditions" element={<DriverAppLayout><DriverTermsConditions /></DriverAppLayout>} />
                <Route path="/driver-terms" element={<DriverAppLayout><DriverTermsConditions /></DriverAppLayout>} />
                <Route path="/driver/privacy-policy" element={<DriverAppLayout><DriverPrivacyPolicy /></DriverAppLayout>} />
                <Route path="/driver-privacy" element={<DriverAppLayout><DriverPrivacyPolicy /></DriverAppLayout>} />

                {/* Admin Module Routes */}
                <Route path="/admin-auth" element={<AdminAuth />} />
                <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
                <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUserManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/drivers" element={<ProtectedAdminRoute><AdminDriverManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/vehicle-settings" element={<ProtectedAdminRoute><AdminVehicleSettings /></ProtectedAdminRoute>} />
                <Route path="/admin/vehicles" element={<ProtectedAdminRoute><AdminVehicleManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/payments" element={<ProtectedAdminRoute><AdminPaymentManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/notifications" element={<ProtectedAdminRoute><AdminNotifications /></ProtectedAdminRoute>} />
                <Route path="/admin/offers" element={<ProtectedAdminRoute><AdminOffers /></ProtectedAdminRoute>} />
                <Route path="/admin/reviews" element={<ProtectedAdminRoute><AdminReviews /></ProtectedAdminRoute>} />
                <Route path="/admin/help" element={<ProtectedAdminRoute><AdminHelpSupport /></ProtectedAdminRoute>} />
                <Route path="/admin/terms" element={<ProtectedAdminRoute><AdminPolicyManagement policyType="terms" /></ProtectedAdminRoute>} />
                <Route path="/admin/driver-terms" element={<ProtectedAdminRoute><AdminPolicyManagement policyType="driver-terms" /></ProtectedAdminRoute>} />
                <Route path="/admin/privacy" element={<ProtectedAdminRoute><AdminPolicyManagement policyType="privacy" /></ProtectedAdminRoute>} />
                <Route path="/admin/driver-privacy" element={<ProtectedAdminRoute><AdminPolicyManagement policyType="driver-privacy" /></ProtectedAdminRoute>} />
                <Route path="/admin/refund" element={<ProtectedAdminRoute><AdminPolicyManagement policyType="refund" /></ProtectedAdminRoute>} />

                <Route path="/admin/bookings" element={<ProtectedAdminRoute><AdminBookingManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/bookings/active" element={<ProtectedAdminRoute><AdminBookingManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/bookings/completed" element={<ProtectedAdminRoute><AdminBookingManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/bookings/cancelled" element={<ProtectedAdminRoute><AdminBookingManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/bookings/analytics" element={<ProtectedAdminRoute><AdminBookingManagement /></ProtectedAdminRoute>} />
                <Route path="/admin/earnings" element={<ProtectedAdminRoute><AdminEarnings /></ProtectedAdminRoute>} />
                <Route path="/admin/profile" element={<ProtectedAdminRoute><AdminProfile /></ProtectedAdminRoute>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </UserAuthProvider>
        </DriverAuthProvider>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
