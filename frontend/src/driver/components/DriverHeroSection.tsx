import { Card } from "@/components/ui/card";
import {
  Car,
  TrendingUp,
  Star,
  Users,
  Loader2,
  Download
} from "lucide-react";
import { useState, useEffect } from "react";
import driverApiService from "@/services/driverApi";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import { Button } from "@/components/ui/button";

// Custom hook for counting animation
const useCountAnimation = (end: number, duration: number = 1500, delay: number = 0) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const timer = setTimeout(() => {
      const startTime = Date.now();
      const startValue = 0;

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart);

        setCount(currentValue);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration, delay]);

  return count;
};

// Custom hook for decimal counting animation (for ratings)
const useDecimalCountAnimation = (end: number, duration: number = 1500, delay: number = 0) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const timer = setTimeout(() => {
      const startTime = Date.now();
      const startValue = 0;

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (end - startValue) * easeOutQuart;

        setCount(Number(currentValue.toFixed(1)));

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration, delay]);

  return count;
};

const DriverHeroSection = () => {
  const { driver } = useDriverAuth();
  const [dashboardData, setDashboardData] = useState({
    activeVehicles: 0,
    todayEarnings: 0,
    averageRating: 0,
    happyCustomers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchDashboardData = async () => {
      try {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);

        const summary = await driverApiService.getDashboardSummary();

        if (!isMounted) return;
        setDashboardData({
          activeVehicles: summary.activeVehicles || summary.totalVehicles || 0,
          todayEarnings: summary.cashCollected || 0, // total cash collected from passengers
          averageRating: summary.averageRating || driver?.rating || 0,
          happyCustomers: summary.happyCustomers || summary.completedRides || 0
        });
      } catch (err) {
        if (!isMounted) return;
        console.error('DriverHeroSection: Error fetching dashboard data:', err);
        setDashboardData({
          activeVehicles: 0,
          todayEarnings: 0,
          averageRating: driver?.rating || 0,
          happyCustomers: 0
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (driver) {
      timeoutId = setTimeout(fetchDashboardData, 300);
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [driver]);

  const activeVehiclesCount = useCountAnimation(dashboardData.activeVehicles, 1000, 300);
  const todaysEarnings = useCountAnimation(dashboardData.todayEarnings, 1200, 400);
  const ratingCount = useDecimalCountAnimation(dashboardData.averageRating, 1000, 500);
  const happyCustomersCount = useCountAnimation(dashboardData.happyCustomers, 1400, 600);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 my-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xs">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-16 animate-pulse" />
            </div>
            <div className="h-6 bg-gray-100 rounded w-12 animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 my-3">
      {/* Driver Partner Overview Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">Driver Dashboard</span>
              <h2 className="text-lg font-bold text-white leading-tight">
                {driver ? `${driver.firstName} ${driver.lastName}` : "Partner"}
              </h2>
            </div>

          </div>
          <p className="text-xs text-blue-100 mt-1">Manage your active fleet and trips in real-time</p>
        </div>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 2x2 Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-blue-200 transition-colors">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500 truncate">Total Vehicles</p>
              <h3 className="text-base font-bold text-gray-900">{activeVehiclesCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500 truncate">Total Earnings</p>
              <h3 className="text-base font-bold text-gray-900">₹{todaysEarnings.toLocaleString()}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500 truncate">Rating</p>
              <h3 className="text-base font-bold text-gray-900">
                {ratingCount > 0 ? ratingCount.toFixed(1) : "New"}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-purple-200 transition-colors">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500 truncate">Completed Rides</p>
              <h3 className="text-base font-bold text-gray-900">{happyCustomersCount}</h3>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DriverHeroSection;