import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DriverTopNavigation from "@/driver/components/DriverTopNavigation";
import DriverBottomNavigation from "@/driver/components/DriverBottomNavigation";
import DriverHeroSection from "@/driver/components/DriverHeroSection";
import DriverAgreementForm from "@/driver/components/DriverAgreementForm";
import { MessageSquare, Car, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import driverApiService from "@/services/driverApi";

const DriverHome = () => {
  const navigate = useNavigate();
  const { driver, isLoggedIn, logout, refreshDriverData, updateDriverData } = useDriverAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  // Last numbers are cached so the dashboard renders instantly; fresh ones replace them in the background
  const [dashboardData, setDashboardData] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('driverDashboard') || 'null');
      if (cached) return cached;
    } catch { /* ignore bad cache */ }
    return { activeRequests: 0, totalVehicles: 0, completedRides: 0, totalEarnings: 0 };
  });
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem('driverDashboard'));
  const [error, setError] = useState<string | null>(null);

  // Check if driver has accepted the agreement
  const hasAcceptedAgreement = driver?.agreement?.isAccepted || false;

  const driverId = driver?._id;
  useEffect(() => {
    if (!driverId) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        setError(null);
        // Only the 4 numbers this screen shows (getDashboardSummary made 9 calls)
        const [activeRequests, totalVehicles, completedRides, earnings] = await Promise.all([
          driverApiService.getPendingBookings().then(b => b.length),
          driverApiService.getVehicles().then(v => v.length),
          driverApiService.getCompletedBookingsCount(),
          driverApiService.getEarnings().then(e => e.totalEarnings || 0)
        ]);
        if (!isMounted) return;
        const data = { activeRequests, totalVehicles, completedRides, totalEarnings: earnings };
        setDashboardData(data);
        try { localStorage.setItem('driverDashboard', JSON.stringify(data)); } catch { /* optional cache */ }
      } catch (err) {
        if (!isMounted) return;
        console.error('DriverHome: Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [driverId]);

  useEffect(() => {
    if (isLoggedIn) {
      setTimeout(() => setIsLoaded(true), 50);
    }
  }, [isLoggedIn]);

  const handleAgreementAccepted = async () => {
    updateDriverData({
      agreement: {
        isAccepted: true,
        acceptedAt: new Date().toISOString()
      }
    });
    await refreshDriverData();
  };

  if (!isLoggedIn) {
    return null;
  }

  // Wait until driver data is loaded to avoid blinking the agreement form on refresh
  if (!driver) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Show agreement form if driver hasn't accepted it yet
  if (!hasAcceptedAgreement) {
    return (
      <DriverAgreementForm 
        onAgreementAccepted={handleAgreementAccepted}
        driverName={`${driver.firstName} ${driver.lastName}`}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 pb-24">
      <DriverTopNavigation />

      <div className="px-4 py-3 space-y-4 flex-1">
        {/* Driver Hero Section */}
        <DriverHeroSection />

        {/* Quick Action Navigation Cards */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider px-1">Quick Actions</h3>
          
          <div className="grid grid-cols-1 gap-2.5">
            {/* Active Requests Card */}
            <Card 
              onClick={() => navigate('/driver/requests')}
              className="p-3.5 bg-white hover:bg-blue-50/50 border border-gray-100 rounded-2xl shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Trip Requests</h4>
                    <p className="text-[11px] text-gray-500">
                      {dashboardData.activeRequests > 0 
                        ? `${dashboardData.activeRequests} new trip request(s) waiting`
                        : "Check incoming booking requests"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-lg">
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : dashboardData.activeRequests}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </Card>

            {/* My Vehicles Card */}
            <Card 
              onClick={() => navigate('/driver/myvehicle')}
              className="p-3.5 bg-white hover:bg-emerald-50/50 border border-gray-100 rounded-2xl shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Car className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">My Vehicles</h4>
                    <p className="text-[11px] text-gray-500">Manage fleet details and pricing</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2 py-0.5 rounded-lg">
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : dashboardData.totalVehicles}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-center">
            <p className="text-red-600 text-xs mb-2">{error}</p>
            <Button 
              size="sm"
              onClick={() => window.location.reload()} 
              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      <DriverBottomNavigation />
    </div>
  );
};

export default DriverHome;