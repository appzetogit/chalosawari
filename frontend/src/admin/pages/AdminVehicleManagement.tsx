import { useState, useEffect } from "react";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { resolveImageUrl } from "@/utils/imageUrl";
import { adminVehicles, fetchAllPages } from "@/services/adminApi";
import vehicleSettingService, { VehicleModelItem } from "@/services/vehicleSettingApi";
import { 
  Car, 
  Bus, 
  Search, 
  Eye, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  Star, 
  Loader2, 
  RefreshCw, 
  Fuel, 
  Users, 
  ImageIcon,
  Bell,
  Check,
  X,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  Sparkles,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Camera
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Vehicle {
  _id: string;
  type: 'car' | 'bus';
  brand: string;
  model?: string;
  pricingReference?: {
    category: string;
    vehicleType: string;
    vehicleModel: string;
  };
  registrationNumber: string;
  images?: Array<{ url: string; caption?: string; isPrimary?: boolean }> | string[];
  photos?: string[];
  driver?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  };
  bookingStatus: 'available' | 'booked' | 'in_trip' | 'maintenance' | 'offline';
  currentLocation?: {
    address: string;
    coordinates: [number, number];
    lastUpdated: string;
  };
  vehicleLocation?: {
    address: string;
    coordinates: [number, number];
    city?: string;
    state?: string;
    lastUpdated: string;
  };
  maintenance?: {
    lastService?: string;
    nextService?: string;
    isUnderMaintenance: boolean;
    maintenanceReason?: string;
  };
  statistics: {
    totalTrips: number;
    totalDistance: number;
    totalEarnings: number;
  };
  ratings: {
    average: number;
    count: number;
  };
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  transmission: 'manual' | 'automatic';
  seatingCapacity: number;
  engineCapacity?: number;
  mileage?: number;
  isAc: boolean;
  isSleeper: boolean;
  amenities: string[];
  documents?: {
    rc?: {
      number?: string;
      expiryDate?: string;
      image?: string;
      isVerified?: boolean;
    };
    insurance?: {
      number?: string;
      expiryDate?: string;
      image?: string;
      isVerified?: boolean;
    };
    permit?: {
      number?: string;
      expiryDate?: string;
      image?: string;
      isVerified?: boolean;
    };
    fitness?: {
      number?: string;
      expiryDate?: string;
      image?: string;
      isVerified?: boolean;
    };
    puc?: {
      number?: string;
      expiryDate?: string;
      image?: string;
      isVerified?: boolean;
    };
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isAvailable: boolean;
  isActive: boolean;
  isVerified: boolean;
  isApproved: boolean;
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

const AdminVehicleManagement = () => {
  const [activeTab, setActiveTab] = useState<"fleet" | "requests">("fleet");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settingModels, setSettingModels] = useState<VehicleModelItem[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Pending Vehicle Requests state
  const [pendingRequests, setPendingRequests] = useState<Vehicle[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [vehicleToReject, setVehicleToReject] = useState<Vehicle | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Details and Delete dialogs
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<string | null>(null);

  const getVehicleImage = (vehicle: Vehicle): string | null => {
    if (vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0) {
      const primary = vehicle.images.find((img: any) => typeof img === 'object' && img?.isPrimary);
      if (primary && typeof primary === 'object' && primary.url) {
        return resolveImageUrl(primary.url);
      }
      const first = vehicle.images[0];
      if (typeof first === 'string') return resolveImageUrl(first);
      if (typeof first === 'object' && first?.url) return resolveImageUrl(first.url);
    }
    if ((vehicle as any).photos && Array.isArray((vehicle as any).photos) && (vehicle as any).photos.length > 0) {
      return resolveImageUrl((vehicle as any).photos[0]);
    }
    if (vehicle.documents?.rc?.image) {
      return resolveImageUrl(vehicle.documents.rc.image);
    }
    return null;
  };

  const getAllVehicleImages = (vehicle: Vehicle): string[] => {
    const list: string[] = [];
    if (vehicle.images && Array.isArray(vehicle.images)) {
      vehicle.images.forEach((img: any) => {
        if (typeof img === 'string') {
          const resolved = resolveImageUrl(img);
          if (resolved && !list.includes(resolved)) list.push(resolved);
        } else if (typeof img === 'object' && img?.url) {
          const resolved = resolveImageUrl(img.url);
          if (resolved && !list.includes(resolved)) list.push(resolved);
        }
      });
    }
    if ((vehicle as any).photos && Array.isArray((vehicle as any).photos)) {
      (vehicle as any).photos.forEach((photo: string) => {
        const resolved = resolveImageUrl(photo);
        if (resolved && !list.includes(resolved)) list.push(resolved);
      });
    }
    if (vehicle.documents?.rc?.image) {
      const resolved = resolveImageUrl(vehicle.documents.rc.image);
      if (resolved && !list.includes(resolved)) list.push(resolved);
    }
    if (vehicle.documents?.insurance?.image) {
      const resolved = resolveImageUrl(vehicle.documents.insurance.image);
      if (resolved && !list.includes(resolved)) list.push(resolved);
    }
    if (vehicle.documents?.permit?.image) {
      const resolved = resolveImageUrl(vehicle.documents.permit.image);
      if (resolved && !list.includes(resolved)) list.push(resolved);
    }
    return list;
  };

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await fetchAllPages(adminVehicles.getAll, {
        approvalStatus: 'approved',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (response.success) {
        const vehiclesData = response.data.docs || response.data || [];
        // Only show approved vehicles in the main fleet table
        const approvedVehicles = vehiclesData.filter((v: Vehicle) => v.approvalStatus === 'approved');
        setVehicles(approvedVehicles);
        setFilteredVehicles(approvedVehicles);
      } else {
        throw new Error(response.message || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Error",
        description: "Failed to load vehicles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const response = await adminVehicles.getPendingApprovals(1, 100);
      if (response.success) {
        const list = response.data?.docs || response.data || [];
        setPendingRequests(list);
      }
    } catch (err) {
      console.warn("Failed to fetch pending vehicle requests:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchVehicles(), fetchPendingRequests()]);
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Vehicle fleet and requests have been refreshed",
    });
  };

  useEffect(() => {
    fetchVehicles();
    fetchPendingRequests();
    vehicleSettingService.getAdminVehicleSettings()
      .then(data => setSettingModels(data.models || []))
      .catch(() => setSettingModels([]));
  }, []);

  // Vehicles store only body type + model name; the manufacturer comes from the admin's model list
  const getManufacturer = (vehicle: Vehicle) => {
    const ref = vehicle.pricingReference;
    if (!ref?.vehicleModel) return '';
    return settingModels.find(m =>
      m.category === ref.category &&
      m.variantName.toLowerCase() === (ref.vehicleType || '').toLowerCase() &&
      m.modelName.toLowerCase() === ref.vehicleModel.toLowerCase()
    )?.brand || '';
  };

  useEffect(() => {
    let filtered = vehicles;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle => {
        const brand = (vehicle.brand || '').toLowerCase();
        const model = (vehicle.pricingReference?.vehicleModel || vehicle.model || '').toLowerCase();
        const reg = (vehicle.registrationNumber || '').toLowerCase();
        const driverName = vehicle.driver ? `${vehicle.driver.firstName || ''} ${vehicle.driver.lastName || ''}`.trim().toLowerCase() : '';

        return (
          brand.includes(lowerSearch) ||
          model.includes(lowerSearch) ||
          reg.includes(lowerSearch) ||
          driverName.includes(lowerSearch)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(vehicle => vehicle.bookingStatus === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(vehicle => vehicle.type === typeFilter);
    }

    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  // Filter pending requests based on search and type filter
  const filteredRequests = pendingRequests.filter(req => {
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const brand = (req.brand || '').toLowerCase();
      const model = (req.pricingReference?.vehicleModel || req.model || '').toLowerCase();
      const reg = (req.registrationNumber || '').toLowerCase();
      const driverName = req.driver ? `${req.driver.firstName || ''} ${req.driver.lastName || ''}`.trim().toLowerCase() : '';
      if (!brand.includes(lower) && !model.includes(lower) && !reg.includes(lower) && !driverName.includes(lower)) {
        return false;
      }
    }
    if (typeFilter !== "all" && req.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car': return <Car className="w-5 h-5" />;
      case 'bus': return <Bus className="w-5 h-5" />;
      default: return <Car className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Available</Badge>;
      case 'booked':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Booked</Badge>;
      case 'in_trip':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">In Trip</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Maintenance</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleVehicleAction = (action: string, vehicleId: string) => {
    switch (action) {
      case 'view':
        const vehicle = vehicles.find(v => v._id === vehicleId) || pendingRequests.find(v => v._id === vehicleId);
        setSelectedVehicle(vehicle || null);
        setActiveImageIndex(0);
        setShowVehicleDetails(true);
        break;
      case 'delete':
        const vehicleToDelete = vehicles.find(v => v._id === vehicleId) || pendingRequests.find(v => v._id === vehicleId);
        setVehicleToDelete(vehicleToDelete || null);
        setShowDeleteConfirm(true);
        break;
    }
  };

  // Approve Vehicle Request
  const handleApproveVehicle = async (vehicleId: string) => {
    try {
      setIsApproving(vehicleId);
      const response = await adminVehicles.approveVehicle(vehicleId);
      if (response.success) {
        toast({
          title: "Vehicle Approved",
          description: "Vehicle has been approved and added to the fleet.",
        });
        await Promise.all([fetchVehicles(), fetchPendingRequests()]);
      } else {
        throw new Error(response.message || "Failed to approve vehicle");
      }
    } catch (error: any) {
      console.error("Error approving vehicle:", error);
      toast({
        title: "Approval Failed",
        description: error.response?.data?.message || error.message || "Failed to approve vehicle",
        variant: "destructive",
      });
    } finally {
      setIsApproving(null);
    }
  };

  // Reject Vehicle Request
  const handleRejectVehicle = async () => {
    if (!vehicleToReject) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting the vehicle.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRejecting(vehicleToReject._id);
      const response = await adminVehicles.rejectVehicle(vehicleToReject._id, rejectReason.trim());
      if (response.success) {
        toast({
          title: "Vehicle Rejected",
          description: "Vehicle request has been rejected.",
        });
        setShowRejectDialog(false);
        setVehicleToReject(null);
        setRejectReason("");
        await Promise.all([fetchVehicles(), fetchPendingRequests()]);
      } else {
        throw new Error(response.message || "Failed to reject vehicle");
      }
    } catch (error: any) {
      console.error("Error rejecting vehicle:", error);
      toast({
        title: "Rejection Failed",
        description: error.response?.data?.message || error.message || "Failed to reject vehicle",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(null);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;

    try {
      setDeletingVehicle(vehicleToDelete._id);
      const response = await adminVehicles.deleteVehicle(vehicleToDelete._id);
      
      if (response.success) {
        const updatedVehicles = vehicles.filter(v => v._id !== vehicleToDelete._id);
        setVehicles(updatedVehicles);
        setFilteredVehicles(updatedVehicles);
        setPendingRequests(prev => prev.filter(v => v._id !== vehicleToDelete._id));
        
        toast({
          title: "Vehicle Deleted",
          description: response.message || `${vehicleToDelete.brand || ''} ${vehicleToDelete.pricingReference?.vehicleModel || vehicleToDelete.model || ''} has been deleted successfully.`.trim(),
        });
        
        setShowDeleteConfirm(false);
        setVehicleToDelete(null);
      } else {
        throw new Error(response.message || 'Failed to delete vehicle');
      }
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingVehicle(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Search and Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vehicle Management</h1>
            <p className="text-gray-600 text-sm mt-0.5">Manage all approved vehicles and review driver vehicle requests</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-white shadow-xs rounded-xl"
              />
            </div>
            
            {/* Status Filter (only active on Fleet tab) */}
            {activeTab === "fleet" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-10 bg-white shadow-xs rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="in_trip">In Trip</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-32 h-10 bg-white shadow-xs rounded-xl">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="h-10 bg-white border-gray-200 shadow-xs hover:bg-gray-50 rounded-xl"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Vehicles Content Card with Tabs */}
        <Card className="border border-gray-200 shadow-sm overflow-hidden rounded-2xl bg-white">
          <CardHeader className="bg-slate-50/70 border-b border-gray-100 py-3.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Title */}
            <div className="flex items-center gap-3">
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                {activeTab === "fleet" ? (
                  <>
                    <Car className="w-5 h-5 text-blue-600" />
                    <span>All Vehicles ({filteredVehicles.length})</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5 text-amber-600" />
                    <span>Vehicle Requests ({filteredRequests.length})</span>
                  </>
                )}
              </CardTitle>
              <Badge variant="outline" className={`text-xs ${
                activeTab === "fleet" ? "bg-white text-gray-600 border-gray-200" : "bg-amber-50 text-amber-800 border-amber-300"
              }`}>
                {activeTab === "fleet" ? "Fleet Directory" : "Pending Driver Approvals"}
              </Badge>
            </div>

            {/* Header Switcher Tabs: All Vehicles vs Requests */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              {/* All Vehicles Tab Button */}
              <button
                type="button"
                onClick={() => setActiveTab("fleet")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "fleet"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>All Vehicles</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "fleet" ? "bg-blue-100 text-blue-800" : "bg-slate-300/80 text-slate-700"
                }`}>
                  {vehicles.length}
                </span>
              </button>

              {/* Requests Tab Button with Bell Icon & Counter */}
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "requests"
                    ? "bg-amber-500 text-white shadow-xs"
                    : pendingRequests.length > 0
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="relative">
                  <Bell className="w-3.5 h-3.5" />
                  {pendingRequests.length > 0 && activeTab !== "requests" && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                  )}
                </div>
                <span>Requests</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "requests"
                    ? "bg-white text-amber-700"
                    : pendingRequests.length > 0
                    ? "bg-amber-600 text-white"
                    : "bg-slate-300/80 text-slate-700"
                }`}>
                  {pendingRequests.length}
                </span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ========================================================= */}
            {/* TAB 1: FLEET DIRECTORY (APPROVED VEHICLES TABLE) */}
            {/* ========================================================= */}
            {activeTab === "fleet" && (
              <>
                {isLoading ? (
                  <div className="text-center py-16">
                    <Loader2 className="w-9 h-9 animate-spin mx-auto mb-3 text-blue-600" />
                    <p className="text-gray-600 font-medium text-sm">Loading vehicle fleet...</p>
                  </div>
                ) : filteredVehicles.length === 0 ? (
                  <div className="text-center py-16">
                    <Car className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-800 font-semibold text-base">No vehicles found</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {pendingRequests.length > 0
                        ? "You have pending driver vehicle requests waiting for approval in the Requests tab!"
                        : "Try adjusting your search or filter settings"}
                    </p>
                    {pendingRequests.length > 0 && (
                      <Button
                        type="button"
                        onClick={() => setActiveTab("requests")}
                        className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        <Bell className="w-3.5 h-3.5 mr-1.5" />
                        View {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/80 border-b border-gray-200">
                        <TableRow>
                          <TableHead className="w-24 font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4">
                            Image
                          </TableHead>
                          <TableHead className="min-w-[200px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4">
                            Vehicle Details
                          </TableHead>
                          <TableHead className="min-w-[160px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4">
                            Driver / Owner
                          </TableHead>
                          <TableHead className="min-w-[180px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4">
                            Location
                          </TableHead>
                          <TableHead className="min-w-[150px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4">
                            Fuel & Specs
                          </TableHead>
                          <TableHead className="min-w-[100px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4 text-center">
                            Trips
                          </TableHead>
                          <TableHead className="min-w-[120px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 px-4 text-center">
                            Status
                          </TableHead>
                          <TableHead className="min-w-[120px] font-bold text-gray-700 text-xs uppercase tracking-wider py-3.5 pr-6 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 bg-white">
                        {filteredVehicles.map((vehicle) => {
                          const imgUrl = getVehicleImage(vehicle);
                          return (
                            <TableRow
                              key={vehicle._id}
                              className="hover:bg-blue-50/40 transition-colors"
                            >
                              {/* Image column */}
                              <TableCell className="py-3 px-4">
                                <div className="w-16 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={vehicle.brand || 'Vehicle'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="p-2 text-blue-600">
                                      {getVehicleIcon(vehicle.type)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Vehicle Details */}
                              <TableCell className="py-3 px-4">
                                <div className="space-y-1">
                                  <p className="font-bold text-gray-900 text-sm leading-tight">
                                    {vehicle.brand || ''} {vehicle.pricingReference?.vehicleModel || vehicle.model || ''}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                                      {vehicle.registrationNumber || 'N/A'}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-50 border-blue-200">
                                      {vehicle.type}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Driver / Owner */}
                              <TableCell className="py-3 px-4">
                                {vehicle.driver ? (
                                  <div>
                                    <p className="font-semibold text-gray-900 text-sm">
                                      {`${vehicle.driver.firstName || ''} ${vehicle.driver.lastName || ''}`.trim() || 'Assigned Driver'}
                                    </p>
                                    {vehicle.driver.phone && (
                                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                                        {vehicle.driver.phone}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No driver assigned</span>
                                )}
                              </TableCell>

                              {/* Location */}
                              <TableCell className="py-3 px-4">
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center text-gray-700">
                                    <MapPin className="w-3.5 h-3.5 mr-1 text-blue-500 shrink-0" />
                                    <span className="truncate max-w-[150px]" title={vehicle.currentLocation?.address || vehicle.vehicleLocation?.address || 'Not set'}>
                                      {vehicle.currentLocation?.address || vehicle.vehicleLocation?.address || 'Not set'}
                                    </span>
                                  </div>
                                  {vehicle.vehicleLocation?.address && vehicle.currentLocation?.address && vehicle.vehicleLocation.address !== vehicle.currentLocation.address && (
                                    <div className="flex items-center text-gray-500">
                                      <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
                                      <span className="truncate max-w-[150px]" title={`Base: ${vehicle.vehicleLocation.address}`}>
                                        {vehicle.vehicleLocation.address}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Fuel & Specs */}
                              <TableCell className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                    <Fuel className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="capitalize">{vehicle.fuelType || 'Petrol'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span>{vehicle.seatingCapacity || 4} Seats</span>
                                    {vehicle.isAc && (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                                        AC
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Total Trips */}
                              <TableCell className="py-3 px-4 text-center">
                                <span className="inline-flex items-center justify-center font-bold text-sm text-gray-900 bg-slate-100 px-2.5 py-1 rounded-md">
                                  {vehicle.statistics?.totalTrips || 0}
                                </span>
                              </TableCell>

                              {/* Status */}
                              <TableCell className="py-3 px-4 text-center">
                                {getStatusBadge(vehicle.bookingStatus)}
                              </TableCell>

                              {/* Actions - Icon Only Buttons */}
                              <TableCell className="py-3 pr-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Details Eye Icon Only */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                    onClick={() => handleVehicleAction('view', vehicle._id)}
                                    title="View Vehicle Details & Photos"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {/* Delete Vehicle Trash Icon Only */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                    onClick={() => handleVehicleAction('delete', vehicle._id)}
                                    title="Delete Vehicle"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* TAB 2: DRIVER VEHICLE REGISTRATION REQUESTS TABLE */}
            {/* ========================================================= */}
            {activeTab === "requests" && (
              <>
                {isLoadingRequests ? (
                  <div className="text-center py-16">
                    <Loader2 className="w-9 h-9 animate-spin mx-auto mb-3 text-amber-600" />
                    <p className="text-gray-600 font-medium text-sm">Loading pending driver vehicle requests...</p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <p className="text-gray-900 font-bold text-base">No Pending Requests</p>
                    <p className="text-gray-500 text-sm mt-1">
                      All driver vehicles have been reviewed and approved into the fleet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("fleet")}
                      className="mt-4 text-xs font-bold rounded-xl"
                    >
                      <Car className="w-3.5 h-3.5 mr-1.5" />
                      Back to All Vehicles
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-amber-50/60 border-b border-amber-200/80">
                        <TableRow>
                          <TableHead className="w-24 font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 px-4">
                            Image
                          </TableHead>
                          <TableHead className="min-w-[200px] font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 px-4">
                            Vehicle Details
                          </TableHead>
                          <TableHead className="min-w-[180px] font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 px-4">
                            Driver / Owner
                          </TableHead>
                          <TableHead className="min-w-[170px] font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 px-4">
                            Base Location
                          </TableHead>
                          <TableHead className="min-w-[150px] font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 px-4">
                            Fuel & Specs
                          </TableHead>
                          <TableHead className="min-w-[120px] font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 px-4 text-center">
                            Submitted
                          </TableHead>
                          <TableHead className="min-w-[180px] font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5 pr-6 text-right">
                            Review Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100 bg-white">
                        {filteredRequests.map((request) => {
                          const imgUrl = getVehicleImage(request);
                          const isProcessing = isApproving === request._id;

                          return (
                            <TableRow
                              key={request._id}
                              className="hover:bg-amber-50/30 transition-colors"
                            >
                              {/* Image Column */}
                              <TableCell className="py-3.5 px-4">
                                <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={request.brand || 'Vehicle'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="p-2 text-blue-600">
                                      {getVehicleIcon(request.type)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Vehicle Details */}
                              <TableCell className="py-3.5 px-4">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-900 text-sm leading-tight">
                                    {request.brand || ''} {request.pricingReference?.vehicleModel || request.model || ''}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {/* IND Plate style */}
                                    <div className="inline-flex items-center border border-slate-800 rounded bg-white overflow-hidden shadow-2xs">
                                      <div className="bg-blue-700 text-white px-1 text-[8px] font-black border-r border-slate-800">
                                        IND
                                      </div>
                                      <div className="px-1.5 font-mono font-black text-slate-900 tracking-wider text-[11px]">
                                        {request.registrationNumber || 'N/A'}
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-50 border-blue-200">
                                      {request.type}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Driver / Owner Details */}
                              <TableCell className="py-3.5 px-4">
                                {request.driver ? (
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-slate-900 text-sm">
                                      {`${request.driver.firstName || ''} ${request.driver.lastName || ''}`.trim() || 'Driver Partner'}
                                    </p>
                                    {request.driver.phone && (
                                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {request.driver.phone}
                                      </p>
                                    )}
                                    {request.driver.email && (
                                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-300" />
                                        {request.driver.email}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No driver info</span>
                                )}
                              </TableCell>

                              {/* Base Location */}
                              <TableCell className="py-3.5 px-4">
                                {request.vehicleLocation?.address ? (
                                  <div className="flex items-center text-xs text-slate-700">
                                    <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                                    <span className="truncate max-w-[150px]" title={request.vehicleLocation.address}>
                                      {request.vehicleLocation.address}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">Not set</span>
                                )}
                              </TableCell>

                              {/* Fuel & Specs */}
                              <TableCell className="py-3.5 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                    <Fuel className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="capitalize">{request.fuelType || 'Petrol'}</span>
                                    {request.mileage && (
                                      <span className="text-[11px] text-slate-500">({request.mileage} km/L)</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span>{request.seatingCapacity || 4} Seats</span>
                                    {request.isAc && (
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-200">
                                        AC
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Submitted Date */}
                              <TableCell className="py-3.5 px-4 text-center">
                                <div className="text-xs text-slate-600 font-medium">
                                  {request.createdAt ? (
                                    <>
                                      <span className="block font-semibold text-slate-800">
                                        {new Date(request.createdAt).toLocaleDateString()}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </>
                                  ) : (
                                    'Recently'
                                  )}
                                </div>
                              </TableCell>

                              {/* Actions: Accept / Reject / View */}
                              <TableCell className="py-3.5 pr-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Eye Button */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVehicleAction('view', request._id)}
                                    className="h-8 w-8 p-0 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200 rounded-lg cursor-pointer"
                                    title="View Vehicle Details & Photos"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>

                                  {/* Reject Button */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setVehicleToReject(request);
                                      setRejectReason("");
                                      setShowRejectDialog(true);
                                    }}
                                    className="h-8 px-2.5 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    Reject
                                  </Button>

                                  {/* Accept Button */}
                                  <Button
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => handleApproveVehicle(request._id)}
                                    className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-all cursor-pointer"
                                  >
                                    {isProcessing ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                        <span>Approving...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5 mr-1" />
                                        <span>Accept</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* REJECT VEHICLE REASON MODAL */}
      {/* ========================================================= */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Reject Vehicle Request</span>
            </DialogTitle>
          </DialogHeader>

          {vehicleToReject && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  {vehicleToReject.brand || ''} {vehicleToReject.pricingReference?.vehicleModel || vehicleToReject.model || ''} ({vehicleToReject.registrationNumber})
                </p>
                <p className="text-slate-500">
                  Driver: {vehicleToReject.driver?.firstName} {vehicleToReject.driver?.lastName} ({vehicleToReject.driver?.phone || 'N/A'})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rejectReasonText" className="text-xs font-bold text-slate-700">
                  Reason for Rejection <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejectReasonText"
                  placeholder="e.g. Invalid RC document / Photo is unclear / Details mismatch"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="rounded-xl border-slate-200 text-sm min-h-[90px]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isRejecting === vehicleToReject._id}
                  onClick={handleRejectVehicle}
                  className="flex-1 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700"
                >
                  {isRejecting === vehicleToReject._id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* VEHICLE FULL DETAILS DIALOG (WITH COMPLETE PHOTO GALLERY) */}
      {/* ========================================================= */}
      <Dialog open={showVehicleDetails} onOpenChange={setShowVehicleDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
                {selectedVehicle && getVehicleIcon(selectedVehicle.type)}
                <span>
                  {selectedVehicle?.brand || ''} {selectedVehicle?.pricingReference?.vehicleModel || selectedVehicle?.model || 'Vehicle Details'}
                </span>
              </DialogTitle>
              {selectedVehicle && (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    {selectedVehicle.registrationNumber || 'N/A'}
                  </span>
                  <Badge className="capitalize text-xs bg-blue-600 text-white font-bold">
                    {selectedVehicle.type}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedVehicle && (() => {
            const allImages = getAllVehicleImages(selectedVehicle);
            const currentImg = allImages[activeImageIndex] || allImages[0] || null;

            return (
              <div className="space-y-6 pt-2">
                {/* 1. All Vehicle Photos Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Vehicle Photos & Images ({allImages.length})</span>
                    </h3>
                    {allImages.length > 0 && (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {activeImageIndex + 1} of {allImages.length}
                      </span>
                    )}
                  </div>

                  {allImages.length > 0 ? (
                    <div className="space-y-3">
                      {/* Main Featured Photo Display */}
                      <div className="relative w-full h-72 sm:h-88 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-md group">
                        <img
                          src={currentImg || ''}
                          alt="Vehicle full preview"
                          className="w-full h-full object-contain bg-slate-950 transition-all duration-300"
                        />

                        {/* Navigation Arrows for Photos */}
                        {allImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                              title="Previous Image"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                              title="Next Image"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Thumbnails Row */}
                      {allImages.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                          {allImages.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImageIndex(idx)}
                              className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                activeImageIndex === idx
                                  ? "border-blue-600 ring-2 ring-blue-500/30 shadow-xs scale-105"
                                  : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300"
                              }`}
                            >
                              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                              {idx === 0 && (
                                <span className="absolute bottom-0.5 left-0.5 bg-blue-600 text-white text-[8px] font-black px-1 rounded">
                                  Main
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                      <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No photos uploaded for this vehicle</p>
                    </div>
                  )}
                </div>

                {/* 2. Basic Information Grid */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Vehicle Type</Label>
                      <p className="mt-0.5 font-bold text-slate-900 uppercase">{selectedVehicle.type}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Body Type</Label>
                      <p className="mt-0.5 font-bold text-slate-900">{selectedVehicle.pricingReference?.vehicleType || '—'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Brand</Label>
                      <p className="mt-0.5 font-bold text-slate-900">{getManufacturer(selectedVehicle) || '—'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Vehicle Name</Label>
                      <p className="mt-0.5 font-bold text-slate-900">{selectedVehicle.pricingReference?.vehicleModel || selectedVehicle.model || selectedVehicle.brand || '—'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Registration Number</Label>
                      <p className="mt-0.5 font-bold font-mono text-slate-900">{selectedVehicle.registrationNumber}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Seating Capacity</Label>
                      <p className="mt-0.5 font-bold text-slate-900">{selectedVehicle.seatingCapacity} passengers</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Fuel Type</Label>
                      <p className="mt-0.5 font-bold text-slate-900 capitalize">{selectedVehicle.fuelType}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Driver Information */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Driver Partner</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Driver Name</Label>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {selectedVehicle.driver ? `${selectedVehicle.driver.firstName || ''} ${selectedVehicle.driver.lastName || ''}`.trim() : 'No Driver Assigned'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Phone Number</Label>
                      <p className="mt-0.5 font-bold font-mono text-slate-900">{selectedVehicle.driver?.phone || 'N/A'}</p>
                    </div>
                    {selectedVehicle.driver?.email && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Label className="text-xs font-semibold text-slate-500">Email Address</Label>
                        <p className="mt-0.5 font-medium text-slate-900">{selectedVehicle.driver.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Status & Fleet Information */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Fleet & Booking Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Booking Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedVehicle.bookingStatus)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Approval Status</Label>
                      <p className="mt-0.5 font-bold text-slate-900 capitalize">{selectedVehicle.approvalStatus || 'approved'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Total Trips Done</Label>
                      <p className="mt-0.5 font-bold text-slate-900">{selectedVehicle.statistics?.totalTrips || 0}</p>
                    </div>
                  </div>
                </div>

                {/* 5. Base Location */}
                {selectedVehicle.vehicleLocation?.address && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Base Location</h3>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Label className="text-xs font-semibold text-slate-500">Garage / Operating Base</Label>
                      <p className="mt-0.5 font-medium text-slate-900">{selectedVehicle.vehicleLocation.address}</p>
                    </div>
                  </div>
                )}

                {/* 6. Amenities */}
                {selectedVehicle.amenities && selectedVehicle.amenities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-2">Amenities & Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVehicle.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="capitalize bg-slate-50 border-slate-200 font-semibold px-2.5 py-1">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================= */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Vehicle</DialogTitle>
          </DialogHeader>
          {vehicleToDelete && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  {getVehicleIcon(vehicleToDelete.type)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{vehicleToDelete.brand || ''} {vehicleToDelete.pricingReference?.vehicleModel || vehicleToDelete.model || ''}</p>
                  <p className="text-xs font-mono text-slate-500">{vehicleToDelete.registrationNumber || ''}</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-600">
                Are you sure you want to delete this vehicle from the system? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setVehicleToDelete(null);
                  }}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteVehicle}
                  disabled={deletingVehicle === vehicleToDelete._id}
                  className="flex-1 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700"
                >
                  {deletingVehicle === vehicleToDelete._id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Delete Vehicle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVehicleManagement;