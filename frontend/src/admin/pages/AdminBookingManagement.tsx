import { useState, useEffect } from "react";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  MapPin, 
  User, 
  Car, 
  Bus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Star,
  Phone,
  Mail,
  Navigation,
  CalendarDays,
  Ban,
  RotateCcw,
  X,
  CreditCard,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Download,
  Tag
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { adminBookings } from "@/services/adminApi";
import * as XLSX from 'xlsx';
import { formatDate, formatTime } from "@/lib/utils";
import { calculateDistance } from "@/lib/distanceUtils";

interface Booking {
  _id: string;
  bookingNumber: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  vehicle: {
    _id: string;
    type: 'car' | 'bus' | 'auto';
    brand: string;
    model: string;
    registrationNumber: string;
  };
  tripDetails: {
    pickup: {
      address: string;
      latitude: number;
      longitude: number;
    };
    destination: {
      address: string;
      latitude: number;
      longitude: number;
    };
    date: string;
    time: string;
    passengers: number;
    distance: number;
    duration: number;
  };
  pricing: {
    ratePerKm: number;
    totalAmount: number;
    tripType: 'one-way' | 'return';
    discount?: number;
    couponCode?: string;
    platformFee?: number;
  };
  status: 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled' | 'cancellation_requested';
  payment: {
    method: 'cash' | 'upi' | 'netbanking' | 'card' | 'razorpay';
    status: 'pending' | 'completed' | 'failed';
    transactionId?: string;
    completedAt?: string;
    amount?: number;
    isPartialPayment?: boolean;
    partialPaymentDetails?: {
      onlineAmount: number;
      cashAmount: number;
      onlinePaymentStatus: 'pending' | 'completed' | 'failed';
      cashPaymentStatus: 'pending' | 'collected' | 'not_collected';
      onlinePaymentId?: string;
      cashCollectedAt?: string;
      cashCollectedBy?: string;
      cashCollectedByModel?: 'Driver' | 'Admin';
    };
  };
  cancellation?: {
    cancelledBy: string;
    cancelledByModel: 'User' | 'Driver' | 'Admin';
    cancelledAt: string;
    reason: string;
    refundAmount: number;
    refundStatus: 'pending' | 'processed' | 'completed' | 'initiated';
  };
  statusHistory: Array<{
    status: string;
    timestamp: string;
    updatedBy: string;
    updatedByModel: string;
    reason?: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PaymentDetails {
  booking: Booking;
  payments: Array<{
    _id: string;
    label?: string; // Advance Payment / Remaining Payment / Full Payment
    amount: number;
    method: string | null; // null while remaining cash is not collected yet
    paidVia?: string | null; // upi / card / netbanking
    status: string;
    transactionId?: string;
    paymentDetails: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };
    refund?: {
      amount: number;
      reason: string;
      refundedAt: string;
      refundId: string;
      gatewayRefundId?: string;
    };
    createdAt: string;
  }>;
  refundDetails?: any;
  canProcessRefund: boolean;
}

// YYYY-MM-DD of the local calendar day (toISOString gives the UTC day, wrong before 5:30 AM IST)
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const AdminBookingManagement = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get pricing - use stored booking price instead of recalculating
  const getBookingPricing = (booking: any) => {
    // Use the stored booking price instead of recalculating
    // This ensures consistency with the original booking amount
    if (booking.pricing && booking.pricing.totalAmount) {
      return {
        ...booking.pricing,
        totalAmount: booking.pricing.totalAmount,
        ratePerKm: booking.pricing.ratePerKm || 0,
        discount: booking.pricing.discount || 0,
        couponCode: booking.pricing.couponCode || '',
        platformFee: booking.pricing.platformFee || 0,
        distance: booking.tripDetails?.distance || 0,
        tripType: booking.tripDetails?.tripType || 'one-way'
      };
    }
    
    // Fallback: return safe default if no pricing data
    return {
      totalAmount: 0,
      ratePerKm: 0,
      discount: 0,
      couponCode: '',
      platformFee: 0,
      distance: booking.tripDetails?.distance || 0,
      tripType: booking.tripDetails?.tripType || 'one-way'
    };
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [routeBooking, setRouteBooking] = useState<Booking | null>(null); // booking whose pickup/drop modal is open
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  // Refund form state
  const [refundMethod, setRefundMethod] = useState<'razorpay' | 'manual'>('razorpay');
  const [refundReason, setRefundReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Status update form state

  // Status/payment/date filters and search all run on the server across every booking (they used to
  // filter only the 10 rows of the current page). Search is debounced; a filter change goes back to page 1.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const filterKey = [statusFilter, paymentFilter, dateFilter, debouncedSearch].join('|');
  const [loadedFilterKey, setLoadedFilterKey] = useState(filterKey);
  useEffect(() => {
    if (filterKey !== loadedFilterKey && currentPage !== 1) {
      setLoadedFilterKey(filterKey);
      setCurrentPage(1); // the page change triggers the load
      return;
    }
    setLoadedFilterKey(filterKey);
    loadBookings();
  }, [currentPage, filterKey]);

  // Server-side filter params shared by the list and the export
  const serverFilters = () => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    paymentStatus: paymentFilter === 'all' ? undefined : paymentFilter,
    search: debouncedSearch || undefined,
    startDate: dateFilter === 'all' ? undefined : getDateFilterValue(dateFilter),
    endDate: dateFilter === 'all' ? undefined : localDay(new Date())
  });

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const response = await adminBookings.getAll({
        page: currentPage,
        limit: itemsPerPage,
        ...serverFilters()
      });

