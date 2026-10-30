import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DriverBottomNavigation from "@/driver/components/DriverBottomNavigation";
import {
  User,
  LogOut,
  ChevronRight,
  Bell,
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldCheck,
  HelpCircle,
  Download,
  Loader2,
  Shield,
  Eye,
  Upload,
  CreditCard,
  Star,
  Car,
  MessageSquare,
  Camera,
  AlertCircle,
  Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import { toast } from "sonner";
import apiService from "@/services/api";
import { resolveImageUrl } from "@/utils/imageUrl";

type DriverProfileView = 'main' | 'personal' | 'documents' | 'earnings' | 'bank' | 'notifications';

// Clean values like "N/A", "null", "undefined" to empty string so placeholder is shown
const cleanValue = (val?: string | null): string => {
  if (!val) return "";
  const trimmed = val.trim();
  if (
    trimmed.toUpperCase() === "N/A" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase() === "null"
  ) {
    return "";
  }
  return trimmed;
};

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

const DriverProfile = () => {
  const navigate = useNavigate();
  const { driver, isLoggedIn, logout, updateDriverData } = useDriverAuth();

  const [currentView, setCurrentView] = useState<DriverProfileView>('main');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  // Stats & earnings
  const [earningsData, setEarningsData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);

  // Document preview modal
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; url: string } | null>(null);

  // Edit profile form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India"
    }
  });

  // Bank details form state
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: ""
  });

  // Sync form state when driver data updates
  useEffect(() => {
    if (driver) {
      setEditForm({
        firstName: cleanValue(driver.firstName),
        lastName: cleanValue(driver.lastName),
        phone: cleanValue(driver.phone),
        email: cleanValue(driver.email),
        address: {
          street: cleanValue(driver.address?.street),
          city: cleanValue(driver.address?.city),
          state: cleanValue(driver.address?.state),
          pincode: cleanValue(driver.address?.pincode),
          country: cleanValue(driver.address?.country) || "India"
        }
      });

      const defaultHolder = `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
      const existingHolder = cleanValue(driver.bankDetails?.accountHolderName);
      const existingBankName = cleanValue(driver.bankDetails?.bankName);
      const existingAccountNo = cleanValue(driver.bankDetails?.accountNumber);
      const existingIfsc = cleanValue(driver.bankDetails?.ifscCode);

      setBankForm({
        accountHolderName: existingHolder && existingHolder !== 'PENDING' ? existingHolder : defaultHolder || "",
        bankName: existingBankName && existingBankName !== 'PENDING' ? existingBankName : "",
        accountNumber: existingAccountNo && existingAccountNo !== 'PENDING' ? existingAccountNo : "",
        ifscCode: existingIfsc && existingIfsc !== 'PENDING' ? existingIfsc : ""
      });
    }
  }, [driver]);

  // Fetch driver stats and earnings
  const fetchDriverStats = async () => {
    try {
      const response = await apiService.getDriverStats();
      if (response.success) {
        setStatsData(response.data);
      }
    } catch (error) {
      console.error("Error fetching driver stats:", error);
    }
  };

  const fetchDriverEarnings = async () => {
    try {
      const response = await apiService.getDriverEarnings();
      if (response.success) {
        setEarningsData(response.data);
      }
    } catch (error) {
      console.error("Error fetching driver earnings:", error);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/driver-auth');
    } else if (driver) {
      fetchDriverStats();
      fetchDriverEarnings();
    }
  }, [isLoggedIn, driver, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/driver-auth');
  };

  const handleBack = () => {
    if (currentView !== 'main') {
      setCurrentView('main');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/driver');
      }
    }
  };

  const handleOpenView = (view: DriverProfileView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);

      const response = await apiService.uploadDriverAvatar(file);
      if (response.success) {
        const updatedDriver = response.data?.driver || response.driver;
        if (updatedDriver) {
          updateDriverData(updatedDriver);
        } else if (response.data?.profilePicture) {
          updateDriverData({
            ...driver,
            profilePicture: response.data.profilePicture
          });
        }
        toast.success('Profile photo uploaded successfully!');
      } else {
        toast.error(response.message || 'Failed to upload photo');
      }
    } catch (error: any) {
      console.error('Driver avatar upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!editForm.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        address: editForm.address
      };

      const response = await apiService.updateDriverProfile(updateData);
      if (response.success) {
        updateDriverData(response.data);
        toast.success("Profile updated successfully!");
        setCurrentView('main');
      } else {
        toast.error(response.error?.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.accountHolderName.trim()) {
      toast.error("Account Holder Name is required");
      return;
    }
    if (!bankForm.bankName.trim()) {
      toast.error("Bank Name is required");
      return;
    }
    if (!bankForm.accountNumber.trim()) {
      toast.error("Account Number is required");
      return;
    }
    if (!bankForm.ifscCode.trim()) {
      toast.error("IFSC Code is required");
      return;
    }

    setIsSavingBank(true);
    try {
      const payload = {
        bankDetails: {
          accountHolderName: bankForm.accountHolderName.trim(),
          bankName: bankForm.bankName.trim(),
          accountNumber: bankForm.accountNumber.trim(),
          ifscCode: bankForm.ifscCode.trim().toUpperCase()
        }
      };

      const response = await apiService.updateDriverProfile(payload);
      if (response.success) {
        updateDriverData(response.data);
        toast.success("Bank details saved successfully!");
        setCurrentView('main');
      } else {
        toast.error(response.error?.message || "Failed to save bank details");
      }
    } catch (error: any) {
      console.error("Save bank details error:", error);
      toast.error(error.message || "Failed to save bank details");
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: 'vehicleRC' | 'insurance' | 'drivingLicense'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const token = apiService.getAuthToken('driver');
      const url = `${apiService.baseURL}/driver/upload-document`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (data.success && driver) {
        const updatedDriver = {
          ...driver,
          documents: {
            ...driver.documents,
            [documentType]: {
              ...(driver.documents as any)?.[documentType],
              image: data.data.documentUrl,
              isVerified: false
            }
          }
        };

        updateDriverData(updatedDriver);
        const docName = documentType === 'vehicleRC' ? 'RC' : documentType === 'insurance' ? 'Insurance' : 'Driving License';
        toast.success(`${docName} document uploaded successfully`);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error("Document upload error:", error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleViewDocument = (documentType: string, documentUrl: string) => {
    setSelectedDocument({ type: documentType, url: resolveImageUrl(documentUrl) });
    setShowDocumentModal(true);
  };

  const handleDownloadEarnings = () => {
    toast.info("Download Started", {
      description: "Earnings summary report is downloading."
    });
    window.print();
  };

  if (!isLoggedIn) {
    return null;
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-600 font-medium">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  const driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'Driver Partner';

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans antialiased">
      {/* ========================================================================= */}
      {/* VIEW 1: MAIN PROFILE VIEW */}
      {/* ========================================================================= */}
      {currentView === 'main' && (
        <div className="flex-1 flex flex-col bg-white">
          {/* Top Clean Modern Header */}
          <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-center sticky top-0 z-30 border-b border-gray-100">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight text-center">
              Driver Profile
            </h1>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 max-w-md w-full mx-auto px-5 pt-5 pb-24 space-y-5">
            {/* Profile Hero Section */}
            <div className="flex items-center space-x-4 py-2">
              {/* Avatar with Camera Icon */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm bg-blue-50 flex items-center justify-center relative">
                  {driver.profilePicture ? (
                    <img
                      src={resolveImageUrl(driver.profilePicture)}
                      alt={driverName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl tracking-wider">
                      {driver.firstName?.[0]?.toUpperCase() || 'D'}{driver.lastName?.[0]?.toUpperCase() || ''}
                    </div>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="hero-driver-avatar-upload"
                  className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center cursor-pointer shadow-xs hover:bg-gray-50 transition-transform active:scale-95 ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                  title="Change Photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-600" />
                  )}
                  <input
                    id="hero-driver-avatar-upload"
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Name, Phone, and Driver Badges */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate leading-tight">
                  {driverName}
                </h2>
                <p className="text-sm text-gray-500 truncate mt-1 font-normal">
                  {driver.phone || driver.email || "Professional Driver"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    Verified Driver
                  </span>
                  {driver.rating ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-500" />
                      {driver.rating}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Menu Rows */}
            <div className="space-y-1 pt-1">
              {/* 1. Personal Information */}
              <div
                onClick={() => handleOpenView('personal')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <User className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Personal Information
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 2. Documents */}
              <div
                onClick={() => handleOpenView('documents')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <Shield className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Documents
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 3. My Vehicles */}
              <div
                onClick={() => navigate('/driver/myvehicle')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <Car className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    My Vehicles
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 5. Bank Details */}
              <div
                onClick={() => handleOpenView('bank')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <Landmark className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Bank Details
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 6. Ride Requests */}
              <div
                onClick={() => navigate('/driver/requests')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <MessageSquare className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Ride Requests
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 7. Notifications */}
              <div
                onClick={() => handleOpenView('notifications')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <Bell className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Notifications
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 8. Terms & Conditions */}
              <div
                onClick={() => navigate('/driver/terms-conditions')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <FileText className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Terms & Conditions
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 9. Privacy Policy */}
              <div
                onClick={() => navigate('/driver/privacy-policy')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <ShieldCheck className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Privacy Policy
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 10. Help & Support */}
              <div
                onClick={() => navigate('/help')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <HelpCircle className="w-5 h-5 text-gray-700 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-950">
                    Help & Support
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* 11. Log Out */}
              <div
                onClick={() => setShowLogoutDialog(true)}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-red-50/60 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <LogOut className="w-5 h-5 text-red-500 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-medium text-red-600 group-hover:text-red-700">
                    Log Out
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: PERSONAL INFORMATION */}
      {/* ========================================================================= */}
      {currentView === 'personal' && (
        <div className="flex-1 flex flex-col bg-white min-h-screen">
          {/* Header */}
          <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Personal Information
            </h1>
            <div className="w-8" />
          </div>

          {/* Form */}
          <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 pb-24">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Driver Avatar with Camera icon */}
              <div className="flex flex-col items-center justify-center pt-2 pb-3">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-md bg-blue-50 flex items-center justify-center relative">
                    {driver.profilePicture ? (
                      <img
                        src={resolveImageUrl(driver.profilePicture)}
                        alt={driverName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-3xl tracking-wider">
                        {editForm.firstName?.[0]?.toUpperCase() || 'D'}{editForm.lastName?.[0]?.toUpperCase() || ''}
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                        <Loader2 className="w-7 h-7 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="form-driver-avatar-upload"
                    className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95 ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                    title="Upload Photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <input
                      id="form-driver-avatar-upload"
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-2">
                  {isUploadingPhoto ? "Uploading photo..." : "Tap camera icon to change photo"}
                </p>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-gray-700">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    placeholder="e.g. Ajay"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-gray-700">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    placeholder="e.g. Panchal"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">
                  Mobile Number
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="phone"
                    value={editForm.phone}
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-gray-100/80 border-gray-200 text-gray-500 cursor-not-allowed text-sm pr-20 select-none"
                  />
                  <span className="absolute right-3 flex items-center space-x-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                  Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="e.g. driver@example.com"
                  className="h-11 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                />
              </div>

              {/* Street Address */}
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-xs font-semibold text-gray-700">
                  Street Address
                </Label>
                <Input
                  id="street"
                  value={editForm.address.street}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    address: { ...editForm.address, street: e.target.value }
                  })}
                  placeholder="e.g. 123 MG Road, Scheme 54"
                  className="h-11 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                />
              </div>

              {/* Country & State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs font-semibold text-gray-700">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value="India"
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-gray-100/80 border-gray-200 text-gray-500 cursor-not-allowed text-sm select-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold text-gray-700">
                    State
                  </Label>
                  <select
                    id="state"
                    value={editForm.address.state}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      address: { ...editForm.address, state: e.target.value }
                    })}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50/70 border border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* City & Pincode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold text-gray-700">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={editForm.address.city}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      address: { ...editForm.address, city: e.target.value }
                    })}
                    placeholder="e.g. Indore"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode" className="text-xs font-semibold text-gray-700">
                    Pincode
                  </Label>
                  <Input
                    id="pincode"
                    value={editForm.address.pincode}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      address: { ...editForm.address, pincode: e.target.value }
                    })}
                    placeholder="e.g. 452001"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2.5">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-[0.99]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentView('main')}
                  className="w-full h-11 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: DOCUMENTS & KYC */}
      {/* ========================================================================= */}
      {currentView === 'documents' && (
        <div className="flex-1 flex flex-col bg-white min-h-screen">
          {/* Header */}
          <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Documents
            </h1>
            <div className="w-8" />
          </div>

          <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 pb-24 space-y-4">
            {/* Info box */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start space-x-3 text-xs text-blue-900">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Keep your vehicle and driver documents verified to maintain active ride eligibility and receive customer bookings.
              </p>
            </div>

            {/* RC Document Card */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Vehicle RC</h3>
                    <p className="text-xs text-gray-500">Registration Certificate</p>
                  </div>
                </div>
                {driver.documents?.vehicleRC?.image ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                    Pending
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {driver.documents?.vehicleRC?.image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument('Vehicle RC Document', driver.documents!.vehicleRC!.image!)}
                    className="flex-1 h-9 rounded-lg text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Document
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => document.getElementById('rcUploadInput')?.click()}
                  className="flex-1 h-9 rounded-lg text-xs font-semibold text-gray-700 border-gray-200 hover:bg-gray-100"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {driver.documents?.vehicleRC?.image ? 'Update RC' : 'Upload RC'}
                </Button>
                <input
                  id="rcUploadInput"
                  type="file"
                  accept="image/*"
                  disabled={isLoading}
                  onChange={(e) => handleDocumentUpload(e, 'vehicleRC')}
                  className="hidden"
                />
              </div>
            </div>

            {/* Insurance Document Card */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Vehicle Insurance</h3>
                    <p className="text-xs text-gray-500">Valid Insurance Policy</p>
                  </div>
                </div>
                {driver.documents?.insurance?.image ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                    Pending
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {driver.documents?.insurance?.image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument('Vehicle Insurance Document', driver.documents!.insurance!.image!)}
                    className="flex-1 h-9 rounded-lg text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Document
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => document.getElementById('insuranceUploadInput')?.click()}
                  className="flex-1 h-9 rounded-lg text-xs font-semibold text-gray-700 border-gray-200 hover:bg-gray-100"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {driver.documents?.insurance?.image ? 'Update Insurance' : 'Upload Insurance'}
                </Button>
                <input
                  id="insuranceUploadInput"
                  type="file"
                  accept="image/*"
                  disabled={isLoading}
                  onChange={(e) => handleDocumentUpload(e, 'insurance')}
                  className="hidden"
                />
              </div>
            </div>

            {/* Driving License Document Card */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Driving License</h3>
                    <p className="text-xs text-gray-500">Commercial/Transport DL</p>
                  </div>
                </div>
                {driver.documents?.drivingLicense?.image ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                    Pending
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {driver.documents?.drivingLicense?.image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument('Driving License Document', driver.documents!.drivingLicense!.image!)}
                    className="flex-1 h-9 rounded-lg text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Document
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => document.getElementById('dlUploadInput')?.click()}
                  className="flex-1 h-9 rounded-lg text-xs font-semibold text-gray-700 border-gray-200 hover:bg-gray-100"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {driver.documents?.drivingLicense?.image ? 'Update License' : 'Upload License'}
                </Button>
                <input
                  id="dlUploadInput"
                  type="file"
                  accept="image/*"
                  disabled={isLoading}
                  onChange={(e) => handleDocumentUpload(e, 'drivingLicense')}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: EARNINGS & SUMMARY */}
      {/* ========================================================================= */}
      {currentView === 'earnings' && (
        <div className="flex-1 flex flex-col bg-white min-h-screen">
          {/* Header */}
          <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Earnings
            </h1>
            <div className="w-8" />
          </div>

          <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 pb-24 space-y-4">
            {/* Grid of Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Earnings */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800">Total Net Earnings</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{earningsData?.netEarnings?.toLocaleString() || '0'}
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-1">All completed rides</p>
              </div>

              {/* Wallet Balance */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-800">Wallet Balance</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{driver.earnings?.wallet?.balance?.toLocaleString() || '0'}
                </p>
                <p className="text-[11px] text-blue-700/80 mt-1">Available for payout</p>
              </div>

              {/* Total Completed Rides */}
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100">
                <p className="text-xs font-semibold text-purple-800">Total Rides</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {driver.totalRides || earningsData?.totalBookings || 0}
                </p>
                <p className="text-[11px] text-purple-700/80 mt-1">Trips fulfilled</p>
              </div>
            </div>

            {/* Performance Overview */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Performance Overview
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {statsData?.completionRate || 100}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Driver Rating</span>
                  <span className="font-semibold text-gray-900 flex items-center">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 mr-1" />
                    {driver.rating || 'New'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Account Status</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
              </div>
            </div>

            {/* Print/Download Button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleDownloadEarnings}
                className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Print Earnings Summary
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: BANK DETAILS */}
      {/* ========================================================================= */}
      {currentView === 'bank' && (
        <div className="flex-1 flex flex-col bg-white min-h-screen">
          {/* Header */}
          <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Bank Details
            </h1>
            <div className="w-8" />
          </div>

          <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 pb-24">
            {/* Edit / Update Form */}
            <form onSubmit={handleSaveBank} className="space-y-4 bg-white">
              <div className="space-y-1.5">
                <Label htmlFor="bank-accountHolderName" className="text-xs font-semibold text-gray-700">
                  Account Holder <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank-accountHolderName"
                  type="text"
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  placeholder="Enter Account Holder Name"
                  className="h-11 rounded-xl text-sm border-gray-200 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-bankName" className="text-xs font-semibold text-gray-700">
                  Bank Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank-bankName"
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="Enter Bank Name"
                  className="h-11 rounded-xl text-sm border-gray-200 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-accountNumber" className="text-xs font-semibold text-gray-700">
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank-accountNumber"
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="Enter Account Number"
                  className="h-11 rounded-xl text-sm font-mono border-gray-200 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-ifscCode" className="text-xs font-semibold text-gray-700">
                  IFSC Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank-ifscCode"
                  type="text"
                  value={bankForm.ifscCode}
                  onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="Enter IFSC Code"
                  className="h-11 rounded-xl text-sm font-mono uppercase border-gray-200 focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingBank}
                  className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  {isSavingBank ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Bank Details...
                    </>
                  ) : (
                    "Save Bank Details"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 6: SETTINGS & NOTIFICATIONS */}
      {/* ========================================================================= */}
      {currentView === 'notifications' && (
        <div className="flex-1 flex flex-col bg-white min-h-screen">
          {/* Header */}
          <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Notifications
            </h1>
            <div className="w-8" />
          </div>

          <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 space-y-4 pb-24">
            {/* Push Notifications Toggle */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="pr-4">
                <p className="font-semibold text-gray-900 text-sm">Ride Notifications</p>
                <p className="text-xs text-gray-500 mt-0.5">Receive alerts for new nearby ride bookings</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={(checked) => {
                  setNotifications(checked);
                  toast.success(`Ride notifications ${checked ? 'enabled' : 'disabled'}`);
                }}
              />
            </div>

            {/* Location Sharing Toggle */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="pr-4">
                <p className="font-semibold text-gray-900 text-sm">Live Location Sharing</p>
                <p className="text-xs text-gray-500 mt-0.5">Share real-time GPS coordinates with passengers</p>
              </div>
              <Switch
                checked={locationSharing}
                onCheckedChange={(checked) => {
                  setLocationSharing(checked);
                  toast.success(`Location sharing ${checked ? 'enabled' : 'disabled'}`);
                }}
              />
            </div>

            <div className="pt-4">
              <Button
                type="button"
                onClick={() => {
                  toast.success("Preferences updated successfully");
                  setCurrentView('main');
                }}
                className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{selectedDocument?.type}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedDocument?.url && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.type}
                  className="max-h-[60vh] w-auto object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Document image not available</p>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDocumentModal(false)}
                className="rounded-xl"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedDocument?.url) {
                    window.open(selectedDocument.url, '_blank');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Open Full Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              Log Out of Driver Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              Are you sure you want to log out? You will need to sign in again to accept ride requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3 gap-2">
            <AlertDialogCancel className="rounded-xl mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Navigation */}
      <DriverBottomNavigation />
    </div>
  );
};

export default DriverProfile;