import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, Users, Car, CreditCard, Wallet, Smartphone, Shield, CheckCircle, Tag, ChevronRight, Check, Percent, Bus, Loader2, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BookingApiService from '@/services/bookingApi';
import RazorpayService from '@/services/razorpayService';
import { calculateDistance, calculateVehicleFare, formatPrice, LocationData } from '@/lib/distanceUtils';
import { validateDateFormat, validateTimeFormat, getDefaultDate } from "@/lib/utils";
import { toast } from '@/hooks/use-toast';
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useNavigate } from 'react-router-dom';
import vehicleSettingService from "@/services/vehicleSettingApi";
import { offerApi, couponDiscountFor, type AppliedCoupon, type Offer } from "@/services/offerApi";

// Calculate potential discount for an offer based on booking amount
const calculatePotentialDiscount = (offer: Offer, amount: number) => {
  if (offer.minBookingAmount && amount < offer.minBookingAmount) return 0;
  const val = Number(offer.discountValue) || 0;
  let disc = offer.discountType === 'percent'
    ? Math.round((amount * val) / 100)
    : val;
  if (offer.discountType === 'percent' && Number(offer.maxDiscount) > 0) {
    disc = Math.min(disc, Number(offer.maxDiscount));
  }
  return Math.min(disc, amount);
};

interface Vehicle {
  _id: string;
  type: 'bus' | 'car' | 'auto';
  brand: string;
  model?: string;
  fuelType: string;
  seatingCapacity: number;
  isAc: boolean;
  isSleeper?: boolean;
  amenities: string[];
  images: Array<{
    url: string;
    caption?: string;
    isPrimary: boolean;
  }>;
  registrationNumber?: string;
  operatingArea?: {
    cities: string[];
    states: string[];
    radius: number;
  };
  schedule?: {
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
  totalTrips?: number;
  totalEarnings?: number;
  isActive?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  booked?: boolean;
  driver?: {
    _id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
  };
  pricing: {
    distancePricing?: {
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
    lastUpdated?: string;
  };
  pricingReference: {
    category: string;
    vehicleType: string;
    vehicleModel: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  bookingData: {
    from?: string;
    to?: string;
    fromData?: LocationData | null;
    toData?: LocationData | null;
    pickupDate?: string;
    pickupTime?: string;
    serviceType?: string;
    returnDate?: string;
    distanceKm?: number; // road distance from the search page
  };
}

const Checkout: React.FC<CheckoutProps> = ({ isOpen, onClose, vehicle, bookingData }) => {
  // Only full online payment is offered at checkout
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'razorpay'>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, isAuthenticated } = useUserAuth();
  const navigate = useNavigate();
  const [platformFee, setPlatformFee] = useState(0);
  const [advancePercentage, setAdvancePercentage] = useState(20);
  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  const loadAvailableOffers = async () => {
    setIsLoadingOffers(true);
    try {
      const res = await offerApi.getActiveOffers();
      if (res.success && Array.isArray(res.data)) {
        const vCategory = (vehicle?.pricingReference?.category || vehicle?.type || '').toLowerCase();
        const filtered = (res.data as Offer[]).filter(o => {
          const vt = (o.vehicleType || 'all').toLowerCase();
          return vt === 'all' || vt === vCategory;
        });
        setAvailableOffers(filtered);
      }
    } catch (err) {
      console.error('Error fetching available offers:', err);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  // Admin-set platform fee and advance %; backend applies the same values to the booking
  useEffect(() => {
    if (!isOpen) return;
    vehicleSettingService.getPublicVehicleSettings()
      .then(data => {
        setPlatformFee(data.platformFee || 0);
        setAdvancePercentage(data.advancePercentage ?? 20);
      })
      .catch(() => {
        setPlatformFee(0);
        setAdvancePercentage(20);
      });
    loadAvailableOffers();
  }, [isOpen]);

  // Early return if modal is not open or vehicle is not available
  if (!isOpen || !vehicle) return null;

  // Check if this vehicle supports partial payment (bus/car only, not auto)
  const supportsPartialPayment = vehicle.pricingReference?.category !== 'auto';

  // Calculate partial payment amounts for cash method
  const getPartialPaymentAmounts = () => {
    if (!supportsPartialPayment || selectedPaymentMethod !== 'cash') {
      return { onlineAmount: 0, cashAmount: totalPrice };
    }

    const onlineAmount = Math.round(totalPrice * 0.3);
    const cashAmount = totalPrice - onlineAmount;
    return { onlineAmount, cashAmount };
  };

  // Get partial payment amounts (will be calculated after totalPrice is available)
  const getPartialPaymentAmountsWithPrice = (price: number) => {
    if (!supportsPartialPayment || selectedPaymentMethod !== 'cash') {
      return { onlineAmount: 0, cashAmount: price };
    }

    const onlineAmount = Math.round(price * 0.3);
    const cashAmount = price - onlineAmount;
    return { onlineAmount, cashAmount };
  };

  // Debug: Log the booking data received
  console.log('Debug - Checkout received bookingData:', bookingData);
  console.log('Debug - Checkout received vehicle:', vehicle);

  // Calculate distance using utility function
  const distance = bookingData.distanceKm || calculateDistance(bookingData.fromData, bookingData.toData);

  // Determine trip type based on service type
  const tripType = bookingData.serviceType === 'roundTrip' ? 'return' : 'one-way';

  // Calculate price using the same robust logic as listing pages
  // Calculate price using the same robust logic as listing pages
  const calculateTotalPrice = () => {
    if (!vehicle.pricing) return 0;

    // For car and bus vehicles, calculate distance-based pricing
    const distancePricing = vehicle.pricing.distancePricing;
    if (!distancePricing) return 0;

    // Try multiple possible trip type keys (same as listing pages)
    let pricing = distancePricing[tripType];
    if (!pricing) {
      // Fallback to other possible keys
      pricing = distancePricing['oneWay'] ||
        distancePricing['one-way'] ||
        distancePricing['oneway'] ||
        distancePricing['return'] ||
        Object.values(distancePricing)[0]; // Use first available
    }

    if (!pricing) return 0;

    // Determine rate based on distance tier using new 6-tier structure
    let ratePerKm = 0;
    if (distance <= 50 && pricing['50km']) {
      ratePerKm = pricing['50km'];
    } else if (distance <= 100 && pricing['100km']) {
      ratePerKm = pricing['100km'];
    } else if (distance <= 150 && pricing['150km']) {
      ratePerKm = pricing['150km'];
    } else if (distance <= 200 && pricing['200km']) {
      ratePerKm = pricing['200km'];
    } else if (distance <= 250 && pricing['250km']) {
      ratePerKm = pricing['250km'];
    } else if (pricing['300km']) {
      ratePerKm = pricing['300km'];
    } else if (pricing['250km']) {
      ratePerKm = pricing['250km'];
    } else if (pricing['200km']) {
      ratePerKm = pricing['200km'];
    } else if (pricing['150km']) {
      ratePerKm = pricing['150km'];
    } else if (pricing['100km']) {
      ratePerKm = pricing['100km'];
    } else if (pricing['50km']) {
      ratePerKm = pricing['50km'];
    }

    // Trip fare is 2x distance (aane aur jane dono ka / round trip)
    const totalPrice = ratePerKm * distance * 2;

    // Round to whole rupees (no decimal places)
    return Math.round(totalPrice);
  };

  const fare = calculateTotalPrice();
  const baseTotal = fare + platformFee;
  // Online now = admin's advance % of total; rest is cash to driver
  const isAdvance = advancePercentage < 100;
  const advanceBeforeDiscount = isAdvance ? Math.round(baseTotal * advancePercentage) / 100 : baseTotal;
  // Coupon comes off the platform's online share only (driver's cash unchanged); ₹1 stays payable — same as backend
  const couponDiscount = appliedCoupon
    ? Math.max(0, Math.min(couponDiscountFor(appliedCoupon, baseTotal), advanceBeforeDiscount - 1))
    : 0;
  const totalPrice = baseTotal - couponDiscount;
  const payNowAmount = Math.round((advanceBeforeDiscount - couponDiscount) * 100) / 100;

  const formatAmount = (num: number) => {
    if (Number.isInteger(num)) {
      return num.toLocaleString('en-IN');
    }
    return Number(num.toFixed(2)).toLocaleString('en-IN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    });
  };

  const applyCoupon = async (overrideCode?: string) => {
    const code = (overrideCode || couponInput).trim().toUpperCase();
    if (!code) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const coupon = await offerApi.validateCoupon(code, baseTotal, vehicle.pricingReference?.category || vehicle.type);
      setAppliedCoupon(coupon);
      setCouponInput(coupon.code);
      setIsOffersModalOpen(false);
      toast({
        title: "Coupon Applied!",
        description: `Code ${coupon.code} applied successfully.`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invalid coupon code';
      if (!overrideCode) {
        setAppliedCoupon(null);
      }
      setCouponError(msg);
      toast({ title: "Coupon not applied", description: msg, variant: "destructive" });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Get partial payment amounts now that totalPrice is available
  const { onlineAmount, cashAmount } = getPartialPaymentAmountsWithPrice(totalPrice);

  // Get rate per km for display
  const getRatePerKm = () => {
    if (!vehicle.pricing) return 0;

    // For car and bus, calculate rate per km based on distance
    const distancePricing = vehicle.pricing.distancePricing;
    if (!distancePricing) return 0;

    // Try multiple possible trip type keys (same as listing pages)
    let pricing = distancePricing[tripType];
    if (!pricing) {
      // Fallback to other possible keys
      pricing = distancePricing['oneWay'] ||
        distancePricing['one-way'] ||
        distancePricing['oneway'] ||
        distancePricing['return'] ||
        Object.values(distancePricing)[0]; // Use first available
    }

    if (!pricing) return 0;

    // Determine rate based on distance tier
    let ratePerKm = 0;
    if (distance <= 50 && pricing['50km']) {
      ratePerKm = pricing['50km'];
    } else if (distance <= 100 && pricing['100km']) {
      ratePerKm = pricing['100km'];
    } else if (distance <= 150 && pricing['150km']) {
      ratePerKm = pricing['150km'];
    } else if (distance <= 200 && pricing['200km']) {
      ratePerKm = pricing['200km'];
    } else if (distance <= 250 && pricing['250km']) {
      ratePerKm = pricing['250km'];
    } else if (pricing['300km']) {
      ratePerKm = pricing['300km'];
    } else if (pricing['250km']) {
      ratePerKm = pricing['250km'];
    } else if (pricing['200km']) {
      ratePerKm = pricing['200km'];
    } else if (pricing['150km']) {
      ratePerKm = pricing['150km'];
    } else if (pricing['100km']) {
      ratePerKm = pricing['100km'];
    } else if (pricing['50km']) {
      ratePerKm = pricing['50km'];
    }

    return ratePerKm;
  };

  // Book Now: open Razorpay for the amount due now, then create the booking with the verified payment.
  // The server claims the payment for the booking and refunds it automatically if the booking can't be created.
  const handleBooking = async () => {
    if (!user || !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book a vehicle.",
        variant: "destructive",
      });
      return;
    }

    if (!user.phone) {
      toast({
        title: "Profile Incomplete",
        description: "Please add your phone number in your profile.",
        variant: "destructive",
      });
      return;
    }

    if (payNowAmount <= 0) {
      toast({
        title: "Fare Not Available",
        description: "Could not calculate the fare for this trip. Please try another vehicle.",
        variant: "destructive",
      });
      return;
    }

    const fromLat = parseFloat(bookingData.fromData?.lat?.toString() || '');
    const fromLng = parseFloat(bookingData.fromData?.lng?.toString() || '');
    const toLat = parseFloat(bookingData.toData?.lat?.toString() || '');
    const toLng = parseFloat(bookingData.toData?.lng?.toString() || '');
    if ([fromLat, fromLng, toLat, toLng].some(isNaN)) {
      toast({
        title: "Invalid Locations",
        description: "Please select valid pickup and drop locations.",
        variant: "destructive",
      });
      return;
    }

    const pickupDate = bookingData.pickupDate || getDefaultDate(1);
    const pickupTime = bookingData.pickupTime || '09:00';
    if (!validateDateFormat(pickupDate) || !validateTimeFormat(pickupTime)) {
      toast({
        title: "Invalid Date or Time",
        description: "Please select a valid pickup date and time.",
        variant: "destructive",
      });
      return;
    }

    // Same rule the server enforces; checked before paying so nobody pays for a trip that gets rejected
    if (new Date(`${pickupDate}T${pickupTime}`) < new Date()) {
      toast({
        title: "Pickup Time Has Passed",
        description: "Please go back and choose a future pickup date and time.",
        variant: "destructive",
      });
      return;
    }

    // Stays true until Razorpay succeeds/fails/closes, so Book Now can't be pressed twice
    setIsProcessing(true);

    const razorpayService = new RazorpayService();
    await razorpayService.processBookingPayment(
      {
        amount: payNowAmount,
        bookingId: `temp_${Date.now()}`,
        description: `${vehicleName}: ${bookingData.from} to ${bookingData.to}${isAdvance ? ` (Advance ₹${formatAmount(payNowAmount)} of ₹${formatAmount(totalPrice)})` : ''}`
      },
      {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        phone: user.phone
      },
      async (verifiedPayment) => {
        try {
          const bookingApi = new BookingApiService(import.meta.env.VITE_API_BASE_URL || '/api');
          await bookingApi.createBooking({
            vehicleId: vehicle._id,
            pickup: { latitude: fromLat, longitude: fromLng, address: bookingData.from || 'Not specified' },
            destination: { latitude: toLat, longitude: toLng, address: bookingData.to || 'Not specified' },
            date: pickupDate,
            time: pickupTime,
            tripType: bookingData.serviceType === 'roundTrip' ? 'return' : 'one-way',
            returnDate: bookingData.returnDate || null,
            passengers: 1,
            specialRequests: '',
            paymentMethod: 'razorpay',
            paymentId: verifiedPayment.paymentId,
            couponCode: couponDiscount > 0 ? appliedCoupon?.code : undefined
          });

          toast({
            title: "Booking Confirmed!",
            description: isAdvance
              ? `Advance of ₹${formatAmount(payNowAmount)} paid. Your booking is confirmed.`
              : `₹${formatAmount(payNowAmount)} paid. Your booking is confirmed.`,
          });
          onClose();
          navigate('/bookings');
        } catch (bookingError) {
          // Server has already refunded (or flagged for refund) the payment; its message says which
          toast({
            title: "Booking Failed",
            description: bookingError instanceof Error ? bookingError.message : "Please contact support.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      },
      (paymentError) => {
        setIsProcessing(false);
        toast({
          title: "Payment Failed",
          description: paymentError instanceof Error ? paymentError.message : "Payment was not completed. Please try again.",
          variant: "destructive",
        });
      },
      () => setIsProcessing(false) // user closed Razorpay without paying
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const vehicleName = (() => {
    const brand = vehicle.brand?.trim() || '';
    const model = vehicle.pricingReference?.vehicleModel?.trim() || vehicle.model?.trim() || '';
    if (!model) return brand;
    if (!brand) return model;
    if (brand.toLowerCase().includes(model.toLowerCase())) return brand;
    if (model.toLowerCase().includes(brand.toLowerCase())) return model;
    return `${brand} ${model}`;
  })();

  return (
    <div className="fixed inset-0 z-[105] flex flex-col bg-slate-50 w-full h-full min-h-screen overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200/80 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Complete Your Booking</h2>
          <p className="text-xs text-gray-500">Review your trip details and confirm payment</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-gray-100 h-9 w-9 rounded-full text-gray-500 hover:text-gray-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 max-w-2xl mx-auto w-full pb-6">
        {/* Trip Details */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="w-px flex-1 min-h-6 bg-gray-300 my-1" />
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Pickup</p>
                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{bookingData.from || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Drop</p>
                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{bookingData.to || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {bookingData.pickupDate ? formatDate(bookingData.pickupDate) : 'Date TBD'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {bookingData.pickupTime ? formatTime(bookingData.pickupTime) : 'Time TBD'}
            </span>
            {distance > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {distance.toFixed(1)} km
              </span>
            )}
            {bookingData.returnDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Return {formatDate(bookingData.returnDate)}
              </span>
            )}
          </div>
        </div>

        {/* Vehicle Details & Important Notes */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-20 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
              {vehicle.images && vehicle.images.length > 0 ? (
                <img
                  src={vehicle.images[0].url}
                  alt={vehicleName}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Car className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 truncate">{vehicleName}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {vehicle.isAc ? 'AC' : 'Non-AC'} • {vehicle.seatingCapacity} Seater
                {vehicle.type ? <> • <span className="capitalize">{vehicle.type}</span></> : null}
              </p>
            </div>
          </div>

          {/* Important Trip Guidelines / Exclusions */}
          <div className="mt-3.5 pt-3 border-t border-gray-100 bg-slate-50/70 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Important Notes:</span>
            </p>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>Night charge of ₹1,000 is applicable and must be paid directly to the driver.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>Toll charges are not included and must be paid by the customer.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>Travel beyond package / scheduled hours will be charged extra.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>Parking charges are not included and must be paid by the customer.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Apply Coupon / View Offers Card */}
        <div 
          onClick={() => {
            if (!appliedCoupon) {
              setIsOffersModalOpen(true);
              if (availableOffers.length === 0) loadAvailableOffers();
            }
          }}
          className={`bg-white p-4 rounded-2xl border border-gray-200 shadow-xs ${!appliedCoupon ? 'cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all' : ''}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600" />
              View Offers and Coupon
            </h3>
            {!appliedCoupon && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOffersModalOpen(true);
                  if (availableOffers.length === 0) loadAvailableOffers();
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                View Offers <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {appliedCoupon && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-emerald-800 font-mono tracking-wide">{appliedCoupon.code}</p>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.5 rounded">Applied</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {couponDiscount > 0
                      ? `You save ₹${couponDiscount.toLocaleString()} with this coupon`
                      : `Minimum booking ₹${appliedCoupon.minBookingAmount} needed`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOffersModalOpen(true);
                    if (availableOffers.length === 0) loadAvailableOffers();
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  Change
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation();
                    setAppliedCoupon(null); 
                    setCouponInput(''); 
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fare Summary */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5 text-sm">
          <h3 className="font-bold text-gray-900">Fare Summary</h3>
          <div className="flex justify-between gap-3 text-gray-600">
            <span>Trip fare</span>
            <span className="text-gray-900 font-medium">₹{fare.toLocaleString()}</span>
          </div>
          {platformFee > 0 && (
            <div className="flex justify-between gap-3 text-gray-600">
              <span>Platform fee</span>
              <span className="text-gray-900 font-medium">₹{platformFee.toLocaleString()}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between gap-3 text-emerald-700">
              <span>Coupon ({appliedCoupon?.code})</span>
              <span className="font-medium">−₹{couponDiscount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between pt-2.5 border-t border-gray-100">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-gray-900 text-base">₹{totalPrice.toLocaleString()}</span>
          </div>
          {isAdvance && (
            <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Pay now ({advancePercentage}% advance)</span>
                <span className="font-bold text-blue-700">₹{formatAmount(payNowAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
          <h3 className="text-sm font-bold text-gray-900">Payment Method</h3>
          {([
            {
              id: 'razorpay' as const,
              icon: CreditCard,
              title: isAdvance ? `Pay ${advancePercentage}% Advance Online` : 'Pay Full Online',
              note: isAdvance
                ? `₹${formatAmount(payNowAmount)} now via UPI, card or net banking`
                : 'UPI, card or net banking via Razorpay'
            }
          ]).map(option => {
            const active = selectedPaymentMethod === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedPaymentMethod(option.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${active
                  ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{option.title}</span>
                  <span className="block text-xs text-gray-500">{option.note}</span>
                </span>
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? 'border-blue-600' : 'border-gray-300'}`}>
                  {active && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 z-20 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-shrink-0">
            <p className="text-[11px] text-gray-500">{isAdvance ? `Pay now (${advancePercentage}% advance)` : 'Pay now'}</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">₹{formatAmount(payNowAmount)}</p>
          </div>
          <Button
            onClick={handleBooking}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99]"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Book Now'
            )}
          </Button>
        </div>
      </div>

      {/* Offers & Coupons Full Page */}
      {isOffersModalOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-slate-50 w-full h-full min-h-screen overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200/80 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOffersModalOpen(false)}
                className="hover:bg-gray-100 h-9 w-9 rounded-full text-gray-700 hover:text-gray-900"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Offers & Coupons</h2>
                <p className="text-xs text-gray-500">Apply a promo code for instant discounts</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOffersModalOpen(false)}
              className="hover:bg-gray-100 h-9 w-9 rounded-full text-gray-500 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full pb-10">
            {/* Available Offers Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Available Offers ({availableOffers.length})
                </h4>
                {isLoadingOffers && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                  </span>
                )}
              </div>

              {isLoadingOffers && availableOffers.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-6">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium">Finding available offers for you...</p>
                </div>
              ) : availableOffers.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 p-6">
                  <Tag className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No active offers for this ride</p>
                  <p className="text-xs text-gray-400 mt-0.5">Please check back later for offers & discounts.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableOffers.map((offer) => {
                    const isApplied = appliedCoupon?.code === offer.code;
                    const minAmt = Number(offer.minBookingAmount) || 0;
                    const isEligible = baseTotal >= minAmt;
                    const savings = isEligible ? calculatePotentialDiscount(offer, baseTotal) : 0;
                    const vType = offer.vehicleType?.toLowerCase();

                    return (
                      <div
                        key={offer._id}
                        className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 ${
                          isApplied
                            ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                            : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              vType === 'bus'
                                ? 'bg-amber-100 text-amber-700'
                                : vType === 'car'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {vType === 'bus' ? (
                                <Bus className="w-5 h-5" />
                              ) : vType === 'car' ? (
                                <Car className="w-5 h-5" />
                              ) : (
                                <Percent className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs bg-gray-100 border border-dashed border-gray-300 px-2.5 py-0.5 rounded text-gray-800">
                                  {offer.code}
                                </span>
                                <span className="text-xs font-semibold text-blue-700">
                                  {offer.discountType === 'flat'
                                    ? `Flat ₹${offer.discountValue} OFF`
                                    : `${offer.discountValue}% OFF${offer.maxDiscount ? ` (up to ₹${offer.maxDiscount})` : ''}`}
                                </span>
                              </div>
                              <h5 className="text-base font-bold text-gray-900 mt-1.5">{offer.title}</h5>
                              {offer.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{offer.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0">
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                                <Check className="w-3.5 h-3.5" /> Applied
                              </span>
                            ) : isEligible ? (
                              <button
                                type="button"
                                onClick={() => offer.code && applyCoupon(offer.code)}
                                disabled={isApplyingCoupon}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs active:scale-95"
                              >
                                Apply
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold">
                                Not Eligible
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Footer Terms & Savings */}
                        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-1">
                          <span>
                            {minAmt > 0 ? `Min. booking ₹${minAmt.toLocaleString()}` : 'No minimum booking'}
                            {offer.validTill && ` • Valid till ${new Date(offer.validTill).toLocaleDateString()}`}
                          </span>
                          {isEligible && savings > 0 ? (
                            <span className="font-bold text-emerald-700">Save ₹{savings.toLocaleString()}</span>
                          ) : !isEligible ? (
                            <span className="text-amber-700 font-medium">Add ₹{(minAmt - baseTotal).toLocaleString()} more</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

