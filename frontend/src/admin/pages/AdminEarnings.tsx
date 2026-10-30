import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  TrendingUp,
  DollarSign,
  Car,
  Bus,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  Trophy,
  ArrowUpRight,
  Star
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { adminEarnings } from "@/services/adminApi";
import * as XLSX from "xlsx";

interface VehicleDriver {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

interface VehicleStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  grossRevenue: number;
  driverEarnings: number;
  totalPlatformFee: number;
  totalDiscount: number;
  netAdminProfit: number;
}

interface VehicleEarningsItem {
  _id: string;
  brand: string;
  model: string;
  vehicleType: string;
  category: "car" | "bus" | string;
  registrationNumber: string;
  image?: string;
  approvalStatus: string;
  driver: VehicleDriver | null;
  stats: VehicleStats;
}

interface OverallSummary {
  totalVehicles: number;
  totalAdminProfit: number;
  totalPlatformFee: number;
  totalDiscount: number;
  totalGrossRevenue: number;
  totalCompletedTrips: number;
  totalBookings: number;
  topVehicle: {
    _id: string;
    name: string;
    registrationNumber: string;
    profit: number;
    trips: number;
  } | null;
}

interface BookingBreakdown {
  _id: string;
  bookingNumber: string;
  createdAt: string;
  date: string;
  time: string;
  tripType: string;
  customer: {
    _id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  route: {
    pickup: string;
    destination: string;
    distance: number;
  };
  pricing: {
    totalAmount: number;
    platformFee: number;
    discount: number;
    couponCode?: string;
    adminProfit: number;
    driverFare: number;
  };
  status: string;
  rating?: {
    stars: number;
    review?: string;
    ratedAt?: string;
  } | null;
  payment: {
    method: string;
    status: string;
    isPartialPayment: boolean;
    cashPaymentStatus: string;
  };
}

interface VehicleDetailData {
  vehicle: {
    _id: string;
    brand: string;
    model: string;
    vehicleType: string;
    category: string;
    registrationNumber: string;
    image?: string;
    driver: VehicleDriver | null;
  };
  summary: {
    totalBookings: number;
    completedBookings: number;
    grossRevenue: number;
    totalPlatformFee: number;
    totalDiscount: number;
    netAdminProfit: number;
    driverEarnings: number;
  };
  bookings: BookingBreakdown[];
}

const AdminEarnings: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleEarningsItem[]>([]);
  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("profit_desc");

  // Modal State for Eye Icon (Single vehicle bookings breakdown)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleDetail, setVehicleDetail] = useState<VehicleDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>("");
  const [modalStatusFilter, setModalStatusFilter] = useState<string>("all");

  // Calculate date range from filter
  const getDateRange = (filter: string) => {
    if (filter === "all") return { startDate: undefined, endDate: undefined };
    const now = new Date();
    let start = new Date();

    if (filter === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (filter === "week") {
      start.setDate(now.getDate() - 7);
    } else if (filter === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0]
    };
  };

  const fetchEarnings = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      const res = await adminEarnings.getVehicleEarnings({
        search: searchTerm,
        type: typeFilter === "all" ? undefined : typeFilter,
        startDate,
        endDate,
        sortBy
      });

      if (res?.success && res.data) {
        setVehicles(res.data.vehicles || []);
        setSummary(res.data.summary || null);
      } else {
        toast({
          title: "Error fetching data",
          description: res?.message || "Could not load earnings data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error fetching vehicle earnings:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load vehicle earnings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [typeFilter, dateFilter, sortBy]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEarnings(true);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEarnings(true);
  };

  // Open detail modal on eye icon click
  const handleOpenDetailModal = async (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsModalOpen(true);
    setDetailLoading(true);
    setVehicleDetail(null);
    setModalSearchTerm("");
    setModalStatusFilter("all");

    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      const res = await adminEarnings.getVehicleBookingEarnings(vehicleId, {
        startDate,
        endDate
      });

      if (res?.success && res.data) {
        setVehicleDetail(res.data);
      } else {
        toast({
          title: "Error",
          description: res?.message || "Failed to load vehicle booking breakdown",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error loading vehicle booking details:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load vehicle details",
        variant: "destructive"
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtered bookings in modal
  const modalFilteredBookings = useMemo(() => {
    if (!vehicleDetail?.bookings) return [];
    return vehicleDetail.bookings.filter((b) => {
      const matchesStatus = modalStatusFilter === "all" || b.status === modalStatusFilter;
      const term = modalSearchTerm.trim().toLowerCase();
      if (!term) return matchesStatus;

      const matchesSearch =
        b.bookingNumber.toLowerCase().includes(term) ||
        b.customer.name.toLowerCase().includes(term) ||
        b.customer.phone.toLowerCase().includes(term) ||
        b.route.pickup.toLowerCase().includes(term) ||
        b.route.destination.toLowerCase().includes(term) ||
        (b.pricing.couponCode || "").toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [vehicleDetail, modalSearchTerm, modalStatusFilter]);

  // Export Vehicles Table to Excel
  const exportAllVehiclesToExcel = () => {
    if (vehicles.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no vehicles available to export.",
        variant: "destructive"
      });
      return;
    }

    const exportRows = vehicles.map((v) => ({
      "Vehicle Name": `${v.brand} ${v.model}`,
      "Type": v.category?.toUpperCase(),
      "Registration Number": v.registrationNumber,
      "Driver Name": v.driver?.name || "N/A",
      "Driver Phone": v.driver?.phone || "N/A",
      "Completed Trips": v.stats.completedBookings,
      "Total Bookings": v.stats.totalBookings,
      "Customer Gross Paid (₹)": v.stats.grossRevenue,
      "Admin Net Profit (₹)": v.stats.netAdminProfit
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Earnings");
    XLSX.writeFile(workbook, `Admin_Vehicle_Earnings_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export Successful",
      description: "Vehicle earnings data has been downloaded."
    });
  };

  // Export Individual Vehicle's Bookings Breakdown
  const exportVehicleBookingsToExcel = () => {
    if (!vehicleDetail || !vehicleDetail.bookings || vehicleDetail.bookings.length === 0) {
      toast({
        title: "No bookings to export",
        description: "This vehicle has no bookings to export.",
        variant: "destructive"
      });
      return;
    }

    const exportRows = vehicleDetail.bookings.map((b) => ({
      "Booking Number": b.bookingNumber,
      "Booking Date": b.date,
      "Time": b.time,
      "Customer Name": b.customer.name,
      "Customer Phone": b.customer.phone,
      "Pickup Address": b.route.pickup,
      "Destination Address": b.route.destination,
      "Distance (km)": b.route.distance,
      "Total Fare (₹)": b.pricing.totalAmount,
      "Driver Earning (₹)": b.pricing.driverFare,
      "Discount (₹)": b.pricing.discount || 0,
      "Coupon Code": b.pricing.couponCode || "None",
      "Admin Profit (₹)": b.pricing.adminProfit,
      "Status": b.status,
      "Payment Method": b.payment.method,
      "Payment Status": b.payment.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings Breakdown");
    const safePlate = vehicleDetail.vehicle.registrationNumber.replace(/\s+/g, "_");
    XLSX.writeFile(workbook, `${safePlate}_Earnings_Breakdown_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export Successful",
      description: "Bookings breakdown has been downloaded."
    });
  };

  const formatCurrency = (val: number) => {
    const num = Number(val) || 0;
    if (Number.isInteger(num)) {
      return `₹${num.toLocaleString("en-IN")}`;
    }
    return `₹${Number(num.toFixed(2)).toLocaleString("en-IN", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </span>
              Admin Earning Check
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Vehicle-wise earnings analysis, platform fee collections, and net profit breakdown
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={exportAllVehiclesToExcel}
              variant="outline"
              className="h-10 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold shadow-2xs rounded-xl"
            >
              <Download className="w-4 h-4 mr-2 text-emerald-600" />
              Export Excel
            </Button>

            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="h-10 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold shadow-2xs rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Global Summary KPI Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Admin Profit Card */}
            <Card className="rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-50/70 via-white to-white shadow-xs">
              <CardContent className="p-4.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Net Admin Profit
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-emerald-700 tracking-tight">
                    {formatCurrency(summary.totalAdminProfit)}
                  </div>
                  <p className="text-xs text-emerald-600/90 font-medium mt-1">
                    Total admin profit earned
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Gross Revenue Card */}
            <Card className="rounded-2xl border border-blue-200/70 bg-linear-to-br from-blue-50/60 via-white to-white shadow-xs">
              <CardContent className="p-4.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                    Gross Fare Paid
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-blue-700 tracking-tight">
                    {formatCurrency(summary.totalGrossRevenue)}
                  </div>
                  <p className="text-xs text-blue-600/90 font-medium mt-1">
                    Total customer ride spending
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Completed Trips Card */}
            <Card className="rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50/60 via-white to-white shadow-xs">
              <CardContent className="p-4.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Completed Rides
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-amber-700 tracking-tight">
                    {summary.totalCompletedTrips}
                  </div>
                  <p className="text-xs text-amber-600/90 font-medium mt-1">
                    Out of {summary.totalBookings} total bookings
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Top Profitable Vehicle Card */}
            <Card className="rounded-2xl border border-indigo-200/70 bg-linear-to-br from-indigo-50/60 via-white to-white shadow-xs">
              <CardContent className="p-4.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                    Top Profitable Car
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  {summary.topVehicle ? (
                    <>
                      <div className="text-base font-bold text-indigo-950 truncate" title={summary.topVehicle.name}>
                        {summary.topVehicle.name}
                      </div>
                      <div className="text-xs font-extrabold text-indigo-600 mt-0.5">
                        {formatCurrency(summary.topVehicle.profit)} profit ({summary.topVehicle.trips} trips)
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-500">None yet</div>
                      <p className="text-xs text-gray-400 mt-1">Awaiting completed rides</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by Car name, Model, Reg Number (e.g. DL01...), Driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-gray-200 rounded-xl focus-visible:ring-emerald-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Vehicle Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-10 bg-slate-50 border-gray-200 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="car">Cars Only</SelectItem>
                <SelectItem value="bus">Buses Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-36 h-10 bg-slate-50 border-gray-200 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-10 bg-slate-50 border-gray-200 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="profit_desc">Highest Profit</SelectItem>
                <SelectItem value="profit_asc">Lowest Profit</SelectItem>
                <SelectItem value="trips_desc">Most Completed Trips</SelectItem>
                <SelectItem value="revenue_desc">Highest Gross Revenue</SelectItem>
                <SelectItem value="name_asc">Vehicle Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vehicles Table Card */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/70 border-b border-gray-100 py-3.5 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Car className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                Listed Vehicles Profit Directory ({vehicles.length})
              </CardTitle>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Click the <Eye className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> eye icon to check booking-wise profit
            </span>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                <p className="text-sm font-semibold text-gray-600">Calculating vehicle earnings and profit...</p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="py-16 text-center">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-bold text-gray-700">No vehicles found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter settings</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-gray-200">
                    <TableRow>
                      <TableHead className="w-20 py-3 px-4 text-xs font-bold uppercase text-gray-600">
                        Image
                      </TableHead>
                      <TableHead className="min-w-[190px] py-3 px-4 text-xs font-bold uppercase text-gray-600">
                        Vehicle Details
                      </TableHead>
                      <TableHead className="min-w-[140px] py-3 px-4 text-xs font-bold uppercase text-gray-600">
                        Registration No.
                      </TableHead>
                      <TableHead className="min-w-[160px] py-3 px-4 text-xs font-bold uppercase text-gray-600">
                        Driver Details
                      </TableHead>
                      <TableHead className="min-w-[110px] py-3 px-4 text-xs font-bold uppercase text-gray-600 text-center">
                        Rides Done
                      </TableHead>
                      <TableHead className="min-w-[120px] py-3 px-4 text-xs font-bold uppercase text-gray-600 text-right">
                        Gross Fare
                      </TableHead>
                      <TableHead className="min-w-[140px] py-3 px-4 text-xs font-bold uppercase text-emerald-800 text-right bg-emerald-50/50">
                        Admin Profit
                      </TableHead>
                      <TableHead className="w-24 py-3 px-4 text-xs font-bold uppercase text-gray-600 text-center">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {vehicles.map((v) => {
                      const isCar = v.category === "car";
                      return (
                        <TableRow key={v._id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Image */}
                          <TableCell className="py-3 px-4">
                            <div className="w-14 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                              {v.image ? (
                                <img
                                  src={v.image}
                                  alt={v.brand}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : isCar ? (
                                <Car className="w-6 h-6 text-blue-500" />
                              ) : (
                                <Bus className="w-6 h-6 text-amber-500" />
                              )}
                            </div>
                          </TableCell>

                          {/* Vehicle Details */}
                          <TableCell className="py-3 px-4">
                            <div>
                              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <span>{v.brand}</span>
                                <span className="text-gray-600 font-semibold">{v.model}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 uppercase font-semibold ${
                                    isCar
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {v.category || "car"}
                                </Badge>
                                <span className="text-xs text-gray-400 capitalize">{v.vehicleType}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Registration Plate */}
                          <TableCell className="py-3 px-4">
                            <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200 uppercase">
                              {v.registrationNumber}
                            </span>
                          </TableCell>

                          {/* Driver Details */}
                          <TableCell className="py-3 px-4">
                            {v.driver ? (
                              <div className="text-xs">
                                <div className="font-semibold text-gray-900">{v.driver.name}</div>
                                <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span>{v.driver.phone || "N/A"}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No Driver Assigned</span>
                            )}
                          </TableCell>

                          {/* Rides Done */}
                          <TableCell className="py-3 px-4 text-center">
                            <span className="font-bold text-sm text-gray-900">
                              {v.stats.completedBookings}
                            </span>
                            <span className="text-xs text-gray-400 block font-normal">
                              of {v.stats.totalBookings} total
                            </span>
                          </TableCell>

                          {/* Gross Fare */}
                          <TableCell className="py-3 px-4 text-right">
                            <span className="font-semibold text-xs text-gray-800">
                              {formatCurrency(v.stats.grossRevenue)}
                            </span>
                          </TableCell>

                          {/* Net Admin Profit */}
                          <TableCell className="py-3 px-4 text-right bg-emerald-50/40">
                            <Badge
                              className={`text-xs px-2.5 py-1 font-bold ${
                                v.stats.netAdminProfit > 0
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                              }`}
                            >
                              {v.stats.netAdminProfit > 0 ? "+" : ""}
                              {formatCurrency(v.stats.netAdminProfit)}
                            </Badge>
                          </TableCell>

                          {/* Action (Eye Icon) */}
                          <TableCell className="py-3 px-4 text-center">
                            <Button
                              onClick={() => handleOpenDetailModal(v._id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                              title="View booking-wise profit breakdown"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Booking Breakdown for Selected Vehicle */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 shadow-2xs overflow-hidden flex items-center justify-center shrink-0">
                    {vehicleDetail?.vehicle.image ? (
                      <img
                        src={vehicleDetail.vehicle.image}
                        alt="Vehicle"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="w-7 h-7 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                      <span>{vehicleDetail?.vehicle.brand} {vehicleDetail?.vehicle.model}</span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-gray-200 text-gray-800 rounded">
                        {vehicleDetail?.vehicle.registrationNumber}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500 mt-0.5">
                      Driver: {vehicleDetail?.vehicle.driver?.name || "Unassigned"} ({vehicleDetail?.vehicle.driver?.phone || "No phone"})
                    </DialogDescription>
                  </div>
                </div>

                <Button
                  onClick={exportVehicleBookingsToExcel}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-gray-300 text-xs font-semibold self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Export Rides
                </Button>
              </div>

              {/* Modal KPI Strip for this Vehicle */}
              {vehicleDetail?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Completed Rides</span>
                    <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                      {vehicleDetail.summary.completedBookings} / {vehicleDetail.summary.totalBookings}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Gross Trip Fare</span>
                    <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                      {formatCurrency(vehicleDetail.summary.grossRevenue)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Driver Total Earnings</span>
                    <div className="text-lg font-extrabold text-blue-700 mt-0.5">
                      {formatCurrency(vehicleDetail.summary.driverEarnings)}
                    </div>
                  </div>
                  <div className="bg-emerald-500 p-3 rounded-xl text-white shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-100 uppercase">Admin Net Profit</span>
                    <div className="text-lg font-black text-white mt-0.5">
                      {formatCurrency(vehicleDetail.summary.netAdminProfit)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Search and Filter */}
            <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search booking ID, customer, route..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs bg-slate-50 border-gray-200 rounded-lg"
                />
              </div>

              <Select value={modalStatusFilter} onValueChange={setModalStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs bg-slate-50 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modal Body: Bookings Table */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
              {detailLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                  <p className="text-sm font-semibold text-gray-600">Loading booking records...</p>
                </div>
              ) : modalFilteredBookings.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
                  <p className="text-sm font-bold text-gray-700">No bookings found for this car</p>
                  <p className="text-xs text-gray-400 mt-1">This vehicle hasn't received any matching rides yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-gray-200">
                      <TableRow>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-gray-600">
                          Booking ID & Date
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-gray-600">
                          Customer
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-gray-600">
                          Trip Route
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-gray-600 text-right">
                          Total Fare
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-blue-800 text-right bg-blue-50/50">
                          Driver Earning
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-purple-800 text-right bg-purple-50/50">
                          Discount
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-emerald-800 text-right bg-emerald-50/70">
                          Admin Profit
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase text-gray-600 text-center">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                      {modalFilteredBookings.map((b) => {
                        const isCompleted = b.status === "completed";
                        return (
                          <TableRow key={b._id} className="hover:bg-slate-50/60">
                            {/* Booking ID & Date */}
                            <TableCell className="py-3 px-3">
                              <div className="font-mono text-xs font-bold text-gray-900">
                                #{b.bookingNumber}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {b.date || new Date(b.createdAt).toLocaleDateString()} {b.time}
                              </div>
                            </TableCell>

                            {/* Customer */}
                            <TableCell className="py-3 px-3">
                              <div className="text-xs font-semibold text-gray-900">{b.customer.name}</div>
                              <div className="text-[11px] text-gray-500">{b.customer.phone}</div>
                              {b.rating?.stars ? (
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="inline-flex items-center text-amber-700 text-[10px] font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 mr-1" />
                                    {b.rating.stars}
                                  </span>
                                  {b.rating.review && (
                                    <span
                                      className="text-[10px] text-gray-500 italic max-w-[120px] truncate"
                                      title={b.rating.review}
                                    >
                                      "{b.rating.review}"
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </TableCell>

                            {/* Route */}
                            <TableCell className="py-3 px-3">
                              <div className="text-xs text-gray-900 font-medium max-w-[200px] truncate" title={b.route.pickup}>
                                📍 {b.route.pickup}
                              </div>
                              <div className="text-xs text-gray-600 max-w-[200px] truncate mt-0.5" title={b.route.destination}>
                                🏁 {b.route.destination}
                              </div>
                              {b.route.distance > 0 && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {b.route.distance} km ({b.tripType})
                                </span>
                              )}
                            </TableCell>

                            {/* Total Fare */}
                            <TableCell className="py-3 px-3 text-right text-xs font-semibold text-gray-800">
                              {formatCurrency(b.pricing.totalAmount)}
                            </TableCell>

                            {/* Driver Earning */}
                            <TableCell className="py-3 px-3 text-right text-xs font-bold text-blue-900 bg-blue-50/30">
                              {formatCurrency(b.pricing.driverFare)}
                            </TableCell>

                            {/* Discount (if none, show 0) */}
                            <TableCell className="py-3 px-3 text-right text-xs bg-purple-50/30">
                              {b.pricing.discount > 0 ? (
                                <div>
                                  <span className="font-bold text-purple-700">
                                    -{formatCurrency(b.pricing.discount)}
                                  </span>
                                  {b.pricing.couponCode && (
                                    <span className="text-[10px] text-purple-600 font-mono block">
                                      {b.pricing.couponCode}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium text-gray-400">₹0</span>
                              )}
                            </TableCell>

                            {/* Admin Profit */}
                            <TableCell className="py-3 px-3 text-right bg-emerald-50/40">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800 font-black"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {isCompleted && b.pricing.adminProfit > 0 ? "+" : ""}
                                {formatCurrency(b.pricing.adminProfit)}
                              </span>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3 px-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 capitalize font-bold ${
                                  b.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    : b.status === "cancelled"
                                    ? "bg-red-50 text-red-700 border-red-300"
                                    : "bg-blue-50 text-blue-700 border-blue-300"
                                }`}
                              >
                                {b.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end">
              <Button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-5 text-xs font-bold"
              >
                Close Breakdown
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminEarnings;