      if (response.success) {
        // Handle the real API response structure
        const rawBookings = response.data.docs || response.data || [];

        // Normalize to prevent undefined access crashes in render
        const bookingsData = (Array.isArray(rawBookings) ? rawBookings : [])
          .map((booking: any) => {
            const safeUser = booking?.user ?? {
              _id: 'unknown',
              firstName: 'Unknown',
              lastName: 'User',
              phone: 'N/A',
              email: ''
            };

            const safeDriver = booking?.driver ?? {
              _id: 'unknown',
              firstName: 'Not',
              lastName: 'Assigned',
              phone: 'N/A',
              email: ''
            };

            const safeVehicle = booking?.vehicle ?? {
              _id: 'unknown',
              type: 'car',
              brand: 'N/A',
              model: '',
              registrationNumber: 'N/A'
            };

            const safeTripDetails = booking?.tripDetails ?? {
              pickup: { address: 'N/A', latitude: 0, longitude: 0 },
              destination: { address: 'N/A', latitude: 0, longitude: 0 },
              date: new Date().toISOString().split('T')[0],
              time: '00:00',
              passengers: 0,
              distance: 0,
              duration: 0
            };

            const safePricing = booking?.pricing ?? {
              ratePerKm: 0,
              totalAmount: 0,
              tripType: 'one-way'
            };

            const safePayment = booking?.payment ?? {
              method: 'cash',
              status: 'pending',
              isPartialPayment: false,
            };

            // Ensure partialPaymentDetails structure when flagged
            if (safePayment.isPartialPayment && !safePayment.partialPaymentDetails) {
              safePayment.partialPaymentDetails = {
                onlineAmount: 0,
                cashAmount: 0,
                onlinePaymentStatus: 'pending',
                cashPaymentStatus: 'pending',
              };
            }

            return {
              bookingNumber: booking?.bookingNumber ?? 'N/A',
              status: booking?.status ?? 'pending',
              createdAt: booking?.createdAt ?? new Date().toISOString(),
              updatedAt: booking?.updatedAt ?? new Date().toISOString(),
              ...booking,
              user: safeUser,
              driver: safeDriver,
              vehicle: safeVehicle,
              tripDetails: safeTripDetails,
              pricing: safePricing,
              payment: safePayment,
            };
          });

        setBookings(bookingsData);
        setTotalPages(response.data.totalPages || response.data.pages || 1);
        setFilteredBookings(bookingsData);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load bookings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDateFilterValue = (filter: string): string => {
    const today = new Date();
    switch (filter) {
      case 'today':
        return localDay(today);
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return localDay(weekAgo);
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
        return localDay(monthAgo);
      default:
        return localDay(today);
    }
  };

  const getStartDate = (filter: string): string => {
    const today = new Date();
    switch (filter) {
      case 'today':
        return localDay(today);
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return localDay(weekAgo);
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
        return localDay(monthAgo);
      default:
        return localDay(today);
    }
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              Pending
            </div>
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Accepted
            </div>
          </Badge>
        );
      case 'started':
        return (
          <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              Started
            </div>
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Completed
            </div>
          </Badge>
        );
      case 'cancellation_requested':
        return (
          <Badge className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Cancellation Requested
            </div>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Cancelled
            </div>
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              Pending
            </div>
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Paid
            </div>
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200 px-3 py-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Failed
            </div>
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'bus': return <Bus className="w-4 h-4" />;
      case 'auto': return <Car className="w-4 h-4" />;
      default: return <Car className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not specified';
    return timeString;
  };

  const formatCurrency = (amount: number) => {
    const num = Number(amount) || 0;
    if (Number.isInteger(num)) {
      return `₹${num.toLocaleString('en-IN')}`;
    }
    return `₹${Number(num.toFixed(2)).toLocaleString('en-IN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    })}`;
  };

  const getPaymentStatusDisplay = (booking: Booking) => {
    if (!booking.payment) return null;
    
    if (booking.payment.isPartialPayment) {
      const { onlinePaymentStatus, cashPaymentStatus, onlineAmount, cashAmount } = booking.payment.partialPaymentDetails || {};
      
      return (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700">Partial Payment:</div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              onlinePaymentStatus === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-600">
              Online: ₹{onlineAmount} ({onlinePaymentStatus === 'completed' ? 'Paid' : 'Pending'})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              cashPaymentStatus === 'collected' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-600">
              Cash: ₹{cashAmount} ({cashPaymentStatus === 'collected' ? 'Collected' : 'Pending'})
            </span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-xs text-gray-600">
        {booking.payment.method.toUpperCase()}: {booking.payment.status === 'completed' ? 'Completed' : 'Pending'}
      </div>
    );
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleViewPayment = async (booking: Booking) => {
    try {
      const response = await adminBookings.getPaymentDetails(booking._id);
      if (response.success) {
        // Handle the real API response structure
        const paymentData = response.data || response;
        setPaymentDetails(paymentData || []);
        setShowPaymentDetails(true);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load payment details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading payment details:', error);
      toast({
        title: "Error",
        description: "Failed to load payment details. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRefund = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowRefundModal(true);
  };

  const handleApproveCancellation = async (booking: Booking) => {
    try {
      const response = await adminBookings.approveCancellationRequest(booking._id);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Cancellation request approved successfully",
        });
        loadBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to approve cancellation request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error approving cancellation request:', error);
      toast({
        title: "Error",
        description: "Failed to approve cancellation request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectCancellation = async (booking: Booking) => {
    try {
      const response = await adminBookings.rejectCancellationRequest(booking._id);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Cancellation request rejected successfully",
        });
        loadBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to reject cancellation request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error rejecting cancellation request:', error);
      toast({
        title: "Error",
        description: "Failed to reject cancellation request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInitiateRefund = async (booking: Booking) => {
    const amount = booking.cancellation?.refundAmount || 0;
    if (!window.confirm(`Refund ₹${amount} to the customer for booking ${booking.bookingNumber}?`)) return;
    try {
      // Refunds exactly what the customer paid online via Razorpay
      const response = await adminBookings.processRefund(booking._id, 'razorpay', 'Booking cancelled by admin');

      if (response.success) {
        toast({
          title: "Refunded",
          description: response.message || "Refund processed successfully",
        });
        loadBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to process refund",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      
      // Show more specific error messages
      let errorMessage = "Failed to process refund. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!window.confirm(`Cancel booking ${booking.bookingNumber}? You can refund the customer after cancelling.`)) return;
    try {
      const response = await adminBookings.cancel(booking._id, 'Cancelled by admin');
      if (response.success) {
        toast({ title: "Booking Cancelled", description: "Use the refund button to return the customer's payment." });
        loadBookings();
      } else {
        toast({ title: "Error", description: response.message || "Failed to cancel booking", variant: "destructive" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const processRefund = async () => {
    if (!selectedBooking) return;

    try {
      setIsProcessingRefund(true);
      const response = await adminBookings.processRefund(
        selectedBooking._id,
        refundMethod,
        refundReason,
        adminNotes
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `Refund processed successfully via ${refundMethod}`,
        });
        setShowRefundModal(false);
        setRefundReason('');
        setAdminNotes('');
        loadBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to process refund",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: "Error",
        description: "Failed to process refund. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const exportToExcel = async () => {
    try {
      // Show loading state
      toast({
        title: "Exporting...",
        description: "Preparing data for export. Please wait.",
      });

      // Get all bookings data without pagination using the export API
      const response = await adminBookings.exportAll({
        ...serverFilters(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch data for export');
      }

      const allBookings = response.data || [];

      // Prepare data for export
      const exportData = allBookings.map(booking => ({
        'Booking Number': booking.bookingNumber,
        'Status': booking.status,
        'Date': formatDate(booking.tripDetails.date),
        'Time': formatTime(booking.tripDetails.time),
        'Customer Name': `${booking.user.firstName} ${booking.user.lastName}`,
        'Customer Phone': booking.user.phone,
        'Customer Email': booking.user.email || 'N/A',
        'Driver Name': `${booking.driver.firstName} ${booking.driver.lastName}`,
        'Driver Phone': booking.driver.phone,
        'Driver Email': booking.driver.email || 'N/A',
        'Vehicle Type': booking.vehicle.type,
        'Vehicle Brand': booking.vehicle.brand,
        'Vehicle Model': booking.vehicle.model,
        'Registration Number': booking.vehicle.registrationNumber,
        'Pickup Address': booking.tripDetails.pickup.address,
        'Destination Address': booking.tripDetails.destination.address,
        'Passengers': booking.tripDetails.passengers,
        'Distance (km)': booking.tripDetails.distance,
        'Duration (min)': booking.tripDetails.duration,
        'Rate per km': formatCurrency(getBookingPricing(booking).ratePerKm),
        'Total Amount': formatCurrency(getBookingPricing(booking).totalAmount),
        'Discount': getBookingPricing(booking).discount ? formatCurrency(getBookingPricing(booking).discount) : 'N/A',
        'Coupon Code': getBookingPricing(booking).couponCode || 'N/A',
        'Trip Type': booking.pricing.tripType,
        'Payment Method': booking.payment.method,
        'Payment Status': booking.payment.status,
        'Transaction ID': booking.payment.transactionId || 'N/A',
        'Payment Completed At': booking.payment.completedAt ? formatDate(booking.payment.completedAt) : 'N/A',
        'Is Partial Payment': booking.payment.isPartialPayment ? 'Yes' : 'No',
        'Online Amount': booking.payment.isPartialPayment && booking.payment.partialPaymentDetails ? formatCurrency(booking.payment.partialPaymentDetails.onlineAmount) : 'N/A',
        'Cash Amount': booking.payment.isPartialPayment && booking.payment.partialPaymentDetails ? formatCurrency(booking.payment.partialPaymentDetails.cashAmount) : 'N/A',
        'Online Payment Status': booking.payment.isPartialPayment && booking.payment.partialPaymentDetails ? booking.payment.partialPaymentDetails.onlinePaymentStatus : 'N/A',
        'Cash Payment Status': booking.payment.isPartialPayment && booking.payment.partialPaymentDetails ? booking.payment.partialPaymentDetails.cashPaymentStatus : 'N/A',
        'Cancellation Reason': booking.cancellation ? booking.cancellation.reason : 'N/A',
        'Cancelled By': booking.cancellation ? `${booking.cancellation.cancelledByModel}: ${booking.cancellation.cancelledBy}` : 'N/A',
        'Cancelled At': booking.cancellation ? formatDate(booking.cancellation.cancelledAt) : 'N/A',
        'Refund Amount': booking.cancellation ? formatCurrency(booking.cancellation.refundAmount) : 'N/A',
        'Refund Status': booking.cancellation ? booking.cancellation.refundStatus : 'N/A',
        'Created At': formatDate(booking.createdAt),
        'Last Updated': booking.statusHistory && booking.statusHistory.length > 0 ? formatDate(booking.statusHistory[booking.statusHistory.length - 1].timestamp) : 'N/A'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const columnWidths = [
        { wch: 15 }, // Booking Number
        { wch: 12 }, // Status
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 20 }, // Customer Name
        { wch: 15 }, // Customer Phone
        { wch: 25 }, // Customer Email
        { wch: 20 }, // Driver Name
        { wch: 15 }, // Driver Phone
        { wch: 25 }, // Driver Email
        { wch: 12 }, // Vehicle Type
        { wch: 15 }, // Vehicle Brand
        { wch: 15 }, // Vehicle Model
        { wch: 20 }, // Registration Number
        { wch: 30 }, // Pickup Address
        { wch: 30 }, // Destination Address
        { wch: 10 }, // Passengers
        { wch: 12 }, // Distance
        { wch: 12 }, // Duration
        { wch: 15 }, // Rate per km
        { wch: 15 }, // Total Amount
        { wch: 12 }, // Trip Type
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Payment Status
        { wch: 25 }, // Transaction ID
        { wch: 20 }, // Payment Completed At
        { wch: 15 }, // Is Partial Payment
        { wch: 15 }, // Online Amount
        { wch: 15 }, // Cash Amount
        { wch: 20 }, // Online Payment Status
        { wch: 20 }, // Cash Payment Status
        { wch: 25 }, // Cancellation Reason
        { wch: 20 }, // Cancelled By
        { wch: 15 }, // Cancelled At
        { wch: 15 }, // Refund Amount
        { wch: 15 }, // Refund Status
        { wch: 15 }, // Created At
        { wch: 15 }  // Last Updated
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');

      // Generate filename with current date and filters
      const currentDate = new Date().toISOString().split('T')[0];
      let filename = `chalo-sawari-bookings-${currentDate}`;
      
      if (statusFilter !== 'all') {
        filename += `-${statusFilter}`;
      }
      if (dateFilter !== 'all') {
        filename += `-${dateFilter}`;
      }
      
      filename += '.xlsx';

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${exportData.length} bookings to Excel file: ${filename}`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "Failed to export bookings to Excel. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    active: bookings.filter(b => ['accepted', 'started'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    cancellationRequests: bookings.filter(b => b.status === 'cancellation_requested').length,
    paid: bookings.filter(b => b.payment.status === 'completed').length,
    pendingPayment: bookings.filter(b => b.payment.status === 'pending').length,
    partialPayments: bookings.filter(b => b.payment.isPartialPayment).length
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Enhanced Header Section */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                      Booking Management
                    </h1>
                    <p className="mt-1 sm:mt-2 text-base sm:text-lg text-gray-600">
                      Comprehensive oversight of all vehicle bookings, payments, and customer interactions
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={exportToExcel}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">Export to Excel</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">All Bookings</h3>
                  <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium rounded-full">
                    {filteredBookings.length} bookings
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              </div>

              {/* Filters: all applied on the server, across every booking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Booking no., name, phone, vehicle no."
                  className="h-10"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="started">Started</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancellation_requested">Cancellation requested</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Payment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    <SelectItem value="completed">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Advance (partial)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Date" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any date</SelectItem>
                    <SelectItem value="today">Booked today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-4">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">Loading Bookings</p>
                  <p className="text-sm sm:text-base text-gray-600">Please wait while we fetch your data...</p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Bookings Found</p>
                  <p className="text-sm sm:text-base text-gray-600">Try adjusting your filters or search criteria</p>
                </div>
              ) : (
                 <div className="overflow-x-auto -mx-4 sm:mx-0">
                   <div className="min-w-[1200px] sm:min-w-0">
                     <Table>
                       <TableHeader>
                         <TableRow className="bg-gray-50 hover:bg-gray-50">
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Booking #</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Customer</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Driver</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Vehicle</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Trip Details</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm text-center whitespace-nowrap">See Location</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Amount</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Advance</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Remaining</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm whitespace-nowrap">Booking Status</TableHead>
                           <TableHead className="font-semibold text-gray-900 py-4 text-xs sm:text-sm">Actions</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {filteredBookings.map((booking, index) => (
                           <TableRow 
                             key={booking._id} 
                             className={`hover:bg-blue-50/50 transition-colors duration-150 ${
                               index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                             }`}
                           >
                             <TableCell className="py-4">
                               <div className="font-mono font-semibold text-blue-600 text-xs sm:text-sm">
                                 {booking.bookingNumber}
                               </div>
                             </TableCell>
                             <TableCell className="py-4">
                               <div className="space-y-1">
                                 <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                   {booking.user.firstName} {booking.user.lastName}
                                 </p>
                                 <p className="text-xs text-gray-600 flex items-center gap-1">
                                   <Phone className="w-3 h-3" />
                                   {booking.user.phone}
                                 </p>
                                 {booking.user.email && (
                                   <p className="text-xs text-gray-500 flex items-center gap-1">
                                     <Mail className="w-3 h-3" />
                                     {booking.user.email}
                                   </p>
                                 )}
                               </div>
                             </TableCell>
                             <TableCell className="py-4">
                               <div className="space-y-1">
                                 <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                   {booking.driver.firstName} {booking.driver.lastName}
                                 </p>
                                 <p className="text-xs text-gray-600 flex items-center gap-1">
                                   <Phone className="w-3 h-3" />
                                   {booking.driver.phone}
                                 </p>
                               </div>
                             </TableCell>
                             <TableCell className="py-4">
                               <div className="flex items-center gap-3">
                                 <div className="p-2 bg-gray-100 rounded-lg">
                                   {getVehicleIcon(booking.vehicle.type)}
                                 </div>
                                 <div className="space-y-1">
                                   <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                     {booking.vehicle.brand} {booking.vehicle.model}
                                   </p>
                                   <p className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                     {booking.vehicle.registrationNumber}
                                   </p>
                                 </div>
                               </div>
                             </TableCell>
                             <TableCell className="py-4">
                               <div className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                                 <p className="font-medium text-gray-900">{formatDate(booking.tripDetails.date)}</p>
                                 <p className="text-gray-500">{formatTime(booking.tripDetails.time)}</p>
                               </div>
                             </TableCell>
                             <TableCell className="py-4 text-center">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setRouteBooking(booking)}
                                 className="h-8 w-8 p-0"
                                 title="View pickup & destination"
                               >
                                 <Eye className="w-4 h-4 text-blue-600" />
                               </Button>
                             </TableCell>
                             <TableCell className="py-4">
                               {(() => {
                                 const pricing = getBookingPricing(booking);
                                 const discount = pricing.discount || 0;
                                 const couponCode = pricing.couponCode;
                                 const hasDiscount = discount > 0;
                                 const originalAmount = pricing.totalAmount + discount;

                                 return (
                                   <div className="text-right">
                                     <div className="flex items-baseline justify-end gap-1.5">
                                       {hasDiscount && (
                                         <span className="text-xs text-gray-400 line-through">
                                           {formatCurrency(originalAmount)}
                                         </span>
                                       )}
                                       <p className="font-bold text-base sm:text-lg text-gray-900">
                                         {formatCurrency(pricing.totalAmount)}
                                       </p>
                                     </div>
                                     <p className="text-xs text-gray-500">
                                       {formatCurrency(pricing.ratePerKm)}/km
                                     </p>
                                     {hasDiscount && (
                                       <div className="mt-1 flex items-center justify-end">
                                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-[11px] font-semibold">
                                           <Tag className="w-2.5 h-2.5" />
                                           <span>Discount: -{formatCurrency(discount)}</span>
                                           {couponCode && <span className="font-mono text-[10px] text-emerald-800">({couponCode})</span>}
                                         </span>
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}
                             </TableCell>
                             {(() => {
                               // Advance = paid online at booking; Remaining = cash still due to the driver
                               const p = booking.payment;
                               const partial = p.isPartialPayment ? p.partialPaymentDetails : undefined;
                               const total = getBookingPricing(booking).totalAmount;
                               const advance = partial ? partial.onlineAmount : (p.status === 'completed' ? (p.amount || total) : 0);
                               const advancePaid = partial ? partial.onlinePaymentStatus === 'completed' : p.status === 'completed';
                               const remaining = partial ? partial.cashAmount : total - advance;
                               const remainingDone = partial ? partial.cashPaymentStatus === 'collected' : remaining <= 0;
                               const tag = (ok: boolean, okText: string, pendingText: string) => (
                                 <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                                   {ok ? okText : pendingText}
                                 </span>
                               );
                               return (
                                 <>
                                   <TableCell className="py-4 whitespace-nowrap">
                                     <p className="font-semibold text-gray-900">{formatCurrency(advance)}</p>
                                     {tag(advancePaid, 'Paid', 'Pending')}
                                   </TableCell>
                                   <TableCell className="py-4 whitespace-nowrap">
                                     <p className="font-semibold text-gray-900">{formatCurrency(Math.max(remaining, 0))}</p>
                                     {remaining > 0 ? tag(remainingDone, 'Collected', 'Pending') : tag(true, 'Nil', 'Nil')}
                                   </TableCell>
                                 </>
                               );
                             })()}
                             <TableCell className="py-4">
                               {getStatusBadge(booking.status)}
                             </TableCell>
                             <TableCell className="py-4">
                               <div className="flex flex-nowrap items-center gap-1.5">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleViewDetails(booking)}
                                   className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                                   title="View Details"
                                 >
                                   <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleViewPayment(booking)}
                                   className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-green-50 hover:border-green-300"
                                   title="Payment Details"
                                 >
                                   <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                 </Button>
                                 {/* Cancellation Request Actions */}
                                 {booking.status === 'cancellation_requested' && (
                                   <>
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleApproveCancellation(booking)}
                                       className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-green-50 hover:border-green-300"
                                       title="Approve Cancellation"
                                     >
                                       <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleRejectCancellation(booking)}
                                       className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-50 hover:border-red-300"
                                       title="Reject Cancellation"
                                     >
                                       <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                                     </Button>
                                   </>
                                 )}

                                 {/* Cancel (admin) */}
                                 {['pending', 'accepted', 'started'].includes(booking.status) && (
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleCancelBooking(booking)}
                                     className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                     title="Cancel Booking"
                                   >
                                     <Ban className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                     Cancel
                                   </Button>
                                 )}

                                 {/* Refund after cancellation, then "Refunded" */}
                                 {booking.status === 'cancelled' &&
                                  booking.cancellation?.refundStatus === 'pending' && (
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleInitiateRefund(booking)}
                                     className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                                     title="Refund customer"
                                   >
                                     <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                     Refund
                                   </Button>
                                 )}
                                 {booking.status === 'cancelled' && booking.cancellation?.refundStatus === 'completed' && (
                                   <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
                                     <CheckCircle className="w-3.5 h-3.5" />
                                     Refunded{booking.cancellation.refundAmount ? ` ₹${booking.cancellation.refundAmount}` : ''}
                                   </span>
                                 )}

                               </div>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 pb-6 sm:pb-8">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-600 text-center sm:text-left">
                    Showing page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                    <span className="font-semibold text-gray-900">{totalPages}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 sm:px-4 py-2 h-9 sm:h-10 border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-sm"
                    >
                      <ChevronUp className="w-4 h-4 mr-2 rotate-90" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        if (totalPages <= 5) {
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`h-9 w-9 sm:h-10 sm:w-10 p-0 text-sm ${
                                currentPage === pageNum 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 sm:px-4 py-2 h-9 sm:h-10 border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-sm"
                    >
                      Next
                      <ChevronDown className="w-4 h-4 ml-2 rotate-90" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pickup & Destination Dialog */}
      <Dialog open={!!routeBooking} onOpenChange={(open) => !open && setRouteBooking(null)}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>Trip Route</DialogTitle>
          </DialogHeader>
          {routeBooking && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                #{routeBooking.bookingNumber} • {formatDate(routeBooking.tripDetails.date)} at {formatTime(routeBooking.tripDetails.time)}
                {routeBooking.tripDetails.distance ? ` • ${Number(routeBooking.tripDetails.distance).toFixed(1)} km` : ''}
              </p>
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="w-px flex-1 min-h-6 bg-gray-300 my-1" />
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pickup</p>
                    <p className="text-sm font-semibold text-gray-900">{routeBooking.tripDetails.pickup.address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Destination</p>
                    <p className="text-sm font-semibold text-gray-900">{routeBooking.tripDetails.destination.address}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Booking Details - {selectedBooking?.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Booking Number</Label>
                    <p className="mt-1 font-medium text-sm sm:text-base">{selectedBooking.bookingNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Total Amount</Label>
                    <div className="mt-1 flex items-baseline gap-2">
                      <p className="font-medium text-sm sm:text-base">{formatCurrency(getBookingPricing(selectedBooking).totalAmount)}</p>
                      {getBookingPricing(selectedBooking).discount > 0 && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatCurrency(getBookingPricing(selectedBooking).totalAmount + getBookingPricing(selectedBooking).discount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Trip Fare (2x)</Label>
                    <p className="mt-1 font-medium text-sm sm:text-base">
                      {formatCurrency(
                        Math.max(
                          0,
                          (getBookingPricing(selectedBooking).totalAmount || 0) +
                            (getBookingPricing(selectedBooking).discount || 0) -
                            (getBookingPricing(selectedBooking).platformFee || 0)
                        )
                      )}
                      {getBookingPricing(selectedBooking).distance > 0 && getBookingPricing(selectedBooking).ratePerKm > 0 && (
                        <span className="text-xs text-gray-500 font-normal ml-1.5">
                          ({getBookingPricing(selectedBooking).distance} km × 2 × {formatCurrency(getBookingPricing(selectedBooking).ratePerKm)})
                        </span>
                      )}
                    </p>
                  </div>
                  {getBookingPricing(selectedBooking).platformFee > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Platform Fee</Label>
                      <p className="mt-1 font-medium text-sm sm:text-base">
                        {formatCurrency(getBookingPricing(selectedBooking).platformFee)}
                      </p>
                    </div>
                  )}
                  {getBookingPricing(selectedBooking).discount > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-emerald-700">Coupon Discount</Label>
                      <p className="mt-1 font-semibold text-sm sm:text-base text-emerald-700">
                        -{formatCurrency(getBookingPricing(selectedBooking).discount)}
                        {getBookingPricing(selectedBooking).couponCode && ` (${getBookingPricing(selectedBooking).couponCode})`}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Rate per KM</Label>
                    <p className="mt-1 font-medium text-sm sm:text-base">{formatCurrency(getBookingPricing(selectedBooking).ratePerKm)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created At</Label>
                    <p className="mt-1 font-medium text-sm sm:text-base">{formatDate(selectedBooking.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="mt-1 font-medium">
                      {selectedBooking.user.firstName} {selectedBooking.user.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                    <p className="mt-1 font-medium">{selectedBooking.user.phone}</p>
                  </div>
                  {selectedBooking.user.email && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Email</Label>
                      <p className="mt-1 font-medium">{selectedBooking.user.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Driver Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="mt-1 font-medium">
                      {selectedBooking.driver.firstName} {selectedBooking.driver.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                    <p className="mt-1 font-medium">{selectedBooking.driver.phone}</p>
                  </div>
                  {selectedBooking.driver.email && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Email</Label>
                      <p className="mt-1 font-medium">{selectedBooking.driver.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Vehicle Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Type</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {getVehicleIcon(selectedBooking.vehicle.type)}
                      <span className="font-medium capitalize">{selectedBooking.vehicle.type}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Brand & Model</Label>
                    <p className="mt-1 font-medium">
                      {selectedBooking.vehicle.brand} {selectedBooking.vehicle.model}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Registration</Label>
                    <p className="mt-1 font-medium">{selectedBooking.vehicle.registrationNumber}</p>
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Trip Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Pickup Location</Label>
                    <p className="mt-1 font-medium">{selectedBooking.tripDetails.pickup.address}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Destination</Label>
                    <p className="mt-1 font-medium">{selectedBooking.tripDetails.destination.address}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Date & Time</Label>
                    <p className="mt-1 font-medium">
                      {formatDate(selectedBooking.tripDetails.date)} at {formatTime(selectedBooking.tripDetails.time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Passengers</Label>
                    <p className="mt-1 font-medium">{selectedBooking.tripDetails.passengers}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Distance</Label>
                    <p className="mt-1 font-medium">{selectedBooking.tripDetails.distance} km</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Duration</Label>
                    <p className="mt-1 font-medium">{selectedBooking.tripDetails.duration} minutes</p>
                  </div>
                </div>
              </div>

              {/* Status History */}
              {selectedBooking.statusHistory && selectedBooking.statusHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Status History</h3>
                  <div className="space-y-3">
                    {selectedBooking.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium capitalize">{history.status}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(history.timestamp)} - {history.updatedByModel}
                          </p>
                          {history.reason && (
                            <p className="text-sm text-gray-600 mt-1">{history.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancellation Details */}
              {selectedBooking.cancellation && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Cancellation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Cancelled By</Label>
                      <p className="mt-1 font-medium capitalize">{selectedBooking.cancellation.cancelledByModel}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Reason</Label>
                      <p className="mt-1 font-medium">{selectedBooking.cancellation.reason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Payment Details - {paymentDetails?.booking.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          {paymentDetails && (
            <div className="space-y-6">
              {/* Payment Information */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-900">Payment Information</h3>
                {paymentDetails.payments && paymentDetails.payments.length > 0 ? (
                  <div className="space-y-4">
                    {paymentDetails.payments.map((payment, index) => (
                      <div key={index} className="border rounded-lg p-3 sm:p-4">
                        {payment.label && (
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-3 pb-2 border-b">{payment.label}</h4>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Amount</Label>
                            <p className="mt-1 font-medium text-sm sm:text-base">{formatCurrency(payment.amount)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Method</Label>
                            <p className="mt-1 font-medium capitalize text-sm sm:text-base">
                              {payment.method
                                ? `${payment.method}${payment.paidVia ? ` (${payment.paidVia.toUpperCase()})` : ''}`
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Status</Label>
                            <div className="mt-1">
                              {payment.method === 'cash' && payment.status === 'completed' ? (
                                <Badge className="bg-green-100 text-green-800 border border-green-200 px-3 py-1.5 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Collected
                                  </div>
                                </Badge>
                              ) : getPaymentStatusBadge(payment.status)}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Date</Label>
                            <p className="mt-1 font-medium text-sm sm:text-base">{payment.createdAt ? formatDate(payment.createdAt) : '—'}</p>
                          </div>
                          {payment.transactionId && (
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Transaction ID (Razorpay Payment ID)</Label>
                              <p className="mt-1 font-medium font-mono text-xs sm:text-sm break-all">{payment.transactionId}</p>
                            </div>
                          )}
                          {payment.paymentDetails?.razorpayOrderId && (
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Razorpay Order ID</Label>
                              <p className="mt-1 font-medium font-mono text-xs sm:text-sm break-all">{payment.paymentDetails.razorpayOrderId}</p>
                            </div>
                          )}
                        </div>

                        {/* Refund Information */}
                        {payment.refund && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Refund Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Refund Amount</Label>
                                <p className="mt-1 font-medium text-sm sm:text-base">{formatCurrency(payment.refund.amount)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Refund Reason</Label>
                                <p className="mt-1 font-medium text-sm sm:text-base">{payment.refund.reason}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Refund Date</Label>
                                <p className="mt-1 font-medium text-sm sm:text-base">{formatDate(payment.refund.refundedAt)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Refund ID</Label>
                                <p className="mt-1 font-medium font-mono text-xs sm:text-sm">{payment.refund.refundId}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm sm:text-base">No payment records found for this booking.</p>
                )}
              </div>

              {/* Refund Actions */}
              {paymentDetails.canProcessRefund && (
                <div className="border-t pt-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-900">Process Refund</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={() => {
                        setShowPaymentDetails(false);
                        setShowRefundModal(true);
                      }}
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Process Refund
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refundMethod">Refund Method</Label>
              <Select value={refundMethod} onValueChange={(value: 'razorpay' | 'manual') => setRefundMethod(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select refund method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay (Automatic)</SelectItem>
                  <SelectItem value="manual">Manual (Offline)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="refundReason">Refund Reason</Label>
              <Textarea
                id="refundReason"
                placeholder="Enter refund reason..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                placeholder="Enter admin notes (optional)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={processRefund}
                disabled={isProcessingRefund || !refundReason}
                className="flex-1"
              >
                {isProcessingRefund ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Process Refund
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRefundModal(false)}
                disabled={isProcessingRefund}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminBookingManagement;
