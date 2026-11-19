import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  User,
  LogOut,
  ChevronRight,
  Bell,
  Camera,
  ArrowLeft,
  CheckCircle2,
  Ticket,
  FileText,
  ShieldCheck,
  RotateCcw,
  HelpCircle,
  Settings,
  Download,
  Smartphone,
  Loader2,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserAuth } from "../contexts/UserAuthContext";
import { useToast } from "../hooks/use-toast";
import { useIsMobile } from "../hooks/use-mobile";
import { resolveImageUrl } from "../utils/imageUrl";
import UserBottomNavigation from "../components/UserBottomNavigation";
import apiService from "../services/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

type ProfileView = 'main' | 'personal' | 'notifications';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout: contextLogout, updateProfile, updateAvatar } = useUserAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile() || false;

  const [currentView, setCurrentView] = useState<ProfileView>('main');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "Indore, Madhya Pradesh",
    avatar: ""
  });

  const [editProfile, setEditProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "Indore, Madhya Pradesh"
  });

  const [isSaving, setIsSaving] = useState(false);

  // Update user profile when user data changes
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name provided';
      setUserProfile({
        name: fullName,
        email: user.email || "No email provided",
        phone: user.phone || "No phone provided",
        location: user.location || "Indore, Madhya Pradesh",
        avatar: user.profilePicture
          ? resolveImageUrl(user.profilePicture)
          : ""
      });

      // Also update edit profile with current user data
      setEditProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "Indore, Madhya Pradesh"
      });
    }
  }, [user]);

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleLogout = () => {
    contextLogout();
    navigate('/');
  };

  // Notification preference (stored on the server; admin broadcasts skip users who turned it off)
  const [offersPush, setOffersPush] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    apiService.getUserPreferences()
      .then(res => setOffersPush(res?.data?.preferences?.notifications?.push !== false))
      .catch(() => {});
  }, [isAuthenticated]);
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await apiService.updateUserPreferences({ notifications: { push: offersPush } });
      toast({ title: "Preferences Saved", description: "Notification settings updated." });
      setCurrentView('main');
    } catch (error) {
      toast({ title: "Could not save", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await apiService.request('/user/account', { method: 'DELETE', body: JSON.stringify({ confirm: true }) });
      toast({ title: "Account deleted", description: "Your account has been deleted." });
      contextLogout();
      navigate('/');
    } catch (error) {
      toast({
        title: "Could not delete account",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleOpenView = (view: ProfileView) => {
    if (view === 'personal' && user) {
      setEditProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "Indore, Madhya Pradesh"
      });
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);

      // Validate required fields
      if (!editProfile.firstName?.trim()) {
        toast({
          title: "First Name Required",
          description: "Please enter your first name.",
          variant: "destructive",
        });
        return;
      }

      if (!editProfile.lastName?.trim()) {
        toast({
          title: "Last Name Required",
          description: "Please enter your last name.",
          variant: "destructive",
        });
        return;
      }

      if (!editProfile.phone?.trim()) {
        toast({
          title: "Phone Number Required",
          description: "Please enter your mobile number.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for API call
      const profileData: any = {
        firstName: editProfile.firstName.trim(),
        lastName: editProfile.lastName.trim(),
        phone: editProfile.phone.trim()
      };

      if (editProfile.email?.trim()) {
        profileData.email = editProfile.email.trim();
      }

      if (editProfile.location?.trim()) {
        profileData.location = editProfile.location.trim();
      }

      await updateProfile(profileData);

      const fullName = `${editProfile.firstName.trim()} ${editProfile.lastName.trim()}`;
      setUserProfile({
        ...userProfile,
        name: fullName,
        email: editProfile.email?.trim() || "No email provided",
        phone: editProfile.phone.trim(),
        location: editProfile.location?.trim() || "Indore, Madhya Pradesh"
      });

      setCurrentView('main');

      toast({
        title: "Profile Updated",
        description: "Your profile changes have been saved successfully.",
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPEG, PNG, WEBP, GIF).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Show immediate local preview
      const localPreviewUrl = URL.createObjectURL(file);
      setUserProfile(prev => ({
        ...prev,
        avatar: localPreviewUrl
      }));

      const uploadedUrl = await updateAvatar(file);
      const finalAvatarUrl = resolveImageUrl(uploadedUrl);

      setUserProfile(prev => ({
        ...prev,
        avatar: finalAvatarUrl || localPreviewUrl
      }));

      toast({
        title: "Photo Updated",
        description: "Your profile photo has been uploaded and saved.",
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setUserProfile(prev => ({
        ...prev,
        avatar: user?.profilePicture
          ? resolveImageUrl(user.profilePicture)
          : ""
      }));
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  // Menu Groups
  const generalGroup = [
    {
      id: 1,
      title: "Personal Information",
      icon: User,
      view: "personal" as ProfileView
    },
    {
      id: 2,
      title: "My Bookings",
      icon: Ticket,
      href: "/bookings"
    },
    {
      id: 3,
      title: "Notifications",
      icon: Bell,
      view: "notifications" as ProfileView
    }
  ];

  const policyGroup = [
    {
      id: 4,
      title: "Terms & Conditions",
      icon: FileText,
      href: "/terms-conditions"
    },
    {
      id: 5,
      title: "Privacy Policy",
      icon: ShieldCheck,
      href: "/privacy-policy"
    },
    {
      id: 6,
      title: "Refund Policy",
      icon: RotateCcw,
      href: "/refund-policy"
    },
    {
      id: 7,
      title: "FAQs & Help Support",
      icon: HelpCircle,
      href: "/help"
    }
  ];

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans antialiased">
      {!isAuthenticated ? (
        // Unauthenticated Login Screen
        <div className="bg-white min-h-screen flex items-center justify-center px-4 sm:px-6">
          <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              Log in to manage<br />your bookings
            </h1>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg font-semibold py-3 sm:py-4 rounded-xl shadow-md"
              onClick={handleLogin}
            >
              Log in
            </Button>
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <span className="underline cursor-pointer font-semibold text-blue-600" onClick={handleLogin}>
                Sign up
              </span>
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* VIEW 1: MAIN PROFILE VIEW */}
          {/* ========================================================================= */}
          {currentView === 'main' && (
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Clean Modern Header */}
              <div className="bg-white text-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-2 -ml-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                  My Profile
                </h1>
                <div className="w-8" />
                <div className="absolute left-4 right-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 max-w-md w-full mx-auto px-5 pt-5 pb-24 space-y-5">

                {/* Profile Hero Section */}
                <div className="flex items-center space-x-4 py-2">
                  {/* Larger Avatar with Camera Icon */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-50 relative">
                      {userProfile.avatar ? (
                        <img
                          src={userProfile.avatar}
                          alt={userProfile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-1/2 h-1/2 text-gray-400" />
                        </div>
                      )}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <label
                      htmlFor="hero-photo-upload"
                      className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center cursor-pointer shadow-xs hover:bg-gray-50 transition-transform active:scale-95 ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                      title="Change Photo"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-gray-600" />
                      )}
                      <input
                        id="hero-photo-upload"
                        type="file"
                        accept="image/*"
                        disabled={isUploadingPhoto}
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Name and Email */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate leading-tight">
                      {userProfile.name}
                    </h2>
                    <p className="text-sm text-gray-500 truncate mt-1 font-normal">
                      {userProfile.email && userProfile.email !== "No email provided"
                        ? userProfile.email
                        : userProfile.phone || "No email added"}
                    </p>
                  </div>
                </div>

                {/* All Menu Items in Clean, Uniform Spacing */}
                <div className="space-y-4 pt-1">
                  <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  {/* Personal Information */}
                  <div
                    onClick={() => handleOpenView('personal')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <User className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        Personal Information
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* My Bookings */}
                  <div
                    onClick={() => navigate('/bookings')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <Ticket className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        My Bookings
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  {/* Notifications */}
                  <div
                    onClick={() => handleOpenView('notifications')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <Bell className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        Notifications
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Terms & Conditions */}
                  <div
                    onClick={() => navigate('/terms-conditions')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <FileText className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        Terms & Conditions
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Privacy Policy */}
                  <div
                    onClick={() => navigate('/privacy-policy')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <ShieldCheck className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        Privacy Policy
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Refund Policy */}
                  <div
                    onClick={() => navigate('/refund-policy')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <RotateCcw className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        Refund Policy
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* FAQs */}
                  <div
                    onClick={() => navigate('/help')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <HelpCircle className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        FAQs
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Download App */}
                  <div
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.chalo.sawari', '_blank')}
                    className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <Download className="w-6 h-6 text-gray-800 stroke-[1.5]" />
                      <span className="text-base font-normal text-gray-900 group-hover:text-gray-950">
                        Download App
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  {/* Log Out */}
                  <div
                    onClick={handleLogout}
                    className="flex items-center justify-between py-4 px-4 hover:bg-red-50/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <LogOut className="w-6 h-6 text-red-500 stroke-[1.5]" />
                      <span className="text-base font-normal text-red-600 group-hover:text-red-700">
                        Log Out
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  {/* Delete Account (Play Store requires in-app account deletion) */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className="flex items-center justify-between py-4 px-4 border-t border-gray-100 hover:bg-red-50/60 transition-colors cursor-pointer group">
                        <div className="flex items-center space-x-4 min-w-0">
                          <Trash2 className="w-6 h-6 text-red-500 stroke-[1.5]" />
                          <span className="text-base font-normal text-red-600 group-hover:text-red-700">
                            Delete Account
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 shrink-0" />
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your profile will be permanently deleted. This cannot be undone. Accounts with an upcoming or ongoing trip cannot be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: FULL-PAGE PERSONAL INFORMATION / EDIT PROFILE */}
          {/* ========================================================================= */}
          {currentView === 'personal' && (
            <div className="flex-1 flex flex-col bg-white min-h-screen">
              {/* Top Navigation Bar with Back Button */}
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
                <div className="w-8"></div>
              </div>

              {/* Full-Page Form Content */}
              <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 pb-24">
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    <div className="relative">
                      <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-md bg-gray-100 overflow-hidden relative">
                        {userProfile.avatar ? (
                          <img
                            src={userProfile.avatar}
                            alt={userProfile.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-1/2 h-1/2 text-gray-400" />
                          </div>
                        )}
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                            <Loader2 className="w-7 h-7 text-white animate-spin" />
                          </div>
                        )}
                      </Avatar>
                      <label
                        htmlFor="photo-upload-input"
                        className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-105 ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                        title="Upload Photo"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <input
                          id="photo-upload-input"
                          type="file"
                          accept="image/*"
                          disabled={isUploadingPhoto}
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-2">
                      {isUploadingPhoto ? "Uploading photo..." : "Tap camera icon to change photo"}
                    </p>
                  </div>

                  {/* First Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold text-gray-700">
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      value={editProfile.firstName}
                      onChange={(e) => setEditProfile({ ...editProfile, firstName: e.target.value })}
                      placeholder="Enter your first name"
                      className="h-12 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold text-gray-700">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      value={editProfile.lastName}
                      onChange={(e) => setEditProfile({ ...editProfile, lastName: e.target.value })}
                      placeholder="Enter your last name"
                      className="h-12 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                      Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={editProfile.email}
                      onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                      placeholder="Enter your email address"
                      className="h-12 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">
                      Mobile Number *
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id="phone"
                        value={editProfile.phone}
                        readOnly
                        placeholder="10-digit mobile number"
                        className="h-12 rounded-xl bg-gray-100 cursor-not-allowed border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all pr-20"
                        required
                      />
                      <span className="absolute right-3 flex items-center space-x-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Verified</span>
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs font-semibold text-gray-700">
                      City / Location
                    </Label>
                    <Input
                      id="location"
                      value={editProfile.location}
                      onChange={(e) => setEditProfile({ ...editProfile, location: e.target.value })}
                      placeholder="Enter your city/location"
                      className="h-12 rounded-xl bg-gray-50/70 border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-2.5">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-12 rounded-xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
                    >
                      {isSaving ? "Saving Changes..." : "Save Changes"}
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
          {/* VIEW 3: FULL-PAGE NOTIFICATIONS */}
          {/* ========================================================================= */}
          {currentView === 'notifications' && (
            <div className="flex-1 flex flex-col bg-white min-h-screen">
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
                <div className="w-8"></div>
              </div>

              <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 space-y-4 pb-24">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Offers & Announcements</p>
                    <p className="text-xs text-gray-500">Push notifications about offers and news</p>
                  </div>
                  <Switch checked={offersPush} onCheckedChange={setOffersPush} disabled={isSavingPrefs} />
                </div>
                <p className="text-xs text-gray-500 px-1">
                  Booking updates (confirmed, driver assigned, trip started) are always sent.
                </p>

                <div className="pt-4">
                  <Button
                    type="button"
                    disabled={isSavingPrefs}
                    onClick={handleSavePreferences}
                    className="w-full h-12 rounded-xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                  >
                    {isSavingPrefs ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <UserBottomNavigation />
    </div>
  );
};

export default Profile;