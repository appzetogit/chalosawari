import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { List, Clock, MapPin, Calendar, User, Home, HelpCircle, X, Bus, Car, CreditCard, Phone, Mail, Loader2, Download, Receipt, RefreshCw, ArrowLeft, Ticket, ChevronRight, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserBottomNavigation from "@/components/UserBottomNavigation";
import { useUserAuth } from "@/contexts/UserAuthContext";
import apiService from "@/services/api";
import { toast } from "@/hooks/use-toast";
import LoginPrompt from "@/components/LoginPrompt";
import { formatDate, formatTime } from "@/lib/utils";
import { calculateDistance } from "@/lib/distanceUtils";

const Bookings = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUserAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  // Rating dialog
  const [ratingBooking, setRatingBooking] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const submitRating = async () => {
    if (!ratingBooking || ratingStars < 1) return;
    try {
      setIsSubmittingRating(true);
      const response = await apiService.rateBooking(ratingBooking._id, ratingStars, ratingReview.trim());
      if (response.success) {
        const updatedRating = response.data.rating;
        setBookings(prev => prev.map(b => b._id === ratingBooking._id ? { ...b, rating: updatedRating } : b));
        setSelectedBooking(prev => (prev && prev._id === ratingBooking._id ? { ...prev, rating: updatedRating } : prev));
        toast({ title: "Thank you!", description: "Your rating & review have been submitted." });
        setRatingBooking(null);
        setRatingStars(0);
        setRatingReview('');
      } else {
        toast({ title: "Error", description: response.error?.message || "Could not submit rating", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not submit rating", variant: "destructive" });
    } finally {
      setIsSubmittingRating(false);
    }
  };
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch user bookings
  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get all bookings for the user
      const response = await apiService.getUserBookings();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Bookings API response:', response);
      }
      
      if (response.success) {
        // Handle both possible response structures
        let bookingsData = [];
        if (response.data?.docs) {
          // New paginated structure
          bookingsData = response.data.docs;
        } else if (response.data?.bookings) {
          // Old structure
          bookingsData = response.data.bookings;
        } else if (Array.isArray(response.data)) {
          // Direct array
          bookingsData = response.data;
        } else {
          bookingsData = [];
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Setting bookings data:', bookingsData);
          console.log('Sample booking cancellation data:', bookingsData[0]?.cancellation);
        }
        setBookings(bookingsData);
      } else {
        setError(response.error?.message || response.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (error.message?.includes('Authentication failed')) {
        setError('Your session has expired. Please login again.');
      } else if (error.message?.includes('Route not found')) {
        setError('API endpoint not found. Please check server configuration.');
      } else if (error.message?.includes('Failed to fetch')) {
        setError('Network error. Please check if the server is running.');
      } else {
        setError(`Failed to fetch bookings: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

  // Refresh bookings when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        fetchBookings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated]);

  // Helper function to get date from booking
  const getBookingDate = (booking) => {
    if (!booking) return null;
    // Try different possible date fields in order of preference
    return booking.tripDetails?.date || 
           booking.tripDetails?.pickup?.date || 
           booking.date || 
           booking.pickupDate || 
           booking.departureDate;
  };

  // Helper function to get pricing - use stored pricing from backend instead of recalculating
  const getBookingPricing = (booking) => {
    // Always use the stored pricing from backend as it's already calculated correctly
    // The backend calculates: 34 km × ₹7 = ₹238 and stores it in booking.pricing.totalAmount
    return booking.pricing || { totalAmount: 0, ratePerKm: 0, distance: 0 };
  };

  // Helper function to get time from booking
  const getBookingTime = (booking) => {
    if (!booking) return null;
    // Try different possible time fields in order of preference
    return booking.tripDetails?.time || 
           booking.tripDetails?.pickup?.time || 
           booking.time || 
           booking.pickupTime || 
           booking.departureTime;
  };

  // Helper function to get pickup address
  const getPickupAddress = (booking) => {
    if (!booking) return 'Pickup Location';
    return booking.tripDetails?.pickup?.address || 
           booking.pickupAddress || 
           booking.from || 
           'Pickup Location';
  };

  // Helper function to get destination address
  const getDestinationAddress = (booking) => {
    if (!booking) return 'Destination';
    return booking.tripDetails?.destination?.address || 
           booking.destinationAddress || 
           booking.to || 
           'Destination';
  };

  // Helper function to get return date from booking (for round trips)
  const getReturnDate = (booking) => {
    if (!booking) return null;
    // Try multiple possible return date fields
    return booking.tripDetails?.returnDate || 
           booking.tripDetails?.return?.date ||
           booking.tripDetails?.destination?.returnDate ||
           booking.returnDate || 
           booking.destinationReturnDate ||
           booking.returnTripDate ||
           booking.roundTripReturnDate ||
           booking.tripDetails?.roundTrip?.returnDate ||
           booking.tripDetails?.roundTripReturnDate ||
           null;
  };

  // Helper function to get trip type
  const getTripType = (booking) => {
    if (!booking) return 'one-way';
    // Try multiple possible trip type fields
    return booking.tripType || 
           booking.tripDetails?.tripType || 
           booking.tripDetails?.type ||
           booking.serviceType ||
           booking.bookingType ||
           (getReturnDate(booking) ? 'return' : 'one-way');
  };

  // Helper function to check if it's a round trip
  const isRoundTrip = (booking) => {
    // Check multiple conditions for round trip
    const hasReturnDate = !!getReturnDate(booking);
    const isReturnType = getTripType(booking) === 'return';
    const hasRoundTripFlag = booking.isRoundTrip === true;
    
    // Additional checks for round trip indicators
    const hasRoundTripInDetails = booking.tripDetails?.isRoundTrip === true;
    const hasReturnInDetails = !!booking.tripDetails?.return;
    const hasDestinationReturn = !!booking.tripDetails?.destination?.returnDate;
    const hasServiceTypeReturn = booking.serviceType === 'return' || booking.serviceType === 'round_trip';
    const hasBookingTypeReturn = booking.bookingType === 'return' || booking.bookingType === 'round_trip';
    
    // Check for any text that might indicate round trip
    const hasRoundTripText = 
      (booking.tripDetails?.description && 
       (booking.tripDetails.description.toLowerCase().includes('round') || 
        booking.tripDetails.description.toLowerCase().includes('return'))) ||
      (booking.notes && 
       (booking.notes.toLowerCase().includes('round') || 
        booking.notes.toLowerCase().includes('return'))) ||
      (booking.comments && 
       (booking.comments.toLowerCase().includes('round') || 
        booking.comments.toLowerCase().includes('return')));
    
    // Check for any field that might contain round trip info
    const hasAnyRoundTripField = 
      booking.roundTrip === true ||
      booking.isRoundTrip === true ||
      booking.round_trip === true ||
      booking.returnTrip === true ||
      booking.twoWay === true ||
      booking.two_way === true;
    
    // Debug logging for round trip detection
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Round Trip Check for booking:', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        hasReturnDate,
        isReturnType,
        hasRoundTripFlag,
        hasServiceTypeReturn,
        hasBookingTypeReturn,
        returnDate: getReturnDate(booking),
        tripType: getTripType(booking),
        serviceType: booking.serviceType,
        bookingType: booking.bookingType
      });
    }
    
    return hasReturnDate || isReturnType || hasRoundTripFlag || hasRoundTripInDetails || 
           hasReturnInDetails || hasDestinationReturn || hasServiceTypeReturn || hasBookingTypeReturn ||
           hasRoundTripText || hasAnyRoundTripField;
  };

  // Filter bookings based on active tab
  const upcomingBookings = Array.isArray(bookings) ? bookings.filter(booking => 
    ['pending', 'accepted', 'started', 'cancellation_requested'].includes(booking.status)
  ) : [];

  const pastBookings = Array.isArray(bookings) ? bookings.filter(booking => 
    ['completed', 'cancelled'].includes(booking.status)
  ) : [];

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  const handleCancelBooking = () => {
    setIsCancelModalOpen(true);
  };

  const confirmCancelBooking = async () => {
    try {
      if (!selectedBooking) return;
      
      // Request cancellation instead of direct cancellation
      const response = await apiService.requestCancellation(selectedBooking._id, 'User requested cancellation');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Cancellation response:', response);
      }
      
      if (response.success) {
        toast({
          title: "Cancellation Requested",
          description: "Your cancellation request has been submitted. Admin will review and process it.",
        });
        
        // Update local state to show cancellation requested
        setBookings(prevBookings => {
          const updatedBookings = prevBookings.map(booking => 
            booking._id === selectedBooking._id 
              ? { ...booking, status: 'cancellation_requested' }
              : booking
          );
          if (process.env.NODE_ENV === 'development') {
            console.log('Updated bookings state:', updatedBookings);
          }
          return updatedBookings;
        });
        
        setIsCancelModalOpen(false);
        setIsDetailModalOpen(false);
        setSelectedBooking(null);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to request cancellation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast({
        title: "Error",
        description: "Failed to request cancellation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Current bookings state:', bookings);
    console.log('Upcoming bookings:', upcomingBookings);
    console.log('Past bookings:', pastBookings);
    console.log('Active tab:', activeTab);
    console.log('Current bookings for display:', currentBookings);
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPrompt 
        title="Login to View Bookings"
        description="Please login to view your booking history and manage your trips"
      />
    );
  }

  // Helper function to get payment status display
  const getPaymentStatusDisplay = (booking) => {
    if (!booking.payment) return null;
    
    // Ensure payment object has required properties
    const payment = booking.payment || {};
    
    if (payment.isPartialPayment) {
      const { onlinePaymentStatus, cashPaymentStatus, onlineAmount, cashAmount } = payment.partialPaymentDetails || {};
      
      return (
        <div className="space-y-0.5">
          <div className="text-xs text-gray-600">Payment Status:</div>
          <div className="flex items-center space-x-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              onlinePaymentStatus === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-700">
              Online: ₹{onlineAmount} ({onlinePaymentStatus === 'completed' ? 'Paid' : 'Pending'})
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              cashPaymentStatus === 'collected' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-700">
              Cash: ₹{cashAmount} ({cashPaymentStatus === 'collected' ? 'Paid' : 'Pending'})
            </span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-0.5">
        <div className="text-xs text-gray-600">Payment Method:</div>
        <div className="text-xs text-gray-700 capitalize">
          {payment.method === 'razorpay' ? 'Online Payment' : 
           payment.method === 'cash' ? 'Cash Payment' : 
           payment.method || 'Unknown'}
        </div>
        <div className="text-xs text-gray-600">Payment Status:</div>
        <div className="flex items-center space-x-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            payment.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-xs text-gray-700">
            {payment.status === 'completed' ? 'Completed' : 'Pending'}
          </span>
        </div>
        {payment.transactionId && (
          <div className="text-xs text-gray-600">
            Transaction ID: {payment.transactionId}
          </div>
        )}
      </div>
    );
  };

  const downloadReceipt = async (booking) => {
    try {
      setIsDownloading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('userToken') || localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/bookings/${booking._id}/receipt`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `receipt_${booking.bookingNumber}`;
        
        if (contentType && contentType.includes('application/pdf')) {
          // Handle PDF download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast({
            title: "PDF Receipt Downloaded",
            description: "Your booking receipt has been downloaded successfully.",
          });
        } else if (contentType && contentType.includes('text/html')) {
          // Handle HTML download
          const htmlContent = await response.text();
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast({
            title: "HTML Receipt Downloaded",
            description: "Your booking receipt has been downloaded. Open it in a browser and print.",
          });
        } else {
          // Fallback for unknown content type
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast({
            title: "Receipt Downloaded",
            description: "Your booking receipt has been downloaded.",
          });
        }
        } else {
          let errorMessage = "Failed to download receipt";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to download receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 flex flex-col font-sans antialiased">
      {/* Clean Native Mobile Header */}
      <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100 shadow-xs">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">
          My Bookings
        </h1>
        <div className="w-8" />
      </div>

      {/* Modern Segmented Pill Tabs */}
      <div className="max-w-md w-full mx-auto px-4 pt-3 pb-1">
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 border border-gray-200/50 shadow-inner">
          <button
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              activeTab === "upcoming"
                ? "bg-white text-blue-600 shadow-xs scale-[1.01]"
                : "text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("upcoming")}
          >
            <span>Upcoming</span>
            {upcomingBookings.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "upcoming" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
              }`}>
                {upcomingBookings.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              activeTab === "past"
                ? "bg-white text-blue-600 shadow-xs scale-[1.01]"
                : "text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("past")}
          >
            <span>Past Bookings</span>
            {pastBookings.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "past" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
              }`}>
                {pastBookings.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 max-w-md w-full mx-auto px-4 py-3 space-y-3.5 pb-28">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-9 h-9 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Loading your journeys...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-xs">
              <p className="text-red-600 mb-3 text-sm font-medium">{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchBookings}
                className="text-red-600 border-red-300 hover:bg-red-50 text-xs rounded-xl"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : currentBookings.length > 0 ? (
          currentBookings.map((booking) => (
            <div
              key={booking._id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5"
            >
              {/* Card Header: Vehicle + ID & Status */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2.5">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    {booking.vehicle?.type?.toLowerCase().includes('car') ? (
                      <Car className="w-4 h-4" />
                    ) : (
                      <Bus className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {booking.vehicle?.type || 'Ride'} • {booking.vehicle?.brand || ''} {booking.vehicle?.model || ''}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">#{booking.bookingNumber}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1 shrink-0">
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                    ['accepted', 'started'].includes(booking.status)
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : booking.status === 'pending'
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : booking.status === 'completed'
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : booking.status === 'cancellation_requested'
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : booking.status === 'cancelled'
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}>
                    {booking.status === 'cancellation_requested' 
                      ? 'Cancel Pending'
                      : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
                    }
                  </span>
                </div>
              </div>

              {/* Visual Route Timeline */}
              <div className="space-y-2 py-0.5">
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                    <div className="w-0.5 h-7 bg-gray-200 my-0.5" />
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Pickup</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1">
                        {getPickupAddress(booking)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Destination</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1">
                        {getDestinationAddress(booking)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trip Metadata Chips */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs text-gray-600 flex-wrap gap-2">
                <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium text-gray-800">{formatDate(getBookingDate(booking))}</span>
                </div>

                <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium text-gray-800">{formatTime(getBookingTime(booking))}</span>
                </div>

                <div className="text-right ml-auto">
                  <span className="text-xs text-gray-400 font-medium">Fare: </span>
                  <span className="text-base font-bold text-gray-900">
                    ₹{getBookingPricing(booking).totalAmount || 0}
                  </span>
                </div>
              </div>

              {/* Night Stay Note */}
              {isRoundTrip(booking) && (
                <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-2.5 text-xs text-amber-800 flex items-start space-x-1.5">
                  <span className="text-xs">🌙</span>
                  <p><span className="font-semibold">Night Stay:</span> Driver allowance ₹500 applicable if night halt required.</p>
                </div>
              )}

              {/* Payment Status */}
              {getPaymentStatusDisplay(booking)}

              {/* Card Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button 
                  variant="default"
                  size="sm" 
                  className="flex-1 h-9 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  onClick={() => handleViewDetails(booking)}
                >
                  View Details
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>

                {/* Rate a completed trip, or show the given rating */}
                {booking.status === 'completed' && (
                  booking.rating?.stars ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-0.5 px-2 h-7" title={`You rated ${booking.rating.stars}/5`}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= booking.rating.stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      {booking.rating?.review && (
                        <p className="text-[10px] text-gray-500 italic max-w-[140px] truncate" title={booking.rating.review}>
                          "{booking.rating.review}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold rounded-xl"
                      onClick={() => {
                        setRatingBooking(booking);
                        setRatingStars(0);
                        setRatingReview('');
                      }}
                    >
                      <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" />
                      Rate Trip
                    </Button>
                  )
                )}

                {/* Once the driver accepts, only admin can cancel */}
                {booking.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-medium rounded-xl"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setIsCancelModalOpen(true);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          /* Application-Grade Empty State */
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center my-6 space-y-4">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-blue-50/50">
              <Ticket className="w-9 h-9 text-blue-600 stroke-[1.5]" />
            </div>
            
            <div className="space-y-1 max-w-xs mx-auto">
              <h3 className="text-lg font-bold text-gray-900">
                {activeTab === 'upcoming' ? "No Upcoming Trips" : "No Past Bookings"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                {activeTab === 'upcoming'
                  ? "You don't have any scheduled rides right now. Search buses or cars to plan your journey!"
                  : "Your completed and cancelled trip history will appear here once you take a ride."}
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                Book a Ride Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details (full page) */}
      {isDetailModalOpen && selectedBooking && (() => {
        const b = selectedBooking;
        const statusStyle = {
          pending: 'bg-amber-50 text-amber-700 border-amber-200',
          accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          started: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          completed: 'bg-blue-50 text-blue-700 border-blue-200',
          cancellation_requested: 'bg-orange-50 text-orange-700 border-orange-200',
          cancelled: 'bg-red-50 text-red-700 border-red-200'
        }[b.status] || 'bg-gray-50 text-gray-700 border-gray-200';
        const statusLabel = b.status === 'cancellation_requested'
          ? 'Cancellation Requested'
          : b.status.charAt(0).toUpperCase() + b.status.slice(1);
        const pricing = getBookingPricing(b);
        const platformFee = pricing.platformFee || 0;
        const discount = pricing.discount || 0;
        const fare = (pricing.totalAmount || 0) + discount - platformFee; // totalAmount is after the coupon
        const payment = b.payment || {};
        const paidOnline = payment.isPartialPayment
          ? (payment.partialPaymentDetails?.onlinePaymentStatus === 'completed' ? payment.partialPaymentDetails.onlineAmount : 0)
          : (payment.status === 'completed' ? (payment.amount || pricing.totalAmount) : 0);
        const vehicleName = b.vehicle?.pricingReference?.vehicleModel || b.vehicle?.brand || 'Vehicle';
        const distance = b.tripDetails?.distance;

        return (
          <div className="fixed inset-0 z-[105] flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-2 py-2.5 flex items-center gap-1 shadow-xs">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900">Booking Details</h2>
                <p className="text-xs text-gray-500">#{b.bookingNumber}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl mx-auto w-full pb-6">
              {/* Status */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${statusStyle}`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Booked on</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>

              {/* Cancellation request */}
              {b.status === 'cancellation_requested' && b.cancellation && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 text-sm space-y-1.5">
                  <p className="font-semibold text-orange-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Cancellation request{' '}
                    {b.cancellation.requestStatus === 'pending' ? 'under review' : b.cancellation.requestStatus}
                  </p>
                  {b.cancellation.requestedAt && (
                    <p className="text-orange-700 text-xs">Requested on {new Date(b.cancellation.requestedAt).toLocaleDateString()}</p>
                  )}
                  {b.cancellation.requestReason && (
                    <p className="text-orange-800 text-xs">Reason: {b.cancellation.requestReason}</p>
                  )}
                </div>
              )}

              {/* Refund */}
              {b.status === 'cancelled' && b.cancellation && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-sm space-y-1.5">
                  <p className="font-semibold text-red-800 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4" /> Refund {b.cancellation.refundStatus || 'pending'}
                  </p>
                  {b.cancellation.refundAmount ? (
                    <p className="text-red-700 text-xs">Amount: ₹{b.cancellation.refundAmount}</p>
                  ) : null}
                  {b.cancellation.refundCompletedAt && (
                    <p className="text-red-700 text-xs">Completed on {new Date(b.cancellation.refundCompletedAt).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {/* Trip */}
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
                      <p className="text-sm font-semibold text-gray-900">{getPickupAddress(b)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Drop</p>
                      <p className="text-sm font-semibold text-gray-900">{getDestinationAddress(b)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {formatDate(getBookingDate(b))}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {formatTime(getBookingTime(b))}
                  </span>
                  {distance ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {Number(distance).toFixed(1)} km
                    </span>
                  ) : null}
                  {isRoundTrip(b) && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                      Round trip{getReturnDate(b) ? ` • back ${formatDate(getReturnDate(b))}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Vehicle & driver */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs divide-y divide-gray-100">
                <div className="p-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{vehicleName}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {[b.vehicle?.pricingReference?.vehicleType, b.vehicle?.type].filter(Boolean).join(' • ') || 'Vehicle'}
                    </p>
                  </div>
                  {b.vehicle?.registrationNumber && (
                    <span className="px-2 py-1 rounded-md border border-gray-300 bg-gray-50 text-xs font-mono font-bold text-gray-800">
                      {b.vehicle.registrationNumber}
                    </span>
                  )}
                </div>
                <div className="p-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Driver</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {[b.driver?.firstName, b.driver?.lastName].filter(Boolean).join(' ') || 'To be assigned'}
                    </p>
                  </div>
                  {b.driver?.phone && (
                    <a
                      href={`tel:${b.driver.phone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                </div>
              </div>

              {/* Rating & Review if completed */}
              {b.status === 'completed' && (
                b.rating?.stars ? (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>Your Trip Rating & Review</span>
                      </p>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        ★ {b.rating.stars} / 5
                      </span>
                    </div>
                    {b.rating.review && (
                      <p className="text-xs text-gray-700 italic bg-slate-50 p-3 rounded-xl border border-gray-100">
                        "{b.rating.review}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                        <span>How was your trip?</span>
                      </p>
                      <p className="text-[11px] text-gray-600 truncate">Share rating and feedback for the driver</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shrink-0 h-8 px-3"
                      onClick={() => {
                        setRatingBooking(b);
                        setRatingStars(0);
                        setRatingReview('');
                      }}
                    >
                      <Star className="w-3.5 h-3.5 mr-1 fill-white" />
                      Rate Trip
                    </Button>
                  </div>
                )
              )}

              {/* Payment */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5 text-sm">
                <h3 className="font-bold text-gray-900">Payment Summary</h3>
                <div className="flex justify-between gap-3 text-gray-600">
                  <span>
                    {distance && pricing.ratePerKm ? `Trip fare (${Number(distance).toFixed(1)} km × 2 × ₹${pricing.ratePerKm})` : 'Trip fare'}
                  </span>
                  <span className="text-gray-900 font-medium">₹{fare.toLocaleString()}</span>
                </div>
                {platformFee > 0 && (
                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Platform fee</span>
                    <span className="text-gray-900 font-medium">₹{platformFee.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between gap-3 text-emerald-700">
                    <span>Coupon{pricing.couponCode ? ` (${pricing.couponCode})` : ''}</span>
                    <span className="font-medium">−₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2.5 border-t border-gray-100">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900 text-base">₹{(pricing.totalAmount || 0).toLocaleString()}</span>
                </div>
                {paidOnline > 0 && (
                  <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2">
                    <span className="text-emerald-700 font-medium">Paid online</span>
                    <span className="text-emerald-700 font-bold">₹{paidOnline.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom action */}
            <div className="bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <div className="max-w-2xl mx-auto">
                <Button
                  onClick={() => downloadReceipt(b)}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm"
                  disabled={isDownloading}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isDownloading ? 'Downloading...' : 'Download Receipt'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rate Trip Modal */}
      <Dialog open={!!ratingBooking} onOpenChange={(open) => {
        if (!open) {
          setRatingBooking(null);
          setRatingStars(0);
          setRatingReview('');
        }
      }}>
        <DialogContent className="max-w-sm w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-bold">Rate your trip</DialogTitle>
          </DialogHeader>
          {ratingBooking && (
            <div className="space-y-4">
              <p className="text-sm text-center text-gray-600">
                How was your ride with{' '}
                <span className="font-semibold text-gray-900">
                  {[ratingBooking.driver?.firstName, ratingBooking.driver?.lastName].filter(Boolean).join(' ') || 'your driver'}
                </span>?
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingStars(n)}
                    className="p-1 transition-transform active:scale-90 cursor-pointer"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  >
                    <Star className={`w-9 h-9 ${n <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-200'}`} />
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-gray-500 font-semibold h-4">
                {['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'][ratingStars]}
              </p>

              {/* Review Input Field */}
              <div className="space-y-1.5 text-left pt-1">
                <label className="text-xs font-semibold text-gray-700">
                  Write a review (Optional)
                </label>
                <Textarea
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  placeholder="Share details about vehicle cleanliness, driver behavior, driving, or punctuality..."
                  maxLength={500}
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white resize-none text-gray-900 placeholder:text-gray-400"
                />
                <div className="text-[10px] text-gray-400 text-right">
                  {ratingReview.length}/500
                </div>
              </div>

              <Button
                onClick={submitRating}
                disabled={ratingStars < 1 || isSubmittingRating}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                {isSubmittingRating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Rating & Review
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md w-[95vw] p-4 md:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg md:text-xl">Request Cancellation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Are you sure you want to request cancellation for your booking from {selectedBooking ? getPickupAddress(selectedBooking) : 'Pickup'} to {selectedBooking ? getDestinationAddress(selectedBooking) : 'Destination'}?
              </p>
              
              {selectedBooking && isRoundTrip(selectedBooking) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">↔</span>
                    </div>
                    <span className="text-blue-800 font-medium text-sm">Round Trip</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    {formatDate(getBookingDate(selectedBooking))} → {getReturnDate(selectedBooking) ? formatDate(getReturnDate(selectedBooking)) : 'N/A'}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                This will submit a cancellation request for admin review. You'll be notified once it's processed.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Keep Booking
              </Button>
              <Button 
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                onClick={confirmCancelBooking}
              >
                Request Cancellation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UserBottomNavigation />
    </div>
  );
};

export default Bookings; 