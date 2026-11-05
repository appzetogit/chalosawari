import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Bookings from "./pages/Bookings";
import Help from "./pages/Help";
import Profile from "./pages/Profile";
import VehicleSearch from "./pages/VehicleSearch";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import CancellationPolicy from "./pages/CancellationPolicy";
import RefundPolicy from "./pages/RefundPolicy";

import NotFound from "./pages/NotFound";
import DriverAuth from "./driver/pages/DriverAuth";
import DriverHome from "./driver/pages/DriverHome";
import DriverRequests from "./driver/pages/DriverRequests";
import DriverMyVehicle from "./driver/pages/DriverMyVehicle";
import DriverProfile from "./driver/pages/DriverProfile";
import DriverTermsConditions from "./driver/pages/DriverTermsConditions";
import DriverPrivacyPolicy from "./driver/pages/DriverPrivacyPolicy";
import AdminAuth from "./admin/pages/AdminAuth";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminUserManagement from "./admin/pages/AdminUserManagement";
import AdminDriverManagement from "./admin/pages/AdminDriverManagement";
import AdminVehicleManagement from "./admin/pages/AdminVehicleManagement";
import AdminVehicleSettings from "./admin/pages/AdminVehicleSettings";

import AdminPaymentManagement from "./admin/pages/AdminPaymentManagement";
import AdminNotifications from "./admin/pages/AdminNotifications";

import AdminBookingManagement from "./admin/pages/AdminBookingManagement";
import AdminEarnings from "./admin/pages/AdminEarnings";
import AdminProfile from "./admin/pages/AdminProfile";
import AdminOffers from "./admin/pages/AdminOffers";
import AdminReviews from "./admin/pages/AdminReviews";
import AdminHelpSupport from "./admin/pages/AdminHelpSupport";
import AdminPolicyManagement from "./admin/pages/AdminPolicyManagement";
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
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  return null;
};

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
            </BrowserRouter>
          </UserAuthProvider>
        </DriverAuthProvider>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
