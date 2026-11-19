import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DriverBottomNavigation from "@/driver/components/DriverBottomNavigation";
import AddVehicleForm from "@/driver/components/AddVehicleForm";
import { Home, MessageSquare, Car, User, Plus, Edit, Trash2, MapPin, Calendar, Fuel, Settings, CheckCircle, AlertCircle, Search, Filter, Upload, ChevronLeft, ChevronRight, X, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import VehicleApiService, { Vehicle, CreateVehicleData, UpdateVehicleData } from "@/services/vehicleApi";

const DriverMyVehicle = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("myvehicle");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>("all");
  const [filterType, setFilterType] = useState<'all' | 'bus' | 'car'>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API service
  const vehicleApi = new VehicleApiService(
    import.meta.env.VITE_API_BASE_URL || '/api',
    () => ({
      'Authorization': `Bearer ${localStorage.getItem('driverToken')}`
    })
  );

  useEffect(() => {
    const initializeDriverModule = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if driver is logged in
        const driverToken = localStorage.getItem('driverToken');
        if (!driverToken) {
          navigate('/driver-auth');
          return;
        }

        setIsLoggedIn(true);

        // Load driver's vehicles
        await loadVehicles();

      } catch (err) {
        console.error('Error initializing driver module:', err);
        setError('Failed to load driver module. Please try refreshing the page.');
        toast({
          title: "Error",
          description: "Failed to load driver module. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeDriverModule();
  }, [navigate]);

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getDriverVehicles({
        page: 1,
        limit: 100,
        status: filterStatus === 'all' ? undefined : filterStatus,
        type: filterType === 'all' ? undefined : filterType
      });

      let vehiclesData: Vehicle[] = [];
      if (response.success && Array.isArray(response.data)) {
        vehiclesData = response.data;
      } else if (response.success && response.data && 'docs' in response.data && Array.isArray(response.data.docs)) {
        vehiclesData = response.data.docs;
      } else if (response.success && response.data && 'vehicles' in response.data && Array.isArray(response.data.vehicles)) {
        vehiclesData = response.data.vehicles;
      } else {
        console.warn('Unexpected response structure:', response);
        vehiclesData = [];
      }

      setVehicles(vehiclesData);
      setError(null);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setError('Failed to load vehicles. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load vehicles. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case "home":
        navigate('/driver');
        break;
      case "requests":
        navigate('/driver/requests');
        break;
      case "profile":
        navigate('/driver/profile');
        break;
      default:
        navigate('/driver/myvehicle');
    }
  };

  const handleAddVehicle = async (vehicleData: CreateVehicleData, images: File[]) => {
    try {
      setIsSubmitting(true);

      const response = await vehicleApi.createVehicle(vehicleData);

      if (response.success) {
        // Upload images if provided
        const created = response.data as any;
        const vehicleId = created?._id || created?.data?._id;
        if (vehicleId && images && images.length > 0) {
          await vehicleApi.uploadVehicleImages(vehicleId, images);
        }
        toast({
          title: "Vehicle Added!",
          description: `${vehicleData.brand} ${vehicleData.pricingReference?.vehicleModel || ''} has been successfully added to your fleet.`,
          variant: "default",
        });

        setShowAddDialog(false);
        await loadVehicles(); // Reload vehicles
      }
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVehicle = async (vehicleId: string, updates: UpdateVehicleData) => {
    try {
      setIsSubmitting(true);

      const response = await vehicleApi.updateVehicle(vehicleId, updates);

      if (response.success) {
        toast({
          title: "Vehicle Updated!",
          description: "Vehicle details have been successfully updated.",
          variant: "default",
        });

        setEditingVehicle(null);
        await loadVehicles(); // Reload vehicles
      }
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const response = await vehicleApi.deleteVehicle(vehicleId);

      if (response.success) {
        toast({
          title: "Vehicle Removed!",
          description: "Vehicle has been successfully removed from your fleet.",
          variant: "destructive",
        });

        await loadVehicles(); // Reload vehicles
      }
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (vehicleId: string, newStatus: 'active' | 'inactive' | 'maintenance') => {
    try {
      const response = await vehicleApi.updateVehicleAvailability(vehicleId, { isAvailable: newStatus === 'active' });

      if (response.success) {
        toast({
          title: "Status Updated!",
          description: `Vehicle status changed to ${newStatus}.`,
          variant: "default",
        });

        await loadVehicles(); // Reload vehicles
      }
    } catch (error: any) {
      console.error('Error updating vehicle status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageNavigation = (vehicleId: string, direction: 'prev' | 'next' | number) => {
    const vehicle = vehicles.find(v => v._id === vehicleId);
    if (!vehicle) return;

    const currentIndex = currentImageIndex[vehicleId] || 0;
    let newIndex;

    if (typeof direction === 'number') {
      // Direct index navigation
      newIndex = direction;
    } else if (direction === 'prev') {
      newIndex = currentIndex === 0 ? vehicle.images.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === vehicle.images.length - 1 ? 0 : currentIndex + 1;
    }

    // Ensure index is within bounds
    if (newIndex >= 0 && newIndex < vehicle.images.length) {
      setCurrentImageIndex(prev => ({ ...prev, [vehicleId]: newIndex }));
    }
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setViewingVehicle(vehicle);
    setDetailImageIndex(0);
  };

  const handleDetailImageNavigation = (direction: 'prev' | 'next') => {
    if (!viewingVehicle) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = detailImageIndex === 0 ? viewingVehicle.images.length - 1 : detailImageIndex - 1;
    } else {
      newIndex = detailImageIndex === viewingVehicle.images.length - 1 ? 0 : detailImageIndex + 1;
    }
    setDetailImageIndex(newIndex);
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.pricingReference?.vehicleModel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());

    // Fix the status filtering logic
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = vehicle.isAvailable === true;
    } else if (filterStatus === 'inactive') {
      matchesStatus = vehicle.isAvailable === false;
    } else if (filterStatus === 'maintenance') {
      // For now, use isActive as a proxy for maintenance status
      matchesStatus = vehicle.isActive === false;
    }
    // If filterStatus is 'all', matchesStatus remains true

    const matchesType = filterType === "all" || vehicle.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading driver module...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // Full-Screen Add Vehicle Page (no bottom navigation)
  if (showAddDialog) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Full Page Sticky Header */}
        <div className="bg-white text-gray-900 px-4 py-3 flex items-center sticky top-0 z-30 relative border-b border-gray-100">
          <button
            type="button"
            onClick={() => setShowAddDialog(false)}
            className="relative z-10 w-10 h-10 -ml-2 text-gray-800 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 absolute left-0 right-0 text-center pointer-events-none">
            Add New Vehicle
          </h1>
        </div>

        {/* Full Page Scrollable Content */}
        <div className="flex-1 px-4 pt-5 pb-4 max-w-2xl mx-auto w-full">
          <AddVehicleForm
            mode="create"
            onSubmit={handleAddVehicle}
            onCancel={() => setShowAddDialog(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    );
  }

  // Full-Screen Edit Vehicle Page (no bottom navigation)
  if (editingVehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Full Page Sticky Header */}
        <div className="bg-white text-gray-900 px-4 py-3 flex items-center sticky top-0 z-30 relative border-b border-gray-100">
          <button
            type="button"
            onClick={() => setEditingVehicle(null)}
            className="relative z-10 w-10 h-10 -ml-2 text-gray-800 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 absolute left-0 right-0 text-center pointer-events-none truncate px-12">
            Edit {editingVehicle.brand || 'Vehicle'}
          </h1>
        </div>

        {/* Full Page Scrollable Content */}
        <div className="flex-1 px-4 pt-5 pb-4 max-w-2xl mx-auto w-full">
          <AddVehicleForm
            mode="edit"
            initial={({
              type: editingVehicle.type as any,
              brand: editingVehicle.brand || '',
              color: editingVehicle.color || '',
              fuelType: editingVehicle.fuelType as any || 'petrol',
              seatingCapacity: Number(editingVehicle.seatingCapacity) || 4,
              engineCapacity: editingVehicle.engineCapacity || undefined,
              mileage: editingVehicle.mileage || undefined,
              isAc: editingVehicle.isAc || false,
              isSleeper: editingVehicle.isSleeper || false,
              amenities: editingVehicle.amenities || [],
              registrationNumber: editingVehicle.registrationNumber || '',
              chassisNumber: editingVehicle.chassisNumber || '',
              engineNumber: editingVehicle.engineNumber || '',
              insuranceNumber: editingVehicle.documents?.insurance?.number || '',
              insuranceExpiryDate: editingVehicle.documents?.insurance?.expiryDate ? new Date(editingVehicle.documents.insurance.expiryDate).toISOString().split('T')[0] : '',
              fitnessNumber: editingVehicle.documents?.fitness?.number || '',
              fitnessExpiryDate: editingVehicle.documents?.fitness?.expiryDate ? new Date(editingVehicle.documents.fitness.expiryDate).toISOString().split('T')[0] : '',
              permitNumber: editingVehicle.documents?.permit?.number || '',
              permitExpiryDate: editingVehicle.documents?.permit?.expiryDate ? new Date(editingVehicle.documents.permit.expiryDate).toISOString().split('T')[0] : '',
              pucNumber: editingVehicle.documents?.puc?.number || '',
              pucExpiryDate: editingVehicle.documents?.puc?.expiryDate ? new Date(editingVehicle.documents.puc.expiryDate).toISOString().split('T')[0] : '',
              pricingReference: {
                category: (editingVehicle.pricingReference?.category || editingVehicle.type || 'car') as any,
                vehicleType: editingVehicle.pricingReference?.vehicleType || '',
                vehicleModel: editingVehicle.pricingReference?.vehicleModel || editingVehicle.brand || ''
              },
              workingDays: editingVehicle.schedule?.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
              workingHoursStart: editingVehicle.schedule?.workingHours?.start || '06:00',
              workingHoursEnd: editingVehicle.schedule?.workingHours?.end || '22:00',
              operatingCities: editingVehicle.operatingArea?.cities || [],
              operatingStates: editingVehicle.operatingArea?.states || [],
              vehicleLocation: editingVehicle.vehicleLocation || {
                latitude: 0,
                longitude: 0,
                address: '',
                city: '',
                state: ''
              }
            } as any)}
            existingImages={(editingVehicle.images || []) as any}
            isSubmitting={isSubmitting}
            onCancel={() => setEditingVehicle(null)}
            onSubmit={async (updates, newImages, deleteImageIds) => {
              await handleEditVehicle(editingVehicle._id, updates as any);
              if (deleteImageIds && deleteImageIds.length) {
                for (const imgId of deleteImageIds) {
                  try { await vehicleApi.removeVehicleImage(editingVehicle._id, imgId); } catch { }
                }
              }
              if (newImages && newImages.length) {
                await vehicleApi.uploadVehicleImages(editingVehicle._id, newImages);
              }
              await loadVehicles();
              setEditingVehicle(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Full-Screen Vehicle Details View (Compact single-screen layout, no scroll needed)
  if (viewingVehicle) {
    const vehicleName = viewingVehicle.brand?.toLowerCase() === viewingVehicle.pricingReference?.vehicleModel?.toLowerCase()
      ? viewingVehicle.brand
      : `${viewingVehicle.brand || ''} ${viewingVehicle.pricingReference?.vehicleModel || ''}`.trim() || 'Vehicle Details';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between overflow-hidden">
        {/* Top Header - Compact and matching app style */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30 relative shrink-0">
          <button
            type="button"
            onClick={() => setViewingVehicle(null)}
            className="relative z-10 p-1.5 -ml-1 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm sm:text-base font-bold tracking-wide absolute left-0 right-0 text-center pointer-events-none truncate px-14">
            {vehicleName}
          </h1>
          <button
            type="button"
            onClick={() => setViewingVehicle(null)}
            className="relative z-10 p-1.5 -mr-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Single Page Content */}
        <div className="flex-1 p-3 flex flex-col justify-between gap-2 overflow-y-auto max-w-[480px] mx-auto w-full">
          {/* 1. Vehicle Image Box & Quick Status Badges */}
          <div className="relative h-36 sm:h-40 rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900/5 shadow-2xs shrink-0">
            {viewingVehicle.images && viewingVehicle.images.length > 0 ? (
              <div
                className="flex transition-transform duration-300 ease-in-out w-full h-full"
                style={{ transform: `translateX(-${detailImageIndex * 100}%)` }}
              >
                {viewingVehicle.images.map((image, index) => (
                  <img
                    key={image._id || index}
                    src={image.url}
                    alt={`${viewingVehicle.brand} - ${index + 1}`}
                    className="w-full h-full object-contain flex-shrink-0 bg-slate-50"
                  />
                ))}
              </div>
            ) : (
              <PlaceholderImage vehicleType={viewingVehicle.type} className="w-full h-full" />
            )}

            {/* Image Navigation Arrows */}
            {viewingVehicle.images && viewingVehicle.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => handleDetailImageNavigation('prev')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all z-10 shadow-xs"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDetailImageNavigation('next')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all z-10 shadow-xs"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium border-0">
                    {detailImageIndex + 1}/{viewingVehicle.images.length}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* 2. Vehicle Details List (Key - Value) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs divide-y divide-slate-100 shrink-0 text-sm">
            <div className="flex items-center justify-between py-2.5 first:pt-0">
              <span className="text-slate-600 font-medium text-sm">Vehicle Name</span>
              <span className="font-bold text-slate-900 text-sm sm:text-base">{vehicleName}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Status</span>
              <span className={`inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-lg ${
                viewingVehicle.isAvailable
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
              }`}>
                <span className={`w-2 h-2 rounded-full ${viewingVehicle.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {viewingVehicle.isAvailable ? 'Available' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Verification</span>
              <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg ${
                viewingVehicle.isVerified
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              }`}>
                {viewingVehicle.isVerified ? '✓ Verified' : '⏳ Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Type / Category</span>
              <span className="font-semibold text-slate-900 capitalize text-sm">
                {viewingVehicle.type} {viewingVehicle.pricingReference?.vehicleType ? `(${viewingVehicle.pricingReference.vehicleType})` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Registration Number</span>
              <span className="font-mono font-bold text-slate-900 uppercase text-sm tracking-wide">
                {viewingVehicle.registrationNumber || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Fuel Type</span>
              <span className="font-semibold text-slate-900 capitalize text-sm">
                {viewingVehicle.fuelType || 'Petrol'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Seating Capacity</span>
              <span className="font-semibold text-slate-900 text-sm">
                {viewingVehicle.seatingCapacity || 4} Seater
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-600 font-medium text-sm">Air Conditioning (AC)</span>
              <span className="font-semibold text-slate-900 text-sm">
                {viewingVehicle.isAc ? 'Yes (AC)' : 'No (Non-AC)'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 last:pb-0">
              <span className="text-slate-600 font-medium text-sm">Total Trips</span>
              <span className="font-bold text-blue-600 text-sm">
                {viewingVehicle.statistics?.totalTrips || 0} Trips
              </span>
            </div>
          </div>

          {/* Amenities / Location (Compact Chip Strip) */}
          {((viewingVehicle.amenities && viewingVehicle.amenities.length > 0) || viewingVehicle.vehicleLocation?.address) && (
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs shrink-0 space-y-1.5">
              {viewingVehicle.vehicleLocation?.address && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate font-medium">{viewingVehicle.vehicleLocation.address}</span>
                </div>
              )}
              {viewingVehicle.amenities && viewingVehicle.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewingVehicle.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 shrink-0 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const target = viewingVehicle;
                setViewingVehicle(null);
                setEditingVehicle(target);
              }}
              className="h-9 rounded-xl text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const newStatus = viewingVehicle.isAvailable ? 'inactive' : 'active';
                await handleToggleStatus(viewingVehicle._id, newStatus);
                setViewingVehicle(prev => prev ? ({ ...prev, isAvailable: newStatus === 'active' }) : null);
              }}
              className={`h-9 rounded-xl text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-1.5 ${
                viewingVehicle.isAvailable
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>{viewingVehicle.isAvailable ? 'Set Inactive' : 'Set Available'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-y-auto">
      {/* Top Header with Add Vehicle Button */}
      <div className="bg-white shadow-xs border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              My Vehicles
            </h1>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-xs h-9 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 pb-24">
        {/* Vehicles List */}
        <div className="space-y-4 mb-8">

          {filteredVehicles.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-blue-50/80 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Car className="w-8 h-8 text-blue-600/70" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">No Vehicle Added</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-5 max-w-xs mx-auto">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                  ? "Try adjusting your search criteria or filters."
                  : "Get started by adding your first vehicle to the fleet."
                }
              </p>
              {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs sm:text-sm font-semibold shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Your First Vehicle
                </Button>
              )}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onEdit={() => setEditingVehicle(vehicle)}
                onDelete={() => handleDeleteVehicle(vehicle._id)}
                onToggleStatus={(status) => handleToggleStatus(vehicle._id, status)}
                onViewDetails={() => handleViewDetails(vehicle)}
                currentImageIndex={currentImageIndex[vehicle._id] || 0}
                onImageNavigation={handleImageNavigation}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <DriverBottomNavigation />
    </div>
  );
};

// Placeholder Image Component
const PlaceholderImage = ({ vehicleType, className }: { vehicleType: string; className?: string }) => {
  const getVehicleIcon = () => {
    switch (vehicleType) {
      case 'bus':
        return '🚌';
      case 'car':
        return '🚗';
      case 'auto':
        return '🛺';
      default:
        return '🚗';
    }
  };

  return (
    <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center ${className}`}>
      <div className="text-4xl mb-2">{getVehicleIcon()}</div>
      <p className="text-gray-500 text-sm text-center">No image available</p>
    </div>
  );
};

// Vehicle Card Component
const VehicleCard = ({
  vehicle,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
  currentImageIndex,
  onImageNavigation
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (status: 'active' | 'inactive' | 'maintenance') => void;
  onViewDetails: () => void;
  currentImageIndex: number;
  onImageNavigation: (vehicleId: string, direction: 'prev' | 'next' | number) => void;
}) => {
  const getStatusColor = (isAvailable: boolean) => {
    return isAvailable ? 'bg-green-600' : 'bg-gray-600';
  };

  const getStatusText = (isAvailable: boolean) => {
    return isAvailable ? 'Active' : 'Inactive';
  };

  const handleImageNavigation = (direction: 'prev' | 'next' | number) => {
    if (typeof direction === 'number') {
      onImageNavigation(vehicle._id, direction);
    } else {
      onImageNavigation(vehicle._id, direction);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 border border-slate-200/90 shadow-2xs bg-white rounded-2xl overflow-hidden group">
      <CardContent className="p-4 sm:p-5">
        {/* Top Section: Vehicle Image + Title & Details + Edit/Delete */}
        <div className="flex gap-3.5 sm:gap-4 items-start">
          {/* Vehicle Image */}
          <div className="relative flex-shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex items-center justify-center p-1">
              {vehicle.images && vehicle.images.length > 0 ? (
                <div
                  className="flex transition-transform duration-300 ease-in-out w-full h-full"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {vehicle.images.map((image, index) => (
                    <img
                      key={image._id || index}
                      src={image.url}
                      alt={`${vehicle.brand} ${vehicle.pricingReference?.vehicleModel || ''}`}
                      className="w-full h-full object-contain flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.parentElement?.querySelector('.placeholder-fallback');
                        if (placeholder) {
                          (placeholder as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ))}
                  {vehicle.images.map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="w-full h-full flex-shrink-0 hidden placeholder-fallback"
                    >
                      <PlaceholderImage vehicleType={vehicle.type} className="w-full h-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <PlaceholderImage vehicleType={vehicle.type} className="w-full h-full" />
              )}

              {/* Image Navigation for multiple images */}
              {vehicle.images && vehicle.images.length > 1 && (
                <>
                  <button
                    onClick={() => handleImageNavigation('prev')}
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/70 text-white p-1 rounded-full hover:bg-black/90 transition-all duration-200 hover:scale-110 z-10 opacity-0 group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleImageNavigation('next')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/70 text-white p-1 rounded-full hover:bg-black/90 transition-all duration-200 hover:scale-110 z-10 opacity-0 group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {/* Image Counter */}
                  <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-black/80 text-white text-[9px] px-2 py-0.5 rounded-full font-medium">
                      {currentImageIndex + 1}/{vehicle.images.length}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
            <div>
              {/* Row 1: Vehicle Name + Edit/Delete */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate leading-snug">
                  {vehicle.brand?.toLowerCase() === vehicle.pricingReference?.vehicleModel?.toLowerCase()
                    ? vehicle.brand
                    : `${vehicle.brand || ''} ${vehicle.pricingReference?.vehicleModel || ''}`.trim() || 'Vehicle'}
                </h3>

                {/* Action Buttons: Edit & Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 w-8 p-0 rounded-xl text-slate-600 border-slate-200 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    title="Edit Vehicle"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                        title="Remove Vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Vehicle</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {vehicle.brand} {vehicle.pricingReference?.vehicleModel || ''} from your fleet? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remove Vehicle
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Row 2: Sedan • Petrol • Registration • Approval Status */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 capitalize">
                  {vehicle.pricingReference?.vehicleType || vehicle.type}
                </span>
                {vehicle.fuelType && (
                  <span className="text-xs text-slate-500 font-medium capitalize">
                    • {vehicle.fuelType}
                  </span>
                )}
                {vehicle.registrationNumber && (
                  <span className="text-xs font-mono font-medium text-slate-700 uppercase">
                    • {vehicle.registrationNumber}
                  </span>
                )}
                {(vehicle as any).approvalStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    ⏳ Under Review
                  </span>
                )}
                {(vehicle as any).approvalStatus === 'rejected' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    ❌ Rejected
                  </span>
                )}
              </div>

              {vehicle.vehicleLocation?.address && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{vehicle.vehicleLocation.address}</span>
                </div>
              )}
            </div>

            {/* Row 3: Active Dropdown + Trip Count (in middle) + View Details */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-0.5">
              <div className="w-26 sm:w-28 shrink-0">
                <Select
                  value={vehicle.isAvailable ? 'active' : 'inactive'}
                  onValueChange={(value: 'active' | 'inactive' | 'maintenance') =>
                    onToggleStatus(value)
                  }
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium border-slate-200 bg-white hover:border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 px-2.5 py-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </SelectItem>
                    <SelectItem value="inactive" className="text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Inactive
                      </span>
                    </SelectItem>
                    <SelectItem value="maintenance" className="text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Maintenance
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trip Count (Between Active and View Details) */}
              <div className="text-xs font-medium text-slate-500 px-1 whitespace-nowrap">
                <span className="font-bold text-blue-600">{vehicle.statistics?.totalTrips || 0}</span> Trips
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3.5 text-xs font-bold rounded-xl text-slate-700 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 transition-all shadow-2xs shrink-0"
                onClick={onViewDetails}
              >
                View Details
              </Button>
            </div>
          </div>
        </div>

        {/* Pricing Rates (if available) */}
        {vehicle.computedPricing && (
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex-1 text-center p-1.5 bg-purple-50/80 rounded-xl border border-purple-100">
              <span className="text-xs font-bold text-purple-700">
                ₹{vehicle.computedPricing.distancePricing?.oneWay?.['50km'] || 0}/km
              </span>
              <span className="text-[10px] text-purple-500 ml-1 font-medium">50km Rate</span>
            </div>
            <div className="flex-1 text-center p-1.5 bg-emerald-50/80 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-700">
                ₹{vehicle.computedPricing.distancePricing?.oneWay?.['100km'] || 0}/km
              </span>
              <span className="text-[10px] text-emerald-500 ml-1 font-medium">100km Rate</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverMyVehicle;