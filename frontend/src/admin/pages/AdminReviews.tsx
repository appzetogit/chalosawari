import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Star,
  MessageSquare,
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  User,
  Car,
  Phone,
  Eye,
  Quote
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { adminReviews } from "@/services/adminApi";
import * as XLSX from "xlsx";

interface ReviewItem {
  _id: string;
  bookingNumber: string;
  date: string;
  time: string;
  createdAt: string;
  ratedAt: string;
  rating: {
    stars: number;
    review: string;
    ratedAt: string;
  };
  customer: {
    _id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  driver: {
    _id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  vehicle: {
    _id?: string;
    name: string;
    type: string;
    registrationNumber?: string;
  };
  route: {
    pickup: string;
    destination: string;
    distance: number;
    tripType: string;
  };
  pricing: {
    totalAmount: number;
    driverFare: number;
    discount: number;
  };
  status: string;
}

interface ReviewSummary {
  totalRatings: number;
  averageRating: number;
  starCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  withReviewCount: number;
  withoutReviewCount: number;
  positivePercentage: number;
}

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [starFilter, setStarFilter] = useState<string>("all");
  const [feedbackFilter, setFeedbackFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Detail Modal
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Date range helper
  const getDateRange = (filter: string) => {
    if (filter === "all") return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const start = new Date();

    if (filter === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (filter === "week") {
      start.setDate(now.getDate() - 7);
    } else if (filter === "month") {
      start.setDate(now.getDate() - 30);
    }
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0]
    };
  };

  const fetchReviews = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      const res = await adminReviews.getAllReviews({
        search: searchTerm,
        stars: starFilter === "all" ? undefined : starFilter,
        hasReviewText: feedbackFilter === "all" ? undefined : feedbackFilter === "with_text" ? "true" : undefined,
        startDate,
        endDate,
        sortBy,
        limit: 100
      });

      if (res?.success && res.data) {
        setReviews(res.data.reviews || []);
        setSummary(res.data.summary || null);
      } else {
        toast({
          title: "Error fetching reviews",
          description: res?.message || "Could not load ratings & reviews",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error fetching admin reviews:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load ratings and reviews",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [starFilter, feedbackFilter, dateFilter, sortBy]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchReviews(true);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews(true);
  };

  // Export to Excel
  const handleExport = () => {
    if (reviews.length === 0) {
      toast({
        title: "No Data",
        description: "There are no ratings & reviews to export.",
        variant: "destructive"
      });
      return;
    }

    const exportRows = reviews.map((r, idx) => ({
      "S.No": idx + 1,
      "Booking ID": r.bookingNumber,
      "Trip Date": r.date,
      "Trip Time": r.time,
      "Customer Name": r.customer.name,
      "Customer Phone": r.customer.phone,
      "Customer Email": r.customer.email || "",
      "Driver Name": r.driver.name,
      "Driver Phone": r.driver.phone,
      "Vehicle": r.vehicle.name,
      "Vehicle Plate": r.vehicle.registrationNumber || "",
      "Pickup Location": r.route.pickup,
      "Destination Location": r.route.destination,
      "Distance (km)": r.route.distance,
      "Rating (Stars)": r.rating.stars,
      "Review Comment": r.rating.review || "Only Star Rating Given",
      "Rated At": r.ratedAt ? new Date(r.ratedAt).toLocaleString("en-IN") : "",
      "Fare Amount (₹)": r.pricing.totalAmount
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ratings & Reviews");
    XLSX.writeFile(workbook, `ChaloSawari_Ratings_Reviews_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export Successful",
      description: `Exported ${exportRows.length} reviews to Excel.`
    });
  };

  const getStarBadgeClass = (stars: number) => {
    if (stars >= 4) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (stars === 3) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const getStarRatingLabel = (stars: number) => {
    switch (stars) {
      case 5: return "Excellent";
      case 4: return "Very Good";
      case 3: return "Good";
      case 2: return "Below Average";
      case 1: return "Poor";
      default: return "";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                  Rating & Reviews
                </h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                  Track trip feedback, passenger star ratings, customer comments, and driver performance
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="h-9 rounded-xl text-xs font-semibold border-gray-200 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={reviews.length === 0}
              className="h-9 rounded-xl text-xs font-semibold border-gray-200 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search Booking ID, Customer name/phone, Driver name/phone, Review text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs bg-slate-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
              />
            </div>

            {/* Star Rating Filter */}
            <Select value={starFilter} onValueChange={setStarFilter}>
              <SelectTrigger className="w-full md:w-44 h-10 text-xs bg-slate-50 border-gray-200 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <SelectValue placeholder="Rating" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Ratings (1 - 5★)</SelectItem>
                <SelectItem value="5">5 Stars only (Excellent)</SelectItem>
                <SelectItem value="4">4 Stars only (Very Good)</SelectItem>
                <SelectItem value="3">3 Stars only (Good)</SelectItem>
                <SelectItem value="2">2 Stars only (Below Avg)</SelectItem>
                <SelectItem value="1">1 Star only (Poor)</SelectItem>
              </SelectContent>
            </Select>

            {/* Feedback Content Filter */}
            <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
              <SelectTrigger className="w-full md:w-48 h-10 text-xs bg-slate-50 border-gray-200 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <SelectValue placeholder="Comment Filter" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All (With & Without Text)</SelectItem>
                <SelectItem value="with_text">Written Review Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-36 h-10 text-xs bg-slate-50 border-gray-200 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <SelectValue placeholder="Date" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past 7 Days</SelectItem>
                <SelectItem value="month">Past 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40 h-10 text-xs bg-slate-50 border-gray-200 rounded-xl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Rating (5★)</SelectItem>
                <SelectItem value="lowest">Lowest Rating (1★)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews Data Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-700">Loading ratings and reviews...</p>
              <p className="text-xs text-gray-400 mt-1">Fetching trip records and feedback data</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <Star className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-800">No Ratings or Reviews Found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                No trip feedback matches the current search and filter criteria. Try clearing search or selecting a different date range.
              </p>
              {(searchTerm || starFilter !== "all" || feedbackFilter !== "all" || dateFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStarFilter("all");
                    setFeedbackFilter("all");
                    setDateFilter("all");
                  }}
                  className="mt-4 rounded-xl text-xs font-semibold"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600">
                      Booking ID & Date
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600">
                      Customer
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600">
                      Driver & Vehicle
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600">
                      Rating
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600 min-w-[280px]">
                      Passenger Review
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600">
                      Trip Route
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase text-gray-600 text-center">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {reviews.map((r) => {
                    const stars = r.rating.stars;
                    const hasText = Boolean(r.rating.review && r.rating.review.trim().length > 0);

                    return (
                      <TableRow key={r._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Booking ID & Date */}
                        <TableCell className="py-3.5 px-4 align-top">
                          <span className="font-mono text-xs font-bold text-gray-900 bg-slate-100 px-2 py-0.5 rounded-md border border-gray-200">
                            #{r.bookingNumber}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2 font-medium">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{r.date}</span>
                            {r.time && <span className="text-gray-400">• {r.time}</span>}
                          </div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">{r.customer.name}</div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-gray-400" />
                                {r.customer.phone}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Driver & Vehicle */}
                        <TableCell className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Car className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">{r.driver.name}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5">{r.driver.phone}</div>
                              <div className="mt-1">
                                <span className="inline-block text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {r.vehicle.name} {r.vehicle.registrationNumber ? `(${r.vehicle.registrationNumber})` : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Rating */}
                        <TableCell className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  className={`w-3.5 h-3.5 ${
                                    n <= stars ? "fill-amber-400 text-amber-400" : "text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span
                              className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStarBadgeClass(
                                stars
                              )}`}
                            >
                              ★ {stars}.0 {getStarRatingLabel(stars)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Passenger Review */}
                        <TableCell className="py-3.5 px-4 align-top">
                          {hasText ? (
                            <div className="space-y-1 max-w-sm">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-100 text-xs text-gray-800 italic relative">
                                <Quote className="w-3 h-3 text-gray-300 absolute -top-1.5 -left-1.5 fill-gray-200" />
                                "{r.rating.review}"
                              </div>
                              {r.ratedAt && (
                                <p className="text-[10px] text-gray-400 font-medium">
                                  Submitted on {new Date(r.ratedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[11px] text-gray-400 italic bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                Only Star Rating given
                              </span>
                              {r.ratedAt && (
                                <p className="text-[10px] text-gray-400 font-medium">
                                  Rated on {new Date(r.ratedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Trip Route */}
                        <TableCell className="py-3.5 px-4 align-top">
                          <div className="space-y-1 text-xs max-w-[200px]">
                            <div className="font-medium text-gray-900 truncate" title={r.route.pickup}>
                              📍 {r.route.pickup}
                            </div>
                            <div className="text-gray-600 truncate" title={r.route.destination}>
                              🏁 {r.route.destination}
                            </div>
                            {r.route.distance > 0 && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                {r.route.distance} km • ₹{r.pricing.totalAmount}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3.5 px-4 text-center align-middle">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(r);
                              setIsDetailModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Full Review & Booking Details"
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
        </div>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-lg w-[95vw] rounded-2xl p-0 overflow-hidden">
            {selectedReview && (
              <div>
                <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-900 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
                      #{selectedReview.bookingNumber}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStarBadgeClass(
                        selectedReview.rating.stars
                      )}`}
                    >
                      ★ {selectedReview.rating.stars}.0 {getStarRatingLabel(selectedReview.rating.stars)}
                    </span>
                  </div>
                  <DialogTitle className="text-base font-bold text-gray-900 mt-2">
                    Passenger Trip Review & Rating
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500">
                    Booking completed on {selectedReview.date} at {selectedReview.time}
                  </DialogDescription>
                </DialogHeader>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Rating Stars & Comment Highlight */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Star Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${
                              n <= selectedReview.rating.stars
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-gray-700">Customer Review</span>
                      {selectedReview.rating.review ? (
                        <p className="mt-1.5 p-3 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 italic leading-relaxed">
                          "{selectedReview.rating.review}"
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400 italic">
                          No written feedback provided. Star rating only.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer Details</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-semibold text-gray-900">{selectedReview.customer.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-semibold text-gray-900">{selectedReview.customer.phone}</span>
                    </div>
                    {selectedReview.customer.email && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Email:</span>
                        <span className="text-gray-700">{selectedReview.customer.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Driver Information */}
                  <div className="p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Driver Details</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Driver Name:</span>
                      <span className="font-semibold text-gray-900">{selectedReview.driver.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-semibold text-gray-900">{selectedReview.driver.phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Vehicle:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedReview.vehicle.name}{" "}
                        {selectedReview.vehicle.registrationNumber
                          ? `(${selectedReview.vehicle.registrationNumber})`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {/* Route & Trip */}
                  <div className="p-3.5 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Trip Route</p>
                    <div>
                      <span className="text-gray-500">Pickup: </span>
                      <span className="text-gray-800 font-medium">{selectedReview.route.pickup}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Destination: </span>
                      <span className="text-gray-800 font-medium">{selectedReview.route.destination}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-gray-600">
                      <span>Distance: {selectedReview.route.distance} km</span>
                      <span className="font-bold text-gray-900">Total Fare: ₹{selectedReview.pricing.totalAmount}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="w-full h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminReviews;
