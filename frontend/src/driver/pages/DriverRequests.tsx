import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DriverBottomNavigation from "@/driver/components/DriverBottomNavigation";
import { CheckCircle, XCircle, Clock, MapPin, User, Car, Calendar, CreditCard, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import apiService from "@/services/api.js";
import { toast } from "@/hooks/use-toast";
import { calculateDistance } from "@/lib/distanceUtils";

interface BookingRequest {
  _id: string;
  bookingNumber: string;
  user?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicle?: {
    type: string;
    brand: string;
    model: string;
    color: string;
  };
  tripDetails: {
    pickup: {
      address: string;
    };
    destination: {
      address: string;
    };
    date: string;
    time: string;
    passengers: number;
    distance: number;
    tripType: string;
    returnDate?: string;
  };
  pricing: {
    totalAmount: number;
    ratePerKm: number;
  };
  status: string;
  createdAt: string;
  payment: {
    method: string;
    status: string;
    isPartialPayment: boolean;
    partialPaymentDetails?: {
      onlineAmount: number;
      cashAmount: number;
      onlinePaymentStatus: string;
      cashPaymentStatus: string;
    };
  };
}

const DriverRequests = () => {
  const navigate = useNavigate();

  // Helper function to get pricing - use stored booking price instead of recalculating
  const getBookingPricing = (booking) => {
    // Use the stored booking price instead of recalculating
    // This ensures consistency with the original booking amount
    if (booking.pricing && booking.pricing.totalAmount) {
      return {
        ...booking.pricing,
        totalAmount: booking.pricing.totalAmount,
        ratePerKm: booking.pricing.ratePerKm || 0,
        distance: booking.tripDetails?.distance || 0,
        tripType: booking.tripDetails?.tripType || 'one-way'
      };
    }

    // Fallback: return safe default if no pricing data
    return {
      totalAmount: 0,
      ratePerKm: 0,
      distance: booking.tripDetails?.distance || 0,
      tripType: booking.tripDetails?.tripType || 'one-way'
    };
  };
  const { driver, isLoggedIn } = useDriverAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  // Booking whose "Complete Trip" was tapped and now shows the cash collection step
  const [collectingCashFor, setCollectingCashFor] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchDriverBookings();
    }
  }, [isLoggedIn]);

  const fetchDriverBookings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDriverBookings();
      setBookings(data?.data?.docs || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch booking requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string, extras: Record<string, unknown> = {}) => {
    try {
      setUpdatingStatus(bookingId);
      await apiService.updateDriverBookingStatus(bookingId, newStatus, extras);
      setCollectingCashFor(null);

      // Update local state
      setBookings(prev => prev.map(booking =>
        booking._id === bookingId
          ? { ...booking, status: newStatus }
          : booking
      ));

      toast({
        title: "Success",
        description: extras.cashCollected
          ? "Cash collected and trip completed"
          : `Booking ${newStatus} successfully`,
      });

      // Refresh bookings to get updated data
      fetchDriverBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const collectCashPayment = async (bookingId: string) => {
    try {
      setUpdatingStatus(bookingId);
      // Use generic booking endpoint via apiService to ensure auth headers
      const resp = await apiService.request(`/bookings/${bookingId}/collect-cash-payment`, { method: 'PUT' }, 'driver');

      // Update local state
      setBookings(prev => prev.map(booking =>
        booking._id === bookingId
          ? {
            ...booking,
            payment: {
              ...booking.payment,
              partialPaymentDetails: {
                ...booking.payment.partialPaymentDetails,
                cashPaymentStatus: 'collected'
              }
            }
          }
          : booking
      ));

      toast({
        title: "Success",
        description: "Cash payment marked as collected successfully",
      });

      // Refresh bookings to get updated data
      fetchDriverBookings();
    } catch (error) {
      console.error('Error collecting cash payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to collect cash payment",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Accepted</Badge>;
      case 'started':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Started</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-600 text-white">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusActions = (booking: BookingRequest) => {
    switch (booking.status) {
      case 'pending':
        return (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 w-full h-10 rounded-xl"
              onClick={() => updateBookingStatus(booking._id, 'accepted')}
              disabled={updatingStatus === booking._id}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50 w-full h-10 rounded-xl"
              onClick={() => updateBookingStatus(booking._id, 'cancelled')}
              disabled={updatingStatus === booking._id}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Decline
            </Button>
          </div>
        );
      case 'accepted':
        return (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 w-full h-10 rounded-xl"
            onClick={() => updateBookingStatus(booking._id, 'started')}
            disabled={updatingStatus === booking._id}
          >
            <Clock className="w-4 h-4 mr-1" />
            Start Trip
          </Button>
        );
      case 'started': {
        const cashDue = booking.payment?.isPartialPayment &&
          booking.payment.partialPaymentDetails?.cashPaymentStatus !== 'collected'
          ? booking.payment.partialPaymentDetails?.cashAmount || 0
          : 0;

        // Step 2 (advance bookings): confirm the remaining cash; this also completes the trip
        if (cashDue > 0 && collectingCashFor === booking._id) {
          return (
            <div className="space-y-2">
              <p className="text-xs text-center text-orange-700">
                Collect <span className="font-bold">₹{cashDue.toLocaleString()}</span> cash from the passenger
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-xl px-4"
                  onClick={() => setCollectingCashFor(null)}
                  disabled={updatingStatus === booking._id}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 w-full h-10 rounded-xl"
                  onClick={() => updateBookingStatus(booking._id, 'completed', { cashCollected: true })}
                  disabled={updatingStatus === booking._id}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Cash Collected ₹{cashDue.toLocaleString()}
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 w-full h-10 rounded-xl"
            onClick={() => cashDue > 0
              ? setCollectingCashFor(booking._id)
              : updateBookingStatus(booking._id, 'completed')}
            disabled={updatingStatus === booking._id}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Complete Trip
          </Button>
        );
      }
      case 'completed':
        // Show payment collection button for partial payment bookings
        if (booking.payment?.isPartialPayment &&
          booking.payment.partialPaymentDetails?.cashPaymentStatus === 'pending') {
          return (
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 w-full h-10 rounded-xl"
              onClick={() => collectCashPayment(booking._id)}
              disabled={updatingStatus === booking._id}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Collect Cash Payment
            </Button>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  // Rendering is protected by the route guard; avoid early return that can cause blank screen during auth state transitions

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Booking Requests</h1>
          {bookings.length > 0 && (
            <span className="text-xs font-semibold text-gray-500">
              {bookings.filter(b => b.status === 'pending').length} new
            </span>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 py-3 pb-24 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 text-center py-12 px-4">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">No Booking Requests</h3>
              <p className="text-sm text-gray-500">New bookings for your vehicles will show up here.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const pricing = getBookingPricing(booking);
              const partial = booking.payment?.isPartialPayment ? booking.payment.partialPaymentDetails : null;
              const isRoundTrip = booking.tripDetails.tripType === 'return';
              const showPhone = ['accepted', 'started'].includes(booking.status) && booking.user?.phone;
              const vehicleName = booking.vehicle?.brand || 'Vehicle';
              const actions = getStatusActions(booking);

              return (
                <div key={booking._id} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  {/* Top: status + amount */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getStatusBadge(booking.status)}
                        {isRoundTrip && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-[11px]">Round Trip</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">#{booking.bookingNumber}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-gray-900">₹{pricing.totalAmount.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-500">₹{pricing.ratePerKm}/km (2x)</p>
                    </div>
                  </div>

                  {/* Payment split */}
                  {partial ? (
                    <div className="mx-4 mb-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                        <p className="text-emerald-700">Paid online</p>
                        <p className="font-bold text-emerald-800">₹{(partial.onlineAmount || 0).toLocaleString()}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 border ${partial.cashPaymentStatus === 'collected' ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-100'}`}>
                        <p className={partial.cashPaymentStatus === 'collected' ? 'text-gray-600' : 'text-orange-700'}>
                          {partial.cashPaymentStatus === 'collected' ? 'Cash collected' : 'Collect in cash'}
                        </p>
                        <p className={`font-bold ${partial.cashPaymentStatus === 'collected' ? 'text-gray-800' : 'text-orange-800'}`}>
                          ₹{(partial.cashAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : booking.payment?.status === 'completed' ? (
                    <div className="mx-4 mb-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs flex justify-between">
                      <span className="text-emerald-700">Fully paid online</span>
                      <span className="font-bold text-emerald-800">Nothing to collect</span>
                    </div>
                  ) : null}

                  {/* Route */}
                  <div className="px-4 pb-3 flex gap-3">
                    <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="w-px flex-1 min-h-5 bg-gray-300 my-1" />
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Pickup</p>
                        <p className="text-sm font-medium text-gray-900">{booking.tripDetails.pickup.address}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Drop</p>
                        <p className="text-sm font-medium text-gray-900">{booking.tripDetails.destination.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mx-4 py-2.5 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(booking.tripDetails.date)}, {formatTime(booking.tripDetails.time)}
                    </span>
                    <span className="flex items-center gap-1.5" title="Route distance (charged 2x for round trip)">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {Number(booking.tripDetails.distance || 0).toFixed(1)} km (2x)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {booking.tripDetails.passengers || 1}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-gray-400" />
                      {vehicleName}
                    </span>
                    {isRoundTrip && booking.tripDetails.returnDate && (
                      <span className="text-blue-700 font-medium">Return {formatDate(booking.tripDetails.returnDate)}</span>
                    )}
                  </div>

                  {/* Passenger */}
                  <div className="mx-4 py-2.5 border-t border-gray-100 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Passenger</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {booking.user ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() : 'Customer'}
                      </p>
                    </div>
                    {showPhone && (
                      <a
                        href={`tel:${booking.user!.phone}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  {actions && (
                    <div className="px-4 pb-4 pt-1">
                      {actions}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <DriverBottomNavigation />
    </div>
  );
};

export default DriverRequests; 