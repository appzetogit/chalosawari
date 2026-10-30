import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Edit3, Route } from 'lucide-react';
import { calculateDistance } from '../lib/distanceUtils';
import TopNavigation from '../components/TopNavigation';
import UserBottomNavigation from '../components/UserBottomNavigation';
import BusList from '../components/BusList';
import CarList from '../components/CarList';
import FilterSidebar from '../components/FilterSidebar';
import { VehicleFilters } from '../components/FilterSidebar';
import CarBar from '../assets/CarBar.png';
import BusBar from '../assets/BusBar.png';

// 'YYYY-MM-DD' (or any parseable date) -> DD/MM/YYYY
const formatDate = (value: string) => {
  const parts = value.split('-');
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// 'HH:MM' (24h) -> 'h:MM AM/PM'
const formatTime = (value: string) => {
  if (value.includes('AM') || value.includes('PM')) return value;
  const [hours, minutes] = value.split(':');
  if (!hours) return value;
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes || '00'} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const VihicleSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get search parameters from previous page / hero section
  const routeState = location.state || {};
  const { from, to, pickupDate, pickupTime, fromData, toData } = routeState;

  // Road distance from Google (same one the backend charges on); straight-line until it arrives or if Google can't route
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  useEffect(() => {
    if (!fromData?.lat || !toData?.lat) return;
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    const qs = new URLSearchParams({
      fromLat: String(fromData.lat), fromLng: String(fromData.lng),
      toLat: String(toData.lat), toLng: String(toData.lng)
    });
    fetch(`${base}/config/distance?${qs}`)
      .then(res => res.json())
      .then(data => setRoadDistance(typeof data.distanceKm === 'number' ? data.distanceKm : null))
      .catch(() => setRoadDistance(null));
  }, [fromData?.lat, fromData?.lng, toData?.lat, toData?.lng]);

  const tripDistance = roadDistance ?? (fromData && toData ? calculateDistance(fromData, toData) : 0);
  // Lists and Checkout read distanceKm from here so the fare matches the km shown
  const searchParams = useMemo(
    () => (roadDistance ? { ...routeState, distanceKm: roadDistance } : routeState),
    [routeState, roadDistance]
  );

  // Determine initial selected type (default to car if user searched for car or default to car/bus)
  const [selectedType, setSelectedType] = useState<'bus' | 'car'>('car');
  
  const [filters, setFilters] = useState<VehicleFilters>({
    priceRange: { min: 0, max: 10000 },
    seatingCapacity: [],
    isAc: [],
    isSleeper: [],
    fuelType: [],
    carBrand: [],
    carModel: [],
    busBrand: [],
    busModel: [],
    sortBy: ''
  });
  
  // State to store vehicle data for filters
  const [vehicleData, setVehicleData] = useState<any[]>([]);

  const handleLogoClick = useCallback((type: 'bus' | 'car') => {
    setSelectedType(type);
    // Reset filters when switching vehicle types
    setFilters({
      priceRange: { min: 0, max: 10000 },
      seatingCapacity: [],
      isAc: [],
      isSleeper: [],
      fuelType: [],
      carBrand: [],
      carModel: [],
      busBrand: [],
      busModel: [],
      sortBy: ''
    });
    setVehicleData([]);
  }, []);

  const handleFiltersChange = useCallback((newFilters: VehicleFilters) => {
    setFilters(newFilters);
  }, []);

  const handleVehicleDataUpdate = useCallback((vehicles: any[]) => {
    setVehicleData(vehicles);
  }, []);

  const renderList = () => {
    const commonProps = {
      searchParams,
      filters,
      onFiltersChange: handleFiltersChange,
      onVehicleDataUpdate: handleVehicleDataUpdate
    };

    switch (selectedType) {
      case 'car':
        return <CarList {...commonProps} />;
      case 'bus':
      default:
        return <BusList {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Navigation */}
      <TopNavigation />
      
      {/* Car / Bus switch */}
      <div className="px-3 sm:px-4 pt-3">
        <div className="bg-white rounded-2xl p-1.5 border border-gray-200 shadow-xs grid grid-cols-2 gap-1.5">
          {(['car', 'bus'] as const).map((type) => {
            const active = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleLogoClick(type)}
                className={`flex items-center justify-center gap-2.5 h-12 rounded-xl transition-all ${active
                  ? 'bg-blue-50 ring-1 ring-blue-500 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <img src={type === 'car' ? CarBar : BusBar} alt="" className="h-7 w-auto object-contain" />
                <span className="text-sm font-semibold">{type === 'car' ? 'Car' : 'Bus'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3 sm:px-4 py-3 pb-24 space-y-3">
        {/* Route summary */}
        {from && to ? (
          <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs">
            <div className="flex items-start gap-3">
              {/* Pickup → drop markers */}
              <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="w-px h-6 bg-gray-300 my-1" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{from}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{to}</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="p-2 -mr-1 -mt-1 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex-shrink-0"
                title="Edit Route"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-3 min-w-0">
                {pickupDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(pickupDate)}
                  </span>
                )}
                {pickupTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {formatTime(pickupTime)}
                  </span>
                )}
              </div>
              {tripDistance > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold flex-shrink-0">
                  <Route className="w-3.5 h-3.5" />
                  {Math.round(tripDistance * 10) / 10} km
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* Quick Filter Pill Strip */}
        <FilterSidebar 
          selectedType={selectedType}
          onFiltersChange={handleFiltersChange}
          filters={filters}
          vehicles={vehicleData}
        />

        {/* Vehicle List or Empty State */}
        <div>
          {renderList()}
        </div>
      </div>

      {/* Bottom Nav */}
      <UserBottomNavigation />
    </div>
  );
};

export default VihicleSearch;