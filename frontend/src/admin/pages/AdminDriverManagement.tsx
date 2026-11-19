import { useState, useEffect } from "react";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Plus,
  Download,
  RefreshCw,
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Award,
  FileText,
  Car as CarIcon,
  Bus as BusIcon,
  Truck,
  Bike,
  X,
  Key,
  User,
  Building,
  Fuel,
  Palette,
  Settings,
  Route,
  Wifi,
  Snowflake,
  Bed,
  Zap,
  Shield as ShieldIcon,
  EyeOff,
  AlertTriangle,
  Check,
  Ban,
  Filter,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Landmark
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { adminDrivers, adminVehicles, fetchAllPages } from "@/services/adminApi";
import { resolveImageUrl } from "@/utils/imageUrl";

// All 28 Indian States and 8 Union Territories
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  profilePicture?: string;
  status: 'active' | 'suspended' | 'pending' | 'verified';
  createdAt: string;
  totalRides: number;
  totalEarnings: number;
  rating: number;
  isVerified: boolean;
  isApproved: boolean;
  documents?: {
    drivingLicense?: {
      number?: string;
      expiryDate?: string;
      isVerified?: boolean;
      image?: string;
    };
    vehicleRC?: {
      number?: string;
      expiryDate?: string;
      isVerified?: boolean;
      image?: string;
    };
    insurance?: {
      number?: string;
      expiryDate?: string;
      isVerified?: boolean;
      image?: string;
    };
    fitness?: {
      number?: string;
      expiryDate?: string;
      isVerified?: boolean;
      image?: string;
    };
    permit?: {
      number?: string;
      expiryDate?: string;
      isVerified?: boolean;
      image?: string;
    };
  };
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
  };
  earnings?: {
    wallet?: {
      balance?: number;
    };
    commission?: number;
  };
  availability?: {
    isOnline?: boolean;
    workingHours?: {
      start?: string;
      end?: string;
    };
    workingDays?: string[];
  };
  agreement?: {
    isAccepted?: boolean;
    acceptedAt?: string;
    ipAddress?: string;
  };
  lastLogin?: string;
  vehicleDetails?: {
    type?: string;
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    fuelType?: string;
    seatingCapacity?: number;
    registrationNumber?: string;
    isAc?: boolean;
  };
}

interface PendingVehicleRequest {
  _id: string;
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    rating: number;
    status: string;
  };
  type: 'car' | 'bus' | 'auto';
  brand: string;
  model: string;
  year: number;
  color: string;
  registrationNumber: string;
  seatingCapacity: number;
  fuelType: string;
  isAc: boolean;
  isSleeper: boolean;
  amenities: string[];
  pricingReference: {
    category: 'auto' | 'car' | 'bus';
    vehicleType: string;
    vehicleModel: string;
  };
  // Computed pricing field - will be populated with actual pricing data
  computedPricing?: {
    basePrice: number;
    distancePricing: {
      '50km': number;
      '100km': number;
      '150km': number;
      '200km': number;
      '250km': number;
      '300km': number;
    };
    category: string;
    vehicleType: string;
    vehicleModel: string;
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface NewDriverForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface EditDriverForm {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isApproved: boolean;
  isVerified: boolean;
  isActive: boolean;
  
  // Address Information (Sequence: Country, State, City, Pincode, Street)
  country: string;
  state: string;
  city: string;
  pincode: string;
  street: string;

  // Bank & Payout Information
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;

  // Additional Information
  totalTrips: number;
  totalEarnings: number;
  rating: number;
}

interface Vehicle {
  _id: string;
  type: 'car' | 'bus' | 'auto';
  brand: string;
  model?: string;
  year?: number;
  color?: string;
  registrationNumber: string;
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'pending';
  currentLocation?: {
    address: string;
  };
  vehicleLocation?: {
    address: string;
  };
  maintenance?: {
    lastService?: string;
    nextService?: string;
  };
  statistics: {
    totalTrips: number;
  };
  ratings: {
    average: number;
  };
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  seatingCapacity: number;
  documents: {
    rc: {
      isVerified: boolean;
      image?: string;
    };
    insurance: {
      isVerified: boolean;
      image?: string;
    };
    permit: {
      isVerified: boolean;
    };
    fitness: {
      isVerified: boolean;
    };
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isAvailable: boolean;
  isActive: boolean;
  pricingReference?: {
    category: 'auto' | 'car' | 'bus';
    vehicleType: string;
    vehicleModel: string;
  };
  // Computed pricing field - will be populated with actual pricing data
  computedPricing?: {
    basePrice: number;
    distancePricing: {
      '50km': number;
      '100km': number;
      '150km': number;
      '200km': number;
      '250km': number;
      '300km': number;
    };
    category: string;
    vehicleType: string;
    vehicleModel: string;
  };
}

interface ComputedPricing {
  category: string;
  vehicleType: string;
  vehicleModel: string;
  distancePricing: {
    '50km': number;
    '100km': number;
    '150km': number;
  };
}

interface DriverRequest {
  _id: string;
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileImage?: string;
    isActive: boolean;
    isVerified: boolean;
    isApproved: boolean;
    createdAt: string;
    updatedAt: string;
  };
  vehicle: {
    _id: string;
    type: 'bus' | 'car' | 'auto';
    brand: string;
    model: string;
    year: number;
    color: string;
    fuelType: string;
    transmission: string;
    seatingCapacity: number;
    engineCapacity?: number;
    mileage?: number;
    isAc: boolean;
    isSleeper: boolean;
    amenities: string[];
    images: Array<{
      url: string;
      caption?: string;
      isPrimary: boolean;
    }>;
    registrationNumber: string;
    chassisNumber?: string;
    engineNumber?: string;
    operatingArea?: {
      cities: string[];
      states: string[];
      radius: number;
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
    rating: number;
    totalTrips: number;
    totalEarnings: number;
    isActive: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    booked: boolean;
    driver?: {
      _id: string;
      firstName: string;
      lastName: string;
      rating: number;
      phone: string;
    };
    computedPricing?: ComputedPricing;
    pricingReference: {
      category: string;
      vehicleType: string;
      vehicleModel: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const hasRealVehicle = (vehicle?: Driver['vehicleDetails']) => {
  if (!vehicle) return false;
  const brand = vehicle.brand?.trim().toUpperCase();
  if (!brand || brand === 'TBD' || brand === 'PENDING') return false;
  const model = vehicle.model?.trim().toUpperCase();
  if (model === 'TBD' && (!vehicle.registrationNumber || vehicle.registrationNumber.toUpperCase() === 'PENDING')) return false;
  return true;
};

const AdminDriverManagement = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showEditDriver, setShowEditDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  // Document modal states
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{type: string, url: string} | null>(null);
  
  // Vehicle management states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showVehicleDocuments, setShowVehicleDocuments] = useState(false);
  
  // Vehicle approval workflow states
  const [pendingVehicleRequests, setPendingVehicleRequests] = useState<PendingVehicleRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingVehicleRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  
  const [newDriverForm, setNewDriverForm] = useState<NewDriverForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const [editDriverForm, setEditDriverForm] = useState<EditDriverForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    isApproved: false,
    isVerified: false,
    isActive: true,
    country: "India",
    state: "",
    city: "",
    pincode: "",
    street: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    totalTrips: 0,
    totalEarnings: 0,
    rating: 0
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const initializeAdminModule = async () => {
      try {
        setIsLoggedIn(true);
        
        // Debug: Check authentication status
        const adminToken = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');
        console.log('Admin authentication status:', {
          hasToken: !!adminToken,
          hasData: !!adminData,
          tokenLength: adminToken ? adminToken.length : 0
        });
        
        if (adminData) {
          try {
            const parsed = JSON.parse(adminData);
            console.log('Admin data:', parsed);
          } catch (e) {
            console.error('Error parsing admin data:', e);
          }
        }
        
        await loadDrivers();
        await loadPendingVehicles();
      } catch (err) {
        console.error('Error initializing admin module:', err);
        toast({
          title: "Error",
          description: "Failed to load driver management. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeAdminModule();
  }, []);

  const loadDrivers = async () => {
    try {
      console.log('Loading drivers...');
      const response = await fetchAllPages(adminDrivers.getAll, {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      console.log('Drivers response:', response);
      
      // Map the driver data to include status field based on isActive
      const mappedDrivers = (response.data.docs || []).map((driver: any) => ({
        ...driver,
        status: driver.isActive ? 'active' : 'suspended'
      }));
      
      console.log('🔍 Driver mapping debug:');
      console.log('  - Raw driver data sample:', response.data.docs?.[0]);
      console.log('  - Mapped driver sample:', mappedDrivers[0]);
      console.log('  - Total drivers loaded:', mappedDrivers.length);
      setDrivers(mappedDrivers);
    } catch (error) {
      console.error('Error loading drivers:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: "Error",
        description: `Failed to load drivers: ${error.response?.data?.message || error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadPendingVehicles = async () => {
    try {
      console.log('Loading pending vehicles...');
      const response = await adminVehicles.getPendingApprovals(1, 100);
      console.log('Pending vehicles response:', response);
      const requests = response.data.docs || [];
      
      // Pricing is already on each vehicle (synced from Vehicle Models); no request per vehicle
      const requestsWithPricing = requests.map((request) => (
        request.pricingReference
          ? { ...request, computedPricing: { distancePricing: request.pricing?.distancePricing?.oneWay, ...request.pricingReference } }
          : request
      ));
      
      setPendingVehicleRequests(requestsWithPricing);
    } catch (error) {
      console.error('Error loading pending vehicles:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: "Error",
        description: `Failed to load pending vehicle requests: ${error.response?.data?.message || error.message}`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <Award className="w-4 h-4" />;
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'suspended':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleStatusChange = async (driverId: string, newStatus: 'active' | 'suspended' | 'pending' | 'verified') => {
    const driver = drivers.find(d => d._id === driverId);
    if (!driver) return;

    try {
      // Update driver status in the database
      const response = await adminDrivers.updateStatus(driverId, newStatus);
      
      if (response.success) {
        // Update local state only after successful API call
        setDrivers(prev => prev.map(driver => 
          driver._id === driverId ? { 
            ...driver, 
            status: newStatus, 
            isActive: newStatus === 'active' 
          } : driver
        ));
        
        let message = `Driver status changed to ${newStatus}`;
        if (newStatus === 'active' && driver.status === 'suspended') {
          message = `${driver.firstName} ${driver.lastName} has been unsuspended successfully`;
        } else if (newStatus === 'suspended' && driver.status === 'active') {
          message = `${driver.firstName} ${driver.lastName} has been suspended`;
        }
        
        toast({
          title: newStatus === 'active' && driver.status === 'suspended' ? "Driver Unsuspended" : "Status Updated",
          description: message,
          variant: "default",
        });
      } else {
        throw new Error(response.message || 'Failed to update driver status');
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast({
        title: "Error",
        description: "Failed to update driver status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnsuspendDriver = (driverId: string) => {
    handleStatusChange(driverId, 'active');
  };

  const handleBulkStatusChange = async (newStatus: 'active' | 'suspended' | 'pending' | 'verified') => {
    if (selectedDrivers.length === 0) {
      toast({
        title: "No Drivers Selected",
        description: "Please select drivers to update",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update all selected drivers in the database
      const updatePromises = selectedDrivers.map(driverId => 
        adminDrivers.updateStatus(driverId, newStatus)
      );
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(result => result.success).length;
      
      if (successCount > 0) {
        // Update local state only after successful API calls
        const updatedDrivers = drivers.map(driver => {
          if (selectedDrivers.includes(driver._id)) {
            return { 
              ...driver, 
              status: newStatus, 
              isActive: newStatus === 'active' 
            };
          }
          return driver;
        });

        setDrivers(updatedDrivers);
        setSelectedDrivers([]);
        setShowBulkActions(false);

        let message = `${successCount} drivers have been updated to ${newStatus}`;
        if (newStatus === 'active') {
          const suspendedCount = drivers.filter(driver => selectedDrivers.includes(driver._id) && driver.status === 'suspended').length;
          if (suspendedCount > 0) {
            message = `${suspendedCount} suspended drivers have been unsuspended`;
          }
        }

        toast({
          title: newStatus === 'active' ? "Bulk Unsuspend Complete" : "Bulk Update Complete",
          description: message,
        });
      } else {
        throw new Error('Failed to update any drivers');
      }
    } catch (error) {
      console.error('Error updating drivers:', error);
      toast({
        title: "Error",
        description: "Failed to update driver statuses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkUnsuspend = () => {
    const suspendedDrivers = selectedDrivers.filter(driverId => {
      const driver = drivers.find(d => d._id === driverId);
      return driver && driver.status === 'suspended';
    });

    if (suspendedDrivers.length === 0) {
      toast({
        title: "No Suspended Drivers Selected",
        description: "Please select suspended drivers to unsuspend",
        variant: "destructive",
      });
      return;
    }

    handleBulkStatusChange('active');
  };

  const handleBulkDelete = async () => {
    if (selectedDrivers.length === 0) {
      toast({
        title: "No Drivers Selected",
        description: "Please select drivers to delete",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedDrivers.length} drivers? This action cannot be undone.`)) {
      try {
        // Call the backend API to bulk delete drivers
        const response = await adminDrivers.bulkDelete(selectedDrivers);
        
        if (response.success) {
          // Update local state
          const updatedDrivers = drivers.filter(driver => !selectedDrivers.includes(driver._id));
          setDrivers(updatedDrivers);
          setSelectedDrivers([]);
          setShowBulkActions(false);

          toast({
            title: "Bulk Delete Complete",
            description: response.message || `${selectedDrivers.length} drivers have been deleted successfully`,
          });
        } else {
          throw new Error(response.message || 'Failed to delete drivers');
        }
      } catch (error) {
        console.error('Error bulk deleting drivers:', error);
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to delete drivers. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleDriverSelection = (driverId: string) => {
    setSelectedDrivers(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const selectAllDrivers = () => {
    setSelectedDrivers(filteredDrivers.map(driver => driver._id));
  };

  const clearSelection = () => {
    setSelectedDrivers([]);
  };

  // Edit driver functions
  const handleEditDriver = async (driver: Driver) => {
    setEditingDriver(driver);
    setIsSubmitting(true);
    
    // Fetch the latest driver data to ensure we have the most current document information
    try {
      const response = await adminDrivers.getById(driver._id);
      const latestDriver = response.data;
      
      const holderName = latestDriver.bankDetails?.accountHolderName && latestDriver.bankDetails.accountHolderName !== 'PENDING'
        ? latestDriver.bankDetails.accountHolderName
        : `${latestDriver.firstName || ''} ${latestDriver.lastName || ''}`.trim();

      setEditDriverForm({
        firstName: latestDriver.firstName || '',
        lastName: latestDriver.lastName || '',
        email: latestDriver.email || '',
        phone: latestDriver.phone || '',
        isApproved: !!latestDriver.isApproved,
        isVerified: !!latestDriver.isVerified,
        isActive: latestDriver.isActive !== undefined ? latestDriver.isActive : (latestDriver.status === 'active'),
        country: latestDriver.address?.country || 'India',
        state: latestDriver.address?.state || '',
        city: latestDriver.address?.city || '',
        pincode: latestDriver.address?.pincode || '',
        street: latestDriver.address?.street || '',
        accountHolderName: holderName,
        bankName: latestDriver.bankDetails?.bankName && latestDriver.bankDetails.bankName !== 'PENDING' ? latestDriver.bankDetails.bankName : '',
        accountNumber: latestDriver.bankDetails?.accountNumber && latestDriver.bankDetails.accountNumber !== 'PENDING' ? latestDriver.bankDetails.accountNumber : '',
        ifscCode: latestDriver.bankDetails?.ifscCode && latestDriver.bankDetails.ifscCode !== 'PENDING' ? latestDriver.bankDetails.ifscCode : '',
        totalTrips: latestDriver.totalRides || 0,
        totalEarnings: latestDriver.totalEarnings || 0,
        rating: latestDriver.rating || 0
      });
    } catch (error) {
      console.error('Error fetching latest driver data:', error);
      // Fallback to the driver data we have
      const holderName = (driver as any).bankDetails?.accountHolderName && (driver as any).bankDetails.accountHolderName !== 'PENDING'
        ? (driver as any).bankDetails.accountHolderName
        : `${driver.firstName || ''} ${driver.lastName || ''}`.trim();

      setEditDriverForm({
        firstName: driver.firstName || '',
        lastName: driver.lastName || '',
        email: driver.email || '',
        phone: driver.phone || '',
        isApproved: !!(driver as any).isApproved,
        isVerified: !!(driver as any).isVerified,
        isActive: driver.status === 'active',
        country: driver.address?.country || 'India',
        state: driver.address?.state || '',
        city: driver.address?.city || '',
        pincode: driver.address?.pincode || '',
        street: driver.address?.street || '',
        accountHolderName: holderName,
        bankName: (driver as any).bankDetails?.bankName && (driver as any).bankDetails.bankName !== 'PENDING' ? (driver as any).bankDetails.bankName : '',
        accountNumber: (driver as any).bankDetails?.accountNumber && (driver as any).bankDetails.accountNumber !== 'PENDING' ? (driver as any).bankDetails.accountNumber : '',
        ifscCode: (driver as any).bankDetails?.ifscCode && (driver as any).bankDetails.ifscCode !== 'PENDING' ? (driver as any).bankDetails.ifscCode : '',
        totalTrips: driver.totalRides || 0,
        totalEarnings: driver.totalEarnings || 0,
        rating: driver.rating || 0
      });
    } finally {
      setIsSubmitting(false);
    }
    
    setShowEditDriver(true);
  };

  const handleEditFormChange = (field: keyof EditDriverForm, value: any) => {
    setEditDriverForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateDriver = async () => {
    if (!editingDriver) return;

    if (!editDriverForm.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }
    if (!editDriverForm.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      });
      return;
    }
    if (!editDriverForm.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        firstName: editDriverForm.firstName.trim(),
        lastName: editDriverForm.lastName.trim(),
        email: editDriverForm.email.trim(),
        phone: editDriverForm.phone.trim(),
        isApproved: editDriverForm.isApproved,
        isVerified: editDriverForm.isVerified,
        isActive: editDriverForm.isActive,
        address: {
          country: editDriverForm.country || 'India',
          state: editDriverForm.state.trim(),
          city: editDriverForm.city.trim(),
          pincode: editDriverForm.pincode.trim(),
          street: editDriverForm.street.trim()
        },
        bankDetails: {
          accountHolderName: editDriverForm.accountHolderName.trim() || `${editDriverForm.firstName.trim()} ${editDriverForm.lastName.trim()}`,
          bankName: editDriverForm.bankName.trim() || 'PENDING',
          accountNumber: editDriverForm.accountNumber.trim() || 'PENDING',
          ifscCode: editDriverForm.ifscCode.trim().toUpperCase() || 'PENDING'
        }
      };

      const response = await adminDrivers.update(editingDriver._id, payload);
      
      if (response.success) {
        toast({
          title: "Driver Updated",
          description: `${editDriverForm.firstName} ${editDriverForm.lastName}'s information has been updated successfully`,
          variant: "default",
        });

        setShowEditDriver(false);
        setEditingDriver(null);
        await loadDrivers();
      } else {
        toast({
          title: "Update Failed",
          description: response.message || "Failed to update driver",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Update driver error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update driver. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Vehicle management functions
  const loadVehicles = async () => {
    try {
      console.log('Loading vehicles...');
      const response = await fetchAllPages(adminVehicles.getAll, {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      console.log('Vehicles response:', response);
      const vehiclesData = response.data.docs || [];
      
      // Pricing is already on each vehicle (synced from Vehicle Models); no request per vehicle
      const vehiclesWithPricing = vehiclesData.map((vehicle) => (
        vehicle.pricingReference
          ? { ...vehicle, computedPricing: { distancePricing: vehicle.pricing?.distancePricing?.oneWay, ...vehicle.pricingReference } }
          : vehicle
      ));
      
      setVehicles(vehiclesWithPricing);
      setFilteredVehicles(vehiclesWithPricing);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: "Error",
        description: `Failed to load vehicles: ${error.response?.data?.message || error.message}`,
        variant: "destructive",
      });
    }
  };

  const getVehicleStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleVehicleAction = (action: string, vehicleId: string) => {
    switch (action) {
      case 'view':
        const vehicle = vehicles.find(v => v._id === vehicleId);
        setSelectedVehicle(vehicle || null);
        setShowVehicleDetails(true);
        break;
      case 'edit':
        toast({
          title: "Edit Vehicle",
          description: "Edit functionality will be implemented",
        });
        break;
      case 'delete':
        toast({
          title: "Delete Vehicle",
          description: "Delete functionality will be implemented",
        });
        break;
    }
  };

  // Filter vehicles
  useEffect(() => {
    let filtered = vehicles;

    if (vehicleSearchTerm) {
      const lowerSearch = vehicleSearchTerm.toLowerCase();
      filtered = filtered.filter(vehicle => {
        const brand = ((vehicle as any).brand || '').toLowerCase();
        const model = ((vehicle as any).pricingReference?.vehicleModel || (vehicle as any).model || '').toLowerCase();
        const reg = ((vehicle as any).registrationNumber || '').toLowerCase();
        const driverName = (vehicle as any).driver ? `${(vehicle as any).driver.firstName || ''} ${(vehicle as any).driver.lastName || ''}`.trim().toLowerCase() : '';

        return (
          brand.includes(lowerSearch) ||
          model.includes(lowerSearch) ||
          reg.includes(lowerSearch) ||
          driverName.includes(lowerSearch)
        );
      });
    }

    if (vehicleStatusFilter !== "all") {
      filtered = filtered.filter(vehicle => vehicle.status === vehicleStatusFilter);
    }

    if (vehicleTypeFilter !== "all") {
      filtered = filtered.filter(vehicle => vehicle.type === vehicleTypeFilter);
    }

    setFilteredVehicles(filtered);
  }, [vehicles, vehicleSearchTerm, vehicleStatusFilter, vehicleTypeFilter]);

  const handleVerificationToggle = (driverId: string) => {
    const driver = drivers.find(d => d._id === driverId);
    if (!driver) return;

    setDrivers(prev => prev.map(driver => 
      driver._id === driverId ? { ...driver, isVerified: !driver.isVerified } : driver
    ));
    
    toast({
      title: driver.isVerified ? "Verification Removed" : "Driver Verified",
      description: driver.isVerified 
        ? `${driver.firstName} ${driver.lastName}'s verification has been removed` 
        : `${driver.firstName} ${driver.lastName} has been verified successfully`,
      variant: "default",
    });
  };


  const handleBulkDocumentApproval = () => {
    const driversWithoutDocs = selectedDrivers.filter(driverId => {
      const driver = drivers.find(d => d._id === driverId);
      return driver && !(driver.documents.drivingLicense.isVerified && driver.documents.vehicleRC.isVerified);
    });

    if (driversWithoutDocs.length === 0) {
      toast({
        title: "No Drivers Selected",
        description: "Please select drivers without approved documents",
        variant: "destructive",
      });
      return;
    }

    setDrivers(prev => prev.map(driver => 
      selectedDrivers.includes(driver._id) ? { ...driver, documents: { ...driver.documents, drivingLicense: { ...driver.documents.drivingLicense, isVerified: true }, vehicleRC: { ...driver.documents.vehicleRC, isVerified: true } } } : driver
    ));

    setSelectedDrivers([]);
    setShowBulkActions(false);

    toast({
      title: "Bulk Document Approval Complete",
      description: `${driversWithoutDocs.length} drivers' documents have been approved`,
    });
  };

  const handleDeleteDriver = async (driverId: string) => {
    try {
      // Call the backend API to delete the driver
      const response = await adminDrivers.deleteDriver(driverId);
      
      if (response.success) {
        // Update local state
        setDrivers(prev => prev.filter(driver => driver._id !== driverId));
        
        // Clear selection if the deleted driver was selected
        setSelectedDrivers(prev => prev.filter(id => id !== driverId));
        
        toast({
          title: "Driver Deleted",
          description: response.message || "Driver has been permanently removed",
          variant: "destructive",
        });
      } else {
        throw new Error(response.message || 'Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to delete driver. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Vehicle approval workflow functions
  const handleApproveVehicle = async (requestId: string) => {
    try {
      await adminVehicles.approveVehicle(requestId, adminNotes);
      
      // Update local state
      setPendingVehicleRequests(prev => prev.filter(request => request._id !== requestId));
      
      // Refresh data
      await loadPendingVehicles();
      await loadDrivers();
      
      toast({
        title: "Vehicle Approved",
        description: "Vehicle has been approved and added to driver's fleet",
        variant: "default",
      });

      setShowRequestDetails(false);
      setSelectedRequest(null);
      setAdminNotes("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectVehicle = async (requestId: string) => {
    try {
      const reason = prompt("Please provide a reason for rejection:");
      if (!reason) return;
      
      await adminVehicles.rejectVehicle(requestId, reason, adminNotes);
      
      // Update local state
      setPendingVehicleRequests(prev => prev.filter(request => request._id !== requestId));
      
      // Refresh data
      await loadPendingVehicles();
      
      toast({
        title: "Vehicle Rejected",
        description: "Vehicle request has been rejected",
        variant: "destructive",
      });

      setShowRequestDetails(false);
      setSelectedRequest(null);
      setAdminNotes("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'car': return <CarIcon className="w-4 h-4 text-green-600" />;
      case 'bus': return <BusIcon className="w-4 h-4 text-purple-600" />;
      case 'auto': return <CarIcon className="w-4 h-4 text-blue-600" />;
      default: return <CarIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setNewDriverForm(prev => ({
      ...prev,
      driverPassword: password,
      confirmPassword: password
    }));
  };

  // Handle form input changes
  const handleFormChange = (field: keyof NewDriverForm, value: any) => {
    setNewDriverForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Vehicle/document upload handlers removed in simplified flow

  // Submit new driver form
  const handleSubmitNewDriver = async () => {
    if (!newDriverForm.firstName || !newDriverForm.lastName || !newDriverForm.phone || !newDriverForm.password || newDriverForm.password !== newDriverForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields (first name, last name, phone, password) and ensure passwords match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call the backend API to create driver
      const response = await adminDrivers.create({
        firstName: newDriverForm.firstName,
        lastName: newDriverForm.lastName,
        email: newDriverForm.email || undefined, // Only send if provided
        phone: newDriverForm.phone,
        password: newDriverForm.password
      });

      if (response.success) {
        toast({
          title: "Driver Created Successfully",
          description: `${newDriverForm.firstName} ${newDriverForm.lastName} has been created and can now login with phone ${newDriverForm.phone}`,
          variant: "default",
        });

        // Reset form
        setNewDriverForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: ""
        });
        
        setShowAddDriver(false);
        setGeneratedPassword("");
        
        // Refresh the drivers list
        await loadDrivers();
      } else {
        throw new Error(response.message || 'Failed to create driver');
      }
      
    } catch (error) {
      console.error('Error creating driver:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to create driver. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter drivers
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = `${driver.firstName} ${driver.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm) ||
                         driver.documents.drivingLicense.number.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
    const matchesVerification = verificationFilter === "all" || 
                               (verificationFilter === "verified" && driver.isVerified) ||
                               (verificationFilter === "unverified" && !driver.isVerified);
    
    return matchesSearch && matchesStatus && matchesVerification;
  });

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


  if (!isLoggedIn) {
    return null;
  }

  return (
    <AdminLayout>
      {/* Header with Search & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Driver Management</h1>
          <p className="text-gray-500 text-xs lg:text-sm mt-0.5">Manage all registered drivers and their verification status</p>
        </div>

        {/* Search, Filters, Refresh, Add Driver */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative w-full sm:w-60 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search drivers... ${searchTerm ? `(${filteredDrivers.length})` : ''}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-sm bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={verificationFilter} onValueChange={setVerificationFilter}>
            <SelectTrigger className="w-32 h-9 text-sm bg-white">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 px-3 text-sm bg-white shadow-xs"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setVerificationFilter("all");
              setSelectedDrivers([]);
              loadDrivers();
              toast({
                title: "Refreshed",
                description: "Filters have been reset and data refreshed",
              });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>

          <Button size="sm" className="h-9 px-3.5 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-medium" onClick={() => setShowAddDriver(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{drivers.length}</p>
              </div>
              <Car className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {vehicles.length}
                </p>
              </div>
              <CarIcon className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {pendingVehicleRequests.filter(r => r.approvalStatus === 'pending').length}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Verified Drivers</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {drivers.filter(d => d.isVerified).length}
                </p>
              </div>
              <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Pending Verification</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {drivers.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Active Drivers</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {drivers.filter(d => d.status === 'active' || d.status === 'verified').length}
                </p>
              </div>
              <UserCheck className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedDrivers.length > 0 && (
        <Card className="mb-4 shadow-sm border-0 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedDrivers.length} driver(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkUnsuspend}
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Unsuspend Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDocumentApproval}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Approve Documents
                </Button>
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drivers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg lg:text-xl">Drivers ({filteredDrivers.length})</CardTitle>
            {filteredDrivers.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                  onChange={selectAllDrivers}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-8">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No drivers found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Structured Column Header Bar */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-wider items-center">
                <div className="col-span-3 flex items-center space-x-3">
                  <span className="w-4"></span>
                  <span className="w-12"></span>
                  <span>Driver</span>
                </div>
                <div className="col-span-3">
                  <span>Contact Info</span>
                </div>
                <div className="col-span-2">
                  <span>Trips & Activity</span>
                </div>
                <div className="col-span-1">
                  <span>Status</span>
                </div>
                <div className="col-span-2">
                  <span>Assigned Vehicle</span>
                </div>
                <div className="col-span-1 text-right">
                  <span>Actions</span>
                </div>
              </div>

              {/* Driver Rows */}
              {filteredDrivers.map((driver) => (
                <div
                  key={driver._id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 border border-gray-200/90 rounded-xl hover:bg-slate-50/70 transition-colors items-center bg-white shadow-xs"
                >
                  {/* Col 1: Driver Profile (3 cols) */}
                  <div className="lg:col-span-3 flex items-start space-x-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.includes(driver._id)}
                      onChange={() => toggleDriverSelection(driver._id)}
                      className="rounded border-gray-300 mt-2.5 shrink-0"
                    />
                    <Avatar className="w-12 h-12 flex-shrink-0 border border-gray-100">
                      <AvatarImage src={driver.profilePicture ? resolveImageUrl(driver.profilePicture) : undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{`${driver.firstName?.[0] || ''}${driver.lastName?.[0] || ''}`}</AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 truncate text-base">
                        {driver.firstName} {driver.lastName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {driver.isVerified && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium py-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        <div className="flex items-center text-amber-500 text-xs font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                          <span>{driver.rating ? Number(driver.rating).toFixed(1) : 'New'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Contact Info (3 cols) */}
                  <div className="lg:col-span-3 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{driver.email || "No email provided"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate font-medium text-gray-800">{driver.phone || "No phone"}</span>
                    </div>
                  </div>

                  {/* Col 3: Trips & Activity (2 cols) */}
                  <div className="lg:col-span-2 space-y-1 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400">Trips: </span>
                      <span className="font-semibold text-gray-900">{driver.totalRides || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Earnings: </span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(driver.totalEarnings || 0)}</span>
                    </div>
                  </div>

                  {/* Col 4: Status (1 col) */}
                  <div className="lg:col-span-1 flex items-center">
                    <Badge className={`${getStatusColor(driver.status)} text-[11px] font-medium py-0.5 px-2`}>
                      {getStatusIcon(driver.status)}
                      <span className="ml-1 capitalize">{driver.status}</span>
                    </Badge>
                  </div>

                  {/* Col 5: Assigned Vehicle (2 cols) */}
                  <div className="lg:col-span-2">
                    {hasRealVehicle(driver.vehicleDetails) ? (
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                        <div className="flex items-center space-x-1.5 text-blue-800 font-semibold text-xs">
                          <CarIcon className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>1 Vehicle</span>
                        </div>
                        <div className="mt-1.5">
                          <Badge variant="outline" className="text-[11px] bg-white border-blue-200 capitalize py-0.5">
                            {getVehicleIcon(driver.vehicleDetails!.type)}
                            <span className="ml-1">{driver.vehicleDetails!.brand} {driver.vehicleDetails!.model}</span>
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-gray-50/80 border border-dashed border-gray-200 rounded-xl text-center">
                        <span className="text-xs text-gray-500 font-medium">No Vehicle Added</span>
                      </div>
                    )}
                  </div>

                  {/* Col 5: Actions (1 col) */}
                  <div className="lg:col-span-1 flex items-center justify-end space-x-1.5">
                    {driver.status === 'suspended' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsuspendDriver(driver._id)}
                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 h-8 px-2"
                        title="Unsuspend"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDriver(driver)}
                      className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 h-8 w-8 p-0"
                      title="Edit Driver"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDriver(driver);
                        setShowDriverDetails(true);
                      }}
                      className="h-8 w-8 p-0"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDriver(driver)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Driver
                        </DropdownMenuItem>
                        {driver.status === 'suspended' ? (
                          <DropdownMenuItem onClick={() => handleUnsuspendDriver(driver._id)}>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Unsuspend Driver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleStatusChange(driver._id, 'suspended')}>
                            <UserX className="w-4 h-4 mr-2" />
                            Suspend Driver
                          </DropdownMenuItem>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Driver
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Driver</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {driver.firstName} {driver.lastName}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteDriver(driver._id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Driver
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Details Dialog */}
      <Dialog open={showDriverDetails} onOpenChange={setShowDriverDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedDriver.profilePicture || "https://github.com/shadcn.png"} />
                  <AvatarFallback>{`${selectedDriver.firstName} ${selectedDriver.lastName}`.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedDriver.firstName} {selectedDriver.lastName}</h3>
                  <p className="text-gray-600">{selectedDriver.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={getStatusColor(selectedDriver.status)}>
                      {getStatusIcon(selectedDriver.status)}
                      <span className="ml-1 capitalize">{selectedDriver.status}</span>
                    </Badge>
                    {selectedDriver.isVerified && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    <div className="flex items-center text-yellow-600">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="ml-1">{selectedDriver.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{selectedDriver.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-gray-900">{selectedDriver.address.city}, {selectedDriver.address.state}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">License Number</label>
                  <p className="text-gray-900">{selectedDriver.documents.drivingLicense.number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">License Expiry</label>
                  <p className="text-gray-900">{new Date(selectedDriver.documents.drivingLicense.expiryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Trips</label>
                  <p className="text-gray-900">{selectedDriver.totalRides}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Earnings</label>
                  <p className="text-gray-900">{formatCurrency(selectedDriver.totalEarnings)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Vehicle Count</label>
                  <p className="text-gray-900">{selectedDriver.vehicleDetails ? 1 : 0}</p>
                </div>
              </div>
              
              {selectedDriver.vehicleDetails && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Vehicle Type</label>
                  <div className="flex space-x-2 mt-1">
                    <Badge variant="outline">
                      {selectedDriver.vehicleDetails.type}
                    </Badge>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange(selectedDriver._id, selectedDriver.status === 'active' ? 'suspended' : 'active')}
                  className={`flex-1 ${selectedDriver.status === 'suspended' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : ''}`}
                >
                  {selectedDriver.status === 'active' ? 'Suspend Driver' : 'Unsuspend Driver'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vehicle Request Details Dialog */}
      <Dialog open={showRequestDetails} onOpenChange={setShowRequestDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg lg:text-xl">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Vehicle Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Driver Information */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full flex-shrink-0">
                  {getVehicleIcon(selectedRequest.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold truncate">{selectedRequest.driver.firstName} {selectedRequest.driver.lastName}</h3>
                  <p className="text-gray-600 truncate">{selectedRequest.driver.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Approval
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedRequest.type.charAt(0).toUpperCase() + selectedRequest.type.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Vehicle Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Driver Phone</label>
                  <p className="text-gray-900 break-all">{selectedRequest.driver.phone}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Registration Number</label>
                  <p className="text-gray-900 break-all">{selectedRequest.registrationNumber}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Seating Capacity</label>
                  <p className="text-gray-900">{selectedRequest.seatingCapacity} seats</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Fuel Type</label>
                  <p className="text-gray-900 capitalize">{selectedRequest.fuelType}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Vehicle Color</label>
                  <p className="text-gray-900 capitalize">{selectedRequest.color}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Pricing Reference</label>
                  <p className="text-gray-900">{selectedRequest.pricingReference?.category || 'N/A'} - {selectedRequest.pricingReference?.vehicleType || 'N/A'} - {selectedRequest.pricingReference?.vehicleModel || 'N/A'}</p>
                </div>
                {selectedRequest.computedPricing && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Actual Pricing</label>
                    <p className="text-gray-900">₹{selectedRequest.computedPricing.basePrice} base</p>
                    {selectedRequest.computedPricing.category !== 'auto' && (
                      <div className="text-sm text-gray-600">
                        <p>50km: ₹{selectedRequest.computedPricing.distancePricing['50km']}/km</p>
                        <p>100km: ₹{selectedRequest.computedPricing.distancePricing['100km']}/km</p>
                        <p>150km: ₹{selectedRequest.computedPricing.distancePricing['150km']}/km</p>
                        <p>200km: ₹{selectedRequest.computedPricing.distancePricing['200km']}/km</p>
                        <p>250km: ₹{selectedRequest.computedPricing.distancePricing['250km']}/km</p>
                        <p>300km: ₹{selectedRequest.computedPricing.distancePricing['300km']}/km</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Vehicle Features */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Vehicle Features</label>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.isAc && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Snowflake className="w-3 h-3 mr-1" />
                      AC
                    </Badge>
                  )}
                  {selectedRequest.isSleeper && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <Bed className="w-3 h-3 mr-1" />
                      Sleeper
                    </Badge>
                  )}
                  {selectedRequest.amenities.includes('charging') && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Zap className="w-3 h-3 mr-1" />
                      Charging Points
                    </Badge>
                  )}
                  {!selectedRequest.isAc && !selectedRequest.isSleeper && !selectedRequest.amenities.includes('charging') && (
                    <p className="text-sm text-gray-500">No special features</p>
                  )}
                </div>
              </div>
              
              {/* Vehicle Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Vehicle Description</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 text-sm">{selectedRequest.brand} {selectedRequest.model} - {selectedRequest.color}</p>
                </div>
              </div>
              
              {/* Pricing Reference */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Pricing Reference</label>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-800">Category:</span>
                    <span className="font-medium text-blue-900 capitalize">{selectedRequest.pricingReference?.category || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-blue-800">Vehicle Type:</span>
                    <span className="font-medium text-blue-900">{selectedRequest.pricingReference?.vehicleType || 'N/A'}</span>
                  </div>
                  <div className="border-t border-blue-200 mt-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Vehicle Model:</span>
                      <span className="font-bold text-blue-900">{selectedRequest.pricingReference?.vehicleModel || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actual Pricing */}
              {selectedRequest.computedPricing && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Actual Pricing</label>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-800">Base Price:</span>
                      <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.basePrice}</span>
                    </div>
                    {selectedRequest.computedPricing.category !== 'auto' && (
                      <>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-green-800">50km Rate:</span>
                          <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.distancePricing['50km']}/km</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-green-800">100km Rate:</span>
                          <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.distancePricing['100km']}/km</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-green-800">150km Rate:</span>
                          <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.distancePricing['150km']}/km</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-green-800">200km Rate:</span>
                          <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.distancePricing['200km']}/km</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-green-800">250km Rate:</span>
                          <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.distancePricing['250km']}/km</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-green-800">300km Rate:</span>
                          <span className="font-medium text-green-900">₹{selectedRequest.computedPricing.distancePricing['300km']}/km</span>
                        </div>
                        <div className="border-t border-green-200 mt-2 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-800">Example (100km):</span>
                            <span className="font-bold text-green-900">₹{selectedRequest.computedPricing.basePrice + (selectedRequest.computedPricing.distancePricing['100km'] * 100)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Submitted At */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Submitted At</label>
                <p className="text-gray-900">{new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
              </div>
              
              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="adminNotes" className="text-sm font-medium text-gray-600">Admin Notes (Optional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add any notes or comments for the driver..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRequestDetails(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleRejectVehicle(selectedRequest._id)}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
                <Button 
                  onClick={() => handleApproveVehicle(selectedRequest._id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Vehicle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Driver Dialog */}
      <Dialog open={showAddDriver} onOpenChange={setShowAddDriver}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Add New Driver
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="account">Driver Credentials</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter driver's first name"
                    value={newDriverForm.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter driver's last name"
                    value={newDriverForm.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter driver's email address (optional)"
                  value={newDriverForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter driver's phone number"
                  value={newDriverForm.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={newDriverForm.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={newDriverForm.confirmPassword}
                  onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  className="flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Generate Password
                </Button>
                
                {generatedPassword && (
                  <div className="text-sm text-gray-600">
                    Generated: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{generatedPassword}</span>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDriver(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handleSubmitNewDriver}
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    "Creating..."
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Create Driver
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDriver} onOpenChange={setShowEditDriver}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-0 gap-0 rounded-2xl">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Edit Driver Information
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update driver profile, address, bank details and KYC records
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="p-5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Basic Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editFirstName" className="text-xs font-semibold text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="editFirstName"
                    placeholder="Enter first name"
                    value={editDriverForm.firstName}
                    onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="editLastName" className="text-xs font-semibold text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="editLastName"
                    placeholder="Enter last name"
                    value={editDriverForm.lastName}
                    onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="editEmail" className="text-xs font-semibold text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    placeholder="driver@example.com"
                    value={editDriverForm.email}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="editPhone" className="text-xs font-semibold text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="editPhone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={editDriverForm.phone}
                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              {/* Status & Verification Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Account Active</p>
                    <p className="text-[10px] text-gray-500">Allow login</p>
                  </div>
                  <Switch
                    checked={editDriverForm.isActive}
                    onCheckedChange={(checked) => handleEditFormChange('isActive', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">KYC Verified</p>
                    <p className="text-[10px] text-gray-500">Documents valid</p>
                  </div>
                  <Switch
                    checked={editDriverForm.isVerified}
                    onCheckedChange={(checked) => handleEditFormChange('isVerified', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Ride Approved</p>
                    <p className="text-[10px] text-gray-500">Can take bookings</p>
                  </div>
                  <Switch
                    checked={editDriverForm.isApproved}
                    onCheckedChange={(checked) => handleEditFormChange('isApproved', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Address & Location (Sequence: Country, State, City, Pincode, Street) */}
            <div className="p-5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Address & Location
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Country */}
                <div className="space-y-1.5">
                  <Label htmlFor="editCountry" className="text-xs font-semibold text-gray-700">
                    Country
                  </Label>
                  <Input
                    id="editCountry"
                    value="India"
                    disabled
                    readOnly
                    className="h-10 bg-gray-100/90 text-gray-700 rounded-xl text-sm font-medium cursor-not-allowed border-gray-200"
                  />
                </div>

                {/* 2. State */}
                <div className="space-y-1.5">
                  <Label htmlFor="editState" className="text-xs font-semibold text-gray-700">
                    State
                  </Label>
                  <Select
                    value={editDriverForm.state}
                    onValueChange={(val) => handleEditFormChange('state', val)}
                  >
                    <SelectTrigger id="editState" className="h-10 bg-white rounded-xl text-sm border-gray-200">
                      <SelectValue placeholder="Select State / UT" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. City */}
                <div className="space-y-1.5">
                  <Label htmlFor="editCity" className="text-xs font-semibold text-gray-700">
                    City
                  </Label>
                  <Input
                    id="editCity"
                    placeholder="Enter city"
                    value={editDriverForm.city}
                    onChange={(e) => handleEditFormChange('city', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>

                {/* 4. Pincode */}
                <div className="space-y-1.5">
                  <Label htmlFor="editPincode" className="text-xs font-semibold text-gray-700">
                    Pincode
                  </Label>
                  <Input
                    id="editPincode"
                    placeholder="6-digit pincode"
                    value={editDriverForm.pincode}
                    onChange={(e) => handleEditFormChange('pincode', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm font-mono"
                  />
                </div>

                {/* 5. Street */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="editStreet" className="text-xs font-semibold text-gray-700">
                    Street Address / Landmark
                  </Label>
                  <Input
                    id="editStreet"
                    placeholder="House No, Street, Area"
                    value={editDriverForm.street}
                    onChange={(e) => handleEditFormChange('street', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Bank Details */}
            <div className="p-5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-600" />
                Bank & Payout Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editAccountHolder" className="text-xs font-semibold text-gray-700">
                    Account Holder Name
                  </Label>
                  <Input
                    id="editAccountHolder"
                    placeholder="Enter Account Holder Name"
                    value={editDriverForm.accountHolderName}
                    onChange={(e) => handleEditFormChange('accountHolderName', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editBankName" className="text-xs font-semibold text-gray-700">
                    Bank Name
                  </Label>
                  <Input
                    id="editBankName"
                    placeholder="Enter Bank Name"
                    value={editDriverForm.bankName}
                    onChange={(e) => handleEditFormChange('bankName', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editAccountNumber" className="text-xs font-semibold text-gray-700">
                    Account Number
                  </Label>
                  <Input
                    id="editAccountNumber"
                    placeholder="Enter Account Number"
                    value={editDriverForm.accountNumber}
                    onChange={(e) => handleEditFormChange('accountNumber', e.target.value)}
                    className="h-10 bg-white rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editIfscCode" className="text-xs font-semibold text-gray-700">
                    IFSC Code
                  </Label>
                  <Input
                    id="editIfscCode"
                    placeholder="Enter IFSC Code"
                    value={editDriverForm.ifscCode}
                    onChange={(e) => handleEditFormChange('ifscCode', e.target.value.toUpperCase())}
                    className="h-10 bg-white rounded-xl text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Documents Section */}
            <div className="p-5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Driver Documents & KYC
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* RC Document */}
                <div className="space-y-2.5 p-3.5 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-gray-900 text-xs">RC Document</h4>
                  </div>
                  
                  {editingDriver?.documents?.vehicleRC?.image ? (
                    <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                      <img 
                        src={resolveImageUrl(editingDriver.documents.vehicleRC.image)} 
                        alt="RC Document" 
                        className="w-full h-32 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setSelectedDocument({ type: 'Vehicle RC Document', url: resolveImageUrl(editingDriver.documents?.vehicleRC?.image) });
                          setShowDocumentModal(true);
                        }}
                      />
                      <div className="p-2 bg-gray-50 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument({ type: 'Vehicle RC Document', url: resolveImageUrl(editingDriver.documents?.vehicleRC?.image) });
                            setShowDocumentModal(true);
                          }}
                          className="w-full h-8 text-xs rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View RC Document
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <FileText className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-500">RC not uploaded</p>
                    </div>
                  )}
                </div>

                {/* Insurance Document */}
                <div className="space-y-2.5 p-3.5 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-semibold text-gray-900 text-xs">Insurance Policy</h4>
                  </div>
                  
                  {editingDriver?.documents?.insurance?.image ? (
                    <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                      <img 
                        src={resolveImageUrl(editingDriver.documents.insurance.image)} 
                        alt="Insurance Document" 
                        className="w-full h-32 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setSelectedDocument({ type: 'Vehicle Insurance Policy', url: resolveImageUrl(editingDriver.documents?.insurance?.image) });
                          setShowDocumentModal(true);
                        }}
                      />
                      <div className="p-2 bg-gray-50 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument({ type: 'Vehicle Insurance Policy', url: resolveImageUrl(editingDriver.documents?.insurance?.image) });
                            setShowDocumentModal(true);
                          }}
                          className="w-full h-8 text-xs rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View Insurance
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <Shield className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-500">Insurance not uploaded</p>
                    </div>
                  )}
                </div>

                {/* Driving License */}
                <div className="space-y-2.5 p-3.5 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <h4 className="font-semibold text-gray-900 text-xs">Driving License</h4>
                  </div>
                  
                  {editingDriver?.documents?.drivingLicense?.image ? (
                    <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                      <img 
                        src={resolveImageUrl(editingDriver.documents.drivingLicense.image)} 
                        alt="Driving License" 
                        className="w-full h-32 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setSelectedDocument({ type: 'Commercial Driving License', url: resolveImageUrl(editingDriver.documents?.drivingLicense?.image) });
                          setShowDocumentModal(true);
                        }}
                      />
                      <div className="p-2 bg-gray-50 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument({ type: 'Commercial Driving License', url: resolveImageUrl(editingDriver.documents?.drivingLicense?.image) });
                            setShowDocumentModal(true);
                          }}
                          className="w-full h-8 text-xs rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View License
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <User className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-500">License not uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-20">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDriver(false);
                setEditingDriver(null);
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDriver}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-1 sm:order-2 min-w-[130px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                "Updating..."
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Driver
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document View Modal */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{selectedDocument?.type}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDocument && (
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={selectedDocument.url} 
                  alt={selectedDocument.type}
                  className="w-full h-auto max-h-[70vh] object-contain bg-gray-50"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden p-8 text-center text-gray-500 bg-gray-50">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Document image not available</p>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowDocumentModal(false)}
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  if (selectedDocument) {
                    window.open(selectedDocument.url, '_blank');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Details Dialog */}
      <Dialog open={showVehicleDetails} onOpenChange={setShowVehicleDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Vehicle Type</Label>
                  <p className="mt-1">{selectedVehicle.type.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Brand & Model</Label>
                  <p className="mt-1">{selectedVehicle.brand} {selectedVehicle.model}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Registration</Label>
                  <p className="mt-1">{selectedVehicle.registrationNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Owner</Label>
                  <p className="mt-1">{selectedVehicle.driver.firstName} {selectedVehicle.driver.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Phone</Label>
                  <p className="mt-1">{selectedVehicle.driver.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Base Location</Label>
                  <p className="mt-1">{selectedVehicle.vehicleLocation?.address || selectedVehicle.currentLocation?.address || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Fuel Type</Label>
                  <p className="mt-1">{selectedVehicle.fuelType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Seats</Label>
                  <p className="mt-1">{selectedVehicle.seatingCapacity}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Trips</Label>
                  <p className="mt-1">{selectedVehicle.statistics.totalTrips}</p>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vehicle Documents Dialog */}
      <Dialog open={showVehicleDocuments} onOpenChange={setShowVehicleDocuments}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Vehicle Documents
            </DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-6">
              {/* Vehicle Info Header */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getVehicleIcon(selectedVehicle.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedVehicle.brand} {selectedVehicle.model}</h3>
                    <p className="text-sm text-gray-600">{selectedVehicle.registrationNumber}</p>
                  </div>
                </div>
              </div>

              {/* Documents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RC Document */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Registration Certificate (RC)</h4>
                    <Badge 
                      variant={selectedVehicle.documents.rc.isVerified ? "default" : "secondary"}
                      className={selectedVehicle.documents.rc.isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                    >
                      {selectedVehicle.documents.rc.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  
                  {selectedVehicle.documents.rc.image ? (
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={selectedVehicle.documents.rc.image} 
                        alt="RC Document" 
                        className="w-full h-auto max-h-96 object-contain bg-gray-50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden p-8 text-center text-gray-500 bg-gray-50">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>RC image not available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>RC document not uploaded</p>
                    </div>
                  )}
                </div>

                {/* Insurance Document */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900">Insurance Document</h4>
                    <Badge 
                      variant={selectedVehicle.documents.insurance.isVerified ? "default" : "secondary"}
                      className={selectedVehicle.documents.insurance.isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                    >
                      {selectedVehicle.documents.insurance.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  
                  {selectedVehicle.documents.insurance.image ? (
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={selectedVehicle.documents.insurance.image} 
                        alt="Insurance Document" 
                        className="w-full h-auto max-h-96 object-contain bg-gray-50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden p-8 text-center text-gray-500 bg-gray-50">
                        <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>Insurance image not available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Insurance document not uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Status Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-semibold text-blue-900 mb-2">Document Status Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-800">RC:</span>
                    <span className={`font-medium ${selectedVehicle.documents.rc.isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                      {selectedVehicle.documents.rc.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-blue-800">Insurance:</span>
                    <span className={`font-medium ${selectedVehicle.documents.insurance.isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                      {selectedVehicle.documents.insurance.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowVehicleDocuments(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Driver Full Details Modal (Eye Icon) */}
      <Dialog open={showDriverDetails} onOpenChange={setShowDriverDetails}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl bg-slate-50/50">
          {selectedDriver && (
            <div className="flex flex-col">
              {/* Header Hero Banner */}
              <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-t-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16 border-2 border-white/20 shadow-lg shrink-0">
                      <AvatarImage 
                        src={selectedDriver.profilePicture ? resolveImageUrl(selectedDriver.profilePicture) : undefined} 
                        alt={selectedDriver.firstName}
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                        {`${selectedDriver.firstName?.[0] || 'D'}${selectedDriver.lastName?.[0] || ''}`}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          {selectedDriver.firstName} {selectedDriver.lastName}
                        </h2>
                        {selectedDriver.isVerified && (
                          <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2 py-0.5">
                            <Shield className="w-3 h-3 mr-1 text-blue-400" />
                            Verified Driver
                          </Badge>
                        )}
                        <Badge className={`${getStatusColor(selectedDriver.status)} text-xs py-0.5`}>
                          {getStatusIcon(selectedDriver.status)}
                          <span className="ml-1 capitalize">{selectedDriver.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-blue-200/80 flex-wrap">
                        <div className="flex items-center text-amber-400 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current mr-1" />
                          <span>{selectedDriver.rating || 0} Rating</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-blue-300" />
                          <span>Joined {new Date(selectedDriver.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="text-blue-300/60 font-mono text-[11px]">
                          ID: {selectedDriver._id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body Content */}
              <div className="p-6 space-y-6 bg-white">
                {/* 1. Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                    <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Total Rides</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">{selectedDriver.totalRides || 0}</p>
                    <p className="text-[11px] text-blue-700/70 mt-0.5">Completed Trips</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                    <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Total Earnings</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(selectedDriver.totalEarnings || 0)}</p>
                    <p className="text-[11px] text-emerald-700/70 mt-0.5">Lifetime Revenue</p>
                  </div>
                  <div className="p-3.5 bg-violet-50/70 border border-violet-100 rounded-xl">
                    <p className="text-[11px] font-medium text-violet-600 uppercase tracking-wider">Wallet Balance</p>
                    <p className="text-xl font-bold text-violet-700 mt-1">
                      {formatCurrency(selectedDriver.earnings?.wallet?.balance || 0)}
                    </p>
                    <p className="text-[11px] text-violet-700/70 mt-0.5">Available for Payout</p>
                  </div>
                </div>

                {/* 2. Personal & Contact Details */}
                <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Personal & Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Full Name</span>
                      <p className="text-gray-900 font-semibold text-sm">{selectedDriver.firstName} {selectedDriver.lastName}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Mobile Number</span>
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-gray-900 font-semibold text-sm">{selectedDriver.phone}</span>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Email Address</span>
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-800 font-medium">{selectedDriver.email || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Gender / Date of Birth</span>
                      <p className="text-gray-800 font-medium capitalize">
                        {selectedDriver.gender || 'Not specified'}
                        {selectedDriver.dateOfBirth && ` (${new Date(selectedDriver.dateOfBirth).toLocaleDateString('en-IN')})`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Driver Residential Address */}
                <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Residential Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2 space-y-1">
                      <span className="text-gray-400 font-medium">Street Address</span>
                      <p className="text-gray-900 font-medium">{selectedDriver.address?.street || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">City</span>
                      <p className="text-gray-900 font-semibold">{selectedDriver.address?.city || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">State</span>
                      <p className="text-gray-900 font-semibold">{selectedDriver.address?.state || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Pincode</span>
                      <p className="text-gray-900 font-semibold">{selectedDriver.address?.pincode || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Country</span>
                      <p className="text-gray-900 font-semibold">{selectedDriver.address?.country || 'India'}</p>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <span className="text-gray-400 font-medium">Formatted Location</span>
                      <p className="text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 truncate">
                        {[
                          selectedDriver.address?.street,
                          selectedDriver.address?.city,
                          selectedDriver.address?.state,
                          selectedDriver.address?.pincode,
                          selectedDriver.address?.country || 'India'
                        ].filter(Boolean).join(', ') || 'No address registered'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Uploaded Documents & KYC */}
                <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Uploaded Documents & KYC
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Vehicle RC */}
                    <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs font-bold text-gray-900">Vehicle RC</p>
                            <p className="text-[11px] text-gray-500 font-mono">{selectedDriver.documents?.vehicleRC?.number || 'Pending'}</p>
                          </div>
                        </div>
                        {selectedDriver.documents?.vehicleRC?.image ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                            Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {selectedDriver.documents?.vehicleRC?.image ? (
                        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                          <img 
                            src={resolveImageUrl(selectedDriver.documents.vehicleRC.image)} 
                            alt="Vehicle RC"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div 
                            onClick={() => {
                              setSelectedDocument({ type: 'Vehicle RC Document', url: resolveImageUrl(selectedDriver.documents?.vehicleRC?.image) });
                              setShowDocumentModal(true);
                            }}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Preview RC</span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-gray-400 text-xs">
                          No RC image
                        </div>
                      )}
                    </div>

                    {/* Vehicle Insurance */}
                    <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-xs font-bold text-gray-900">Insurance</p>
                            <p className="text-[11px] text-gray-500 font-mono">{selectedDriver.documents?.insurance?.number || 'Pending'}</p>
                          </div>
                        </div>
                        {selectedDriver.documents?.insurance?.image ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                            Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {selectedDriver.documents?.insurance?.image ? (
                        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                          <img 
                            src={resolveImageUrl(selectedDriver.documents.insurance.image)} 
                            alt="Vehicle Insurance"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div 
                            onClick={() => {
                              setSelectedDocument({ type: 'Vehicle Insurance Policy', url: resolveImageUrl(selectedDriver.documents?.insurance?.image) });
                              setShowDocumentModal(true);
                            }}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Preview Insurance</span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-gray-400 text-xs">
                          No Insurance image
                        </div>
                      )}
                    </div>

                    {/* Driving License */}
                    <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="text-xs font-bold text-gray-900">Driving License</p>
                            <p className="text-[11px] text-gray-500 font-mono">{selectedDriver.documents?.drivingLicense?.number || 'Pending'}</p>
                          </div>
                        </div>
                        {selectedDriver.documents?.drivingLicense?.image ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                            Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {selectedDriver.documents?.drivingLicense?.image ? (
                        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                          <img 
                            src={resolveImageUrl(selectedDriver.documents.drivingLicense.image)} 
                            alt="Driving License"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div 
                            onClick={() => {
                              setSelectedDocument({ type: 'Commercial Driving License', url: resolveImageUrl(selectedDriver.documents?.drivingLicense?.image) });
                              setShowDocumentModal(true);
                            }}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Preview DL</span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-gray-400 text-xs">
                          No DL image uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Bank & Payout Details */}
                <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-2.5">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    Bank & Payout Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Account Holder</span>
                      <p className="text-gray-900 font-semibold">{selectedDriver.bankDetails?.accountHolderName || `${selectedDriver.firstName} ${selectedDriver.lastName}`}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Bank Name</span>
                      <p className="text-gray-900 font-semibold">{selectedDriver.bankDetails?.bankName || 'Pending'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">Account Number</span>
                      <p className="text-gray-900 font-semibold font-mono">{selectedDriver.bankDetails?.accountNumber || 'Pending'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium">IFSC Code</span>
                      <p className="text-gray-900 font-semibold font-mono">{selectedDriver.bankDetails?.ifscCode || 'Pending'}</p>
                    </div>
                  </div>
                </div>

                {/* 6. Terms Agreement & Compliance */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">Terms & Conditions Agreement: </span>
                      <span className={selectedDriver.agreement?.isAccepted ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                        {selectedDriver.agreement?.isAccepted ? "Accepted & Bound" : "Pending Driver Signature"}
                      </span>
                    </div>
                  </div>
                  {selectedDriver.agreement?.acceptedAt && (
                    <span className="text-[11px] text-gray-500">
                      On {new Date(selectedDriver.agreement.acceptedAt).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-gray-50/90 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
                <div className="flex items-center gap-2">
                  {selectedDriver.status === 'suspended' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleUnsuspendDriver(selectedDriver._id);
                        setShowDriverDetails(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      Unsuspend Driver
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedDriver._id, 'suspended');
                        setShowDriverDetails(false);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-9"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1.5" />
                      Suspend Driver
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDriverDetails(false);
                      handleEditDriver(selectedDriver);
                    }}
                    className="text-gray-700 border-gray-300 hover:bg-gray-100 text-xs h-9"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowDriverDetails(false)}
                    className="bg-gray-900 hover:bg-black text-white text-xs h-9 px-4"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDriverManagement; 