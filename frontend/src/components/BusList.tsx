import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Star, Users, Calendar, RotateCcw, Sparkles, Navigation, AlertCircle } from 'lucide-react';
import VehicleApiService from '../services/vehicleApi';
import VehicleDetailsModal from './VehicleDetailsModal';
import Checkout from './Checkout';
import { calculateDistance, getPricingDisplay, formatPrice, LocationData } from '../lib/distanceUtils';
import { VehicleFilters } from './FilterSidebar';
import { useUserAuth } from '@/contexts/UserAuthContext';

interface Bus {
  _id: string;
  type: 'bus' | 'car' | 'auto';
  brand: string;
  fuelType: string;
  seatingCapacity: number;
  isAc: boolean;
  isSleeper: boolean;
  amenities: string[];
  images: Array<{
    url: string;
    caption?: string;
    isPrimary: boolean;
  }>;
  registrationNumber: string;
  operatingArea?: {
    cities: string[];
    states: string[];
    radius: number;
  };
  vehicleLocation?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    city?: string;
    state?: string;
    lastUpdated?: string;
  };
  schedule: {
    workingDays: string[];
    workingHours: {
      start: string;
      end: string;
    };
    breakTime?: {
      start: string;
      end: string;
    };
  };
  rating?: number;
  reviewCount?: number;
  totalTrips?: number;
  totalEarnings?: number;
  ratings?: {
    average: number;
    count: number;
    breakdown?: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  statistics?: {
    totalTrips: number;
    totalDistance: number;
    totalEarnings: number;
    averageRating: number;
  };
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  booked: boolean;
  isAvailable: boolean;
  bookingStatus: 'available' | 'booked' | 'in_trip' | 'maintenance' | 'offline';
  driver?: {
    _id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
  };
  pricing: {
    distancePricing: {
      oneWay: {
        '50km': number;
        '100km': number;
        '150km': number;
        '200km': number;
        '250km': number;
        '300km': number;
      };
      return: {
        '50km': number;
        '100km': number;
        '150km': number;
        '200km': number;
        '250km': number;
        '300km': number;
      };
    };
    lastUpdated: string;
  };
  pricingReference: {
    category: string;
    vehicleType: string;
    vehicleModel: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface BusListProps {
  searchParams?: {
    from?: string;
    to?: string;
    fromData?: LocationData;
    toData?: LocationData;
    pickupDate?: string;
    pickupTime?: string;
    serviceType?: string;
    returnDate?: string;
    passengers?: number;
    distanceKm?: number; // road distance from the search page
    platformFee?: number; // admin flat fee, added to the card price so it matches Checkout
  };
  filters?: VehicleFilters;
  onFiltersChange?: (filters: VehicleFilters) => void;
  onVehicleDataUpdate?: (vehicles: any[]) => void;
}

const BusList: React.FC<BusListProps> = ({ searchParams, filters, onFiltersChange, onVehicleDataUpdate }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedBusForCheckout, setSelectedBusForCheckout] = useState<Bus | null>(null);
  const isFetchingRef = useRef(false);

  // Ref to track if we've already fetched data for current params
  const hasFetchedRef = useRef(false);

  // Ref to hold the latest onVehicleDataUpdate callback without causing re-fetches
  const onVehicleDataUpdateRef = useRef(onVehicleDataUpdate);
  useEffect(() => {
    onVehicleDataUpdateRef.current = onVehicleDataUpdate;
  }, [onVehicleDataUpdate]);

  // Initialize vehicle API service with proper parameters
  const vehicleApi = useMemo(() => new VehicleApiService(
    import.meta.env.VITE_API_BASE_URL || '/api',
    () => ({}) // Empty headers for public access
  ), []);

  // Create a stable reference for searchParams to prevent infinite re-renders
  const stableSearchParams = useMemo(() => {
    return {
      from: searchParams?.from,
      to: searchParams?.to,
      fromData: searchParams?.fromData,
      pickupDate: searchParams?.pickupDate,
      returnDate: searchParams?.returnDate,
      serviceType: searchParams?.serviceType,
      passengers: searchParams?.passengers
    };
  }, [
    searchParams?.from,
    searchParams?.to,
    searchParams?.fromData?.lat,
    searchParams?.fromData?.lng,
    searchParams?.pickupDate,
    searchParams?.returnDate,
    searchParams?.serviceType,
    searchParams?.passengers
  ]);

  // Debug: Log when stableSearchParams changes
  useEffect(() => {
    console.log('🔍 BusList: stableSearchParams changed:', stableSearchParams);
    // Reset the fetch flag when params change
    hasFetchedRef.current = false;
  }, [stableSearchParams]);

  // Check for pending booking after authentication
  useEffect(() => {
    if (isAuthenticated) {
      const pendingBooking = localStorage.getItem('pendingBooking');
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);
          if (bookingData.vehicleType === 'bus') {
            // Clear the pending booking
            localStorage.removeItem('pendingBooking');

            // Set the vehicle for checkout
            setSelectedBusForCheckout(bookingData.vehicle);
            setIsCheckoutOpen(true);
          }
        } catch (error) {
          console.error('Error parsing pending booking:', error);
          localStorage.removeItem('pendingBooking');
        }
      }
    }
  }, [isAuthenticated]);

  const fetchBuses = useCallback(async (isBackground = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('🔍 Already fetching buses, skipping...');
      return;
    }

    isFetchingRef.current = true;

    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);

      console.log('🔍 Starting to fetch buses...');
      console.log('🔍 Search params:', stableSearchParams);

      // Extract dates and location from stableSearchParams
      const { pickupDate, returnDate, serviceType, fromData } = stableSearchParams || {};

      let response;

      // If we have location coordinates, try location-based filtering first
      if (fromData && fromData.lat && fromData.lng) {
        console.log('🔍 Using location-based filtering with coordinates:', fromData.lat, fromData.lng);
        try {
          response = await vehicleApi.getVehiclesByLocation({
            latitude: fromData.lat,
            longitude: fromData.lng,
            vehicleType: 'bus',
            passengers: stableSearchParams?.passengers || 1,
            date: pickupDate,
            returnDate: returnDate
          });
        } catch (apiError) {
          console.warn('⚠️ Location search failed, falling back to all buses:', apiError);
        }
      }

      // Extract vehicles array from response
      let vehicles: any[] = [];
      if (response && response.success) {
        if (Array.isArray(response.data)) {
          vehicles = response.data;
        } else if (response.data && typeof response.data === 'object' && 'docs' in response.data) {
          vehicles = response.data.docs;
        }
      }

      // Only fallback to all buses when location search was not possible/failed; otherwise show only nearby buses
      if (!response?.success) {
        console.log('🔍 Fallback: Fetching all buses via getVehicleBus...');
        const fallbackRes = pickupDate
          ? await vehicleApi.getVehicleBusWithDate(pickupDate, returnDate)
          : await vehicleApi.getVehicleBus();

        if (fallbackRes.success) {
          if (Array.isArray(fallbackRes.data)) {
            vehicles = fallbackRes.data;
          } else if (fallbackRes.data && typeof fallbackRes.data === 'object' && 'docs' in fallbackRes.data) {
            vehicles = fallbackRes.data.docs;
          }
        }
      }

      // Filter active and approved/available buses and cast to Bus type
      const approvedBuses = vehicles.filter((bus: any) => {
        const isApproved = bus.approvalStatus === 'approved' || bus.approvalStatus === 'pending' || bus.isApproved === true || !bus.approvalStatus;
        const isActive = bus.isActive !== false;
        return isApproved && isActive;
      }) as Bus[];

      // Populate pricing data for any buses that might not have it
      const busesWithPricing = await vehicleApi.populateVehiclePricing(approvedBuses);

      setBuses(busesWithPricing);

      // Update parent component with vehicle data for filters
      onVehicleDataUpdateRef.current?.(busesWithPricing);

      console.log(`✅ Loaded ${busesWithPricing.length} buses with pricing`);
    } catch (err) {
      if (!isBackground) {
        setError('Error loading buses');
      }
      console.error('❌ Error in fetchBuses:', err);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [stableSearchParams, vehicleApi]);

  // Fetch buses on mount or when search parameters change
  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  // Refresh pricing data periodically to ensure real-time updates (paused while checkout or modal is open)
  useEffect(() => {
    if (buses.length > 0 && !isCheckoutOpen && !isModalOpen) {
      const refreshInterval = setInterval(() => {
        if (!isCheckoutOpen && !isModalOpen) {
          console.log('🔄 Refreshing pricing data for real-time updates silently...');
          fetchBuses(true);
        }
      }, 60000); // Refresh every 60 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [buses.length, isCheckoutOpen, isModalOpen, fetchBuses]);

  // Apply filters to buses
  const filteredBuses = useMemo(() => {
    if (!filters) return buses;

    return buses.filter(bus => {
      // Seating capacity filter
      if (filters.seatingCapacity.length > 0 && !filters.seatingCapacity.includes(bus.seatingCapacity)) {
        return false;
      }

      // AC filter
      if (filters.isAc.length > 0) {
        const busAcType = bus.isAc ? 'AC' : 'Non-AC';
        if (!filters.isAc.includes(busAcType)) {
          return false;
        }
      }

      // Sleeper filter
      if (filters.isSleeper.length > 0) {
        const busSleeperType = bus.isSleeper ? 'Sleeper' : 'Seater';
        if (!filters.isSleeper.includes(busSleeperType)) {
          return false;
        }
      }

      // Fuel type filter
      if (filters.fuelType.length > 0 && !filters.fuelType.includes(bus.fuelType)) {
        return false;
      }



      // Bus brand filter
      if (filters.busBrand.length > 0 && !filters.busBrand.includes(bus.brand)) {
        return false;
      }

      // Bus model filter
      if (filters.busModel.length > 0 && !filters.busModel.includes(bus.pricingReference?.vehicleModel || '')) {
        return false;
      }

      // Price range filter (basic implementation)
      if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) {
        // Get base price for comparison
        let basePrice = 0;
        if (bus.pricing?.distancePricing?.oneWay?.['50km']) {
          basePrice = bus.pricing.distancePricing.oneWay['50km'];
        }

        if (basePrice < filters.priceRange.min || basePrice > filters.priceRange.max) {
          return false;
        }
      }

      return true;
    });
  }, [buses, filters]);

  // Sort filtered buses
  const sortedBuses = useMemo(() => {
    if (!filters?.sortBy) return filteredBuses;

    const sorted = [...filteredBuses];

    switch (filters.sortBy) {
      case 'price-low':
        sorted.sort((a, b) => {
          const priceA = a.pricing?.distancePricing?.oneWay?.['50km'] || 0;
          const priceB = b.pricing?.distancePricing?.oneWay?.['50km'] || 0;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        sorted.sort((a, b) => {
          const priceA = a.pricing?.distancePricing?.oneWay?.['50km'] || 0;
          const priceB = b.pricing?.distancePricing?.oneWay?.['50km'] || 0;
          return priceB - priceA;
        });
        break;
      case 'rating-high':
        sorted.sort((a, b) => {
          const ratingA = a.ratings?.average ?? a.statistics?.averageRating ?? a.rating ?? a.driver?.rating ?? 0;
          const ratingB = b.ratings?.average ?? b.statistics?.averageRating ?? b.rating ?? b.driver?.rating ?? 0;
          return ratingB - ratingA;
        });
        break;
      case 'seating-low':
        sorted.sort((a, b) => a.seatingCapacity - b.seatingCapacity);
        break;
      case 'seating-high':
        sorted.sort((a, b) => b.seatingCapacity - a.seatingCapacity);
        break;
    }

    return sorted;
  }, [filteredBuses, filters?.sortBy]);

  // Helper function to get total active filters
  const getTotalActiveFilters = (filters?: VehicleFilters) => {
    if (!filters) return 0;

    let count = 0;
    if (filters.seatingCapacity?.length > 0) count++;
    if (filters.isAc?.length > 0) count++;
    if (filters.isSleeper?.length > 0) count++;
    if (filters.fuelType?.length > 0) count++;
    if (filters.busBrand?.length > 0) count++;
    if (filters.busModel?.length > 0) count++;
    if (filters.sortBy) count++;
    return count;
  };

  const handleViewDetails = (bus: Bus) => {
    setSelectedBus(bus);
    setIsModalOpen(true);
  };

  const handleBookNow = (bus: Bus) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store the selected bus and search params for after login
      localStorage.setItem('pendingBooking', JSON.stringify({
        vehicle: bus,
        searchParams: searchParams,
        vehicleType: 'bus'
      }));

      // Redirect to login page with current location as return URL
      navigate('/auth', {
        state: {
          returnUrl: window.location.pathname + window.location.search
        }
      });
      return;
    }

    // User is authenticated, proceed with booking
    setSelectedBusForCheckout(bus);
    setIsCheckoutOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBus(null);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setSelectedBusForCheckout(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-gray-700">Finding best buses near you...</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Searching verified fleet</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="text-gray-900 font-bold text-sm mb-1">{error}</div>
        <p className="text-xs text-gray-500 mb-4">Please check your connection or try again.</p>
        <button
          onClick={() => fetchBuses()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try Again
        </button>
      </div>
    );
  }

  if (buses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 text-center space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Bus className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900">No Buses Available</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            {searchParams?.fromData
              ? `No buses available for that of your pickup location.`
              : `No approved and active buses currently available matching criteria.`}
          </p>
        </div>
      </div>
    );
  }

  // If buses exist but all filtered out
  if (sortedBuses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Bus className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">No Buses Match Your Filters</h3>
          <p className="text-xs text-gray-500 mt-1">
            Try relaxing or clearing some filters to see all {buses.length} available buses.
          </p>
        </div>
        {onFiltersChange && (
          <button
            onClick={() => onFiltersChange({
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
            })}
            className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Summary Strip */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500 font-medium">
        <span>
          <strong className="text-gray-900">{sortedBuses.length}</strong> {sortedBuses.length === 1 ? 'bus' : 'buses'} available
          {filters && getTotalActiveFilters(filters) > 0 && ` (filtered from ${buses.length})`}
        </span>
        {filters && getTotalActiveFilters(filters) > 0 && (
          <span className="text-blue-600 font-semibold">{getTotalActiveFilters(filters)} filter(s) active</span>
        )}
      </div>

      {/* Buses List */}
      <div className="space-y-3">
        {sortedBuses.map((bus) => (
          <BusCard key={bus._id} bus={bus} searchParams={searchParams} onViewDetails={handleViewDetails} onBookNow={handleBookNow} />
        ))}
      </div>

      {/* Bus Details Modal */}
      <VehicleDetailsModal
        vehicle={selectedBus}
        isOpen={isModalOpen}
        onClose={closeModal}
        onBookNow={handleBookNow}
      />

      {/* Checkout Modal */}
      <Checkout
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
        vehicle={selectedBusForCheckout}
        bookingData={searchParams}
      />
    </div>
  );
};

interface BusCardProps {
  bus: Bus;
  searchParams?: {
    from?: string;
    to?: string;
    fromData?: LocationData;
    toData?: LocationData;
    pickupDate?: string;
    pickupTime?: string;
    serviceType?: string;
    returnDate?: string;
    passengers?: number;
    distanceKm?: number; // road distance from the search page
    platformFee?: number; // admin flat fee, added to the card price so it matches Checkout
  };
  onViewDetails: (bus: Bus) => void;
  onBookNow: (bus: Bus) => void;
}

const BusCard: React.FC<BusCardProps> = ({ bus, searchParams, onViewDetails, onBookNow }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => setIsImageLoading(false);
  const handleImageError = () => {
    setIsImageLoading(false);
    setImageError(true);
  };

  const getAmenitiesText = () => {
    const amenities = [];
    if (bus.isAc) amenities.push('AC');
    if (bus.isSleeper) amenities.push('Sleeper');
    if (bus.amenities && bus.amenities.length > 0) amenities.push(...bus.amenities);
    return amenities.slice(0, 3).join(' • ');
  };

  // Get primary image or fallback
  const getPrimaryImage = () => {
    if (bus.images && bus.images.length > 0) {
      const primaryImage = bus.images.find(img => img.isPrimary) || bus.images[0];
      return primaryImage.url;
    }
    return null;
  };

  const primaryImage = getPrimaryImage();

  const getPriceDisplay = () => {
    if (!bus.pricing) {
      return (
        <div className="text-lg text-red-600 font-medium">
          Pricing Unavailable
        </div>
      );
    }

    // For bus vehicles, show distance-based pricing
    if (bus.pricing.distancePricing) {
      // Determine trip type - handle both "oneWay" and "one-way" formats
      let tripType = 'one-way';
      if (searchParams?.serviceType === 'roundTrip') {
        tripType = 'return';
      } else if (searchParams?.serviceType === 'oneWay') {
        tripType = 'one-way';
      }

      // Try multiple possible trip type keys
      let pricing = bus.pricing.distancePricing[tripType];
      if (!pricing) {
        // Fallback to other possible keys
        pricing = bus.pricing.distancePricing['oneWay'] ||
          bus.pricing.distancePricing['one-way'] ||
          bus.pricing.distancePricing['oneway'] ||
          bus.pricing.distancePricing['return'] ||
          Object.values(bus.pricing.distancePricing)[0]; // Use first available
      }

      if (!pricing) {
        return (
          <div className="text-lg text-red-600 font-medium">
            Pricing not available for {tripType} trip
          </div>
        );
      }

      // Check if we have search parameters to calculate distance
      if (searchParams?.fromData && searchParams?.toData) {
        const distance = searchParams.distanceKm || calculateDistance(searchParams.fromData, searchParams.toData);

        // Find the best available rate per km
        let ratePerKm = 0;
        let rateLabel = '';

        // Try to find the appropriate rate based on distance using new 6-tier structure
        if (distance <= 50 && pricing['50km']) {
          ratePerKm = pricing['50km'];
          rateLabel = '50km rate';
        } else if (distance <= 100 && pricing['100km']) {
          ratePerKm = pricing['100km'];
          rateLabel = '100km rate';
        } else if (distance <= 150 && pricing['150km']) {
          ratePerKm = pricing['150km'];
          rateLabel = '150km rate';
        } else if (distance <= 200 && pricing['200km']) {
          ratePerKm = pricing['200km'];
          rateLabel = '200km rate';
        } else if (distance <= 250 && pricing['250km']) {
          ratePerKm = pricing['250km'];
          rateLabel = '250km rate';
        } else if (pricing['300km']) {
          ratePerKm = pricing['300km'];
          rateLabel = '300km rate';
        } else if (pricing['250km']) {
          ratePerKm = pricing['250km'];
          rateLabel = '250km rate';
        } else if (pricing['200km']) {
          ratePerKm = pricing['200km'];
          rateLabel = '200km rate';
        } else if (pricing['150km']) {
          ratePerKm = pricing['150km'];
          rateLabel = '150km rate';
        } else if (pricing['100km']) {
          ratePerKm = pricing['100km'];
          rateLabel = '100km rate';
        } else if (pricing['50km']) {
          ratePerKm = pricing['50km'];
          rateLabel = '50km rate';
        }

        if (ratePerKm > 0) {
          // Calculate total price: distance × 2 × rate per km (both ways / aane aur jane dono ka)
          const totalPrice = Math.round(ratePerKm * distance * 2) + (searchParams.platformFee || 0); // same total as Checkout (fare + platform fee)

          return (
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-gray-900">
                ₹{totalPrice.toLocaleString()}
              </span>
            </div>
          );
        }
      } else {
        // Missing coordinates - show helpful message
        return (
          <div className="text-xs text-amber-600 font-medium">
            Select route to calculate fare
          </div>
        );
      }

      // Fallback: show best available rate per km
      let bestRate = 0;
      let rateLabel = 'Base rate';

      if (pricing['50km']) {
        bestRate = pricing['50km'];
        rateLabel = '50km rate';
      } else if (pricing['100km']) {
        bestRate = pricing['100km'];
        rateLabel = '100km rate';
      } else if (pricing['150km']) {
        bestRate = pricing['150km'];
        rateLabel = '150km rate';
      }

      if (bestRate > 0) {
        return (
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold text-gray-900">
              ₹{bestRate.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 font-normal">
              {rateLabel} / km
            </span>
          </div>
        );
      }
    }

    return (
      <div className="text-xs text-red-500 font-medium">
        Price Unavailable
      </div>
    );
  };

  const formatPrice = (price: number) => {
    // Round to whole rupees (no decimal places) and format
    const roundedPrice = Math.round(price);
    return `₹${roundedPrice.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getWorkingDaysText = (days: string[]) => {
    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Weekdays';
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
  };

  return (
    <div
      onClick={() => onViewDetails(bus)}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-3 sm:p-4 group cursor-pointer hover:border-blue-200"
    >
      <div className="flex flex-row items-center gap-3 sm:gap-4">
        {/* Left Side: Vehicle Image */}
        <div className="relative w-28 sm:w-36 md:w-44 h-24 sm:h-28 md:h-32 bg-gray-50/80 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center p-1.5 border border-gray-100">
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70 z-10">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!imageError && primaryImage ? (
            <img
              src={primaryImage}
              alt={`${bus.brand} bus`}
              className={`w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 ${isImageLoading ? 'opacity-0' : 'opacity-100'
                }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Bus className="h-10 w-10 text-gray-300 mb-1" />
              <span className="text-[10px] text-gray-400 text-center">No Image</span>
            </div>
          )}
        </div>

        {/* Right Side: Details & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          {/* Header Row: Title & Status */}
          <div>
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {(() => {
                  const brand = bus.brand?.trim() || '';
                  const model = bus.pricingReference?.vehicleModel?.trim() || '';
                  if (!model) return brand;
                  if (!brand) return model;
                  if (brand.toLowerCase() === model.toLowerCase() || brand.toLowerCase().includes(model.toLowerCase())) {
                    return brand;
                  }
                  if (model.toLowerCase().includes(brand.toLowerCase())) {
                    return model;
                  }
                  return `${brand} ${model}`;
                })()}
              </h3>
              <span className="bg-emerald-500 text-white text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs flex-shrink-0">
                Available
              </span>
            </div>

            {/* Price Row */}
            <div className="mt-0.5">
              {getPriceDisplay()}
            </div>

            {/* Rating Row */}
            {(() => {
              const ratingValue = bus.ratings?.average ?? bus.statistics?.averageRating ?? bus.rating ?? bus.driver?.rating ?? 0;
              const reviewCount = bus.ratings?.count ?? bus.reviewCount ?? 0;
              const tripsCount = bus.statistics?.totalTrips ?? bus.totalTrips ?? 0;

              return (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                  <span className="flex items-center text-amber-500 font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                    {ratingValue > 0 ? ratingValue.toFixed(1) : 'New'}
                  </span>
                  <span className="text-gray-400 text-[11px]">•</span>
                  <span className="text-gray-500 text-[11px]">
                    {reviewCount > 0
                      ? `(${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`
                      : tripsCount > 0
                        ? `(${tripsCount} ${tripsCount === 1 ? 'trip' : 'trips'})`
                        : '(No reviews yet)'}
                  </span>
                </div>
              );
            })()}

            {/* Badges / Specs */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="bg-gray-100 text-gray-700 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-medium">
                {bus.isAc ? 'AC' : 'Non-AC'}
              </span>
              {bus.isSleeper && (
                <span className="bg-blue-50 text-blue-700 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-medium">
                  Sleeper
                </span>
              )}
              <span className="bg-gray-100 text-gray-700 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-medium capitalize">
                {bus.fuelType}
              </span>
              <span className="bg-gray-100 text-gray-700 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-medium">
                {bus.seatingCapacity} Seater
              </span>
            </div>

            {/* Location (single line) */}
            {bus.vehicleLocation?.address && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{bus.vehicleLocation.address}</span>
              </div>
            )}
          </div>

          {/* Bottom Actions Row */}
          <div className="mt-2 pt-1.5 border-t border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookNow(bus);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-xl transition-all shadow-sm hover:shadow text-center"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusList;

