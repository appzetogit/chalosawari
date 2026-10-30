import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Users, 
  Search, 
  Filter, 
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
  RefreshCw,
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { adminUsers } from "@/services/adminApi";
import { resolveImageUrl } from "@/utils/imageUrl";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  location?: string;
  profilePicture?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  totalBookings: number;
  totalSpent: number;
  lastLogin?: string;
  rating: number;
  reviewCount: number;
  wallet: {
    balance: number;
  };
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  location: string;
  isActive: boolean;
  isVerified: boolean;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set());
  const [verifyingUsers, setVerifyingUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    location: "",
    isActive: true,
    isVerified: false,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    totalDocs: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, statusFilter, verificationFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (verificationFilter !== 'all') {
        params.isVerified = verificationFilter === 'verified';
      }

      const response = await adminUsers.getAll(params);
      
      if (response.success) {
        setUsers(response.data.docs || []);
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.totalPages || 0,
          totalDocs: response.data.totalDocs || 0
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast({ 
        title: 'Error', 
        description: err.response?.data?.message || err.message || 'Failed to load users.', 
        variant: 'destructive' 
      });
      
      // Set empty state on error
      setUsers([]);
      setPagination(prev => ({
        ...prev,
        totalPages: 0,
        totalDocs: 0
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    try {
      setUpdatingUsers(prev => new Set(prev).add(userId));
      const response = await adminUsers.updateStatus(userId, newStatus ? 'active' : 'inactive');
      
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, isActive: newStatus } : user
        ));
        
        const user = users.find(u => u._id === userId);
        const message = newStatus 
          ? `${user?.firstName} ${user?.lastName} has been activated successfully`
          : `${user?.firstName} ${user?.lastName} has been deactivated`;
        
        toast({
          title: newStatus ? "User Activated" : "User Deactivated",
          description: message,
          variant: "default",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to update user status',
        variant: "destructive",
      });
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUnsuspendUser = (userId: string) => {
    handleStatusChange(userId, true);
  };

  const handleVerificationToggle = async (userId: string) => {
    try {
      setVerifyingUsers(prev => new Set(prev).add(userId));
      const user = users.find(u => u._id === userId);
      if (!user) return;

      const response = await adminUsers.toggleVerification(userId, !user.isVerified);
      
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, isVerified: !user.isVerified } : user
        ));
        
        toast({
          title: "Verification Updated",
          description: `${user.firstName} ${user.lastName} verification status updated`,
          variant: "default",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to update verification status',
        variant: "destructive",
      });
    } finally {
      setVerifyingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(user => user._id === userId);
    if (!userToDelete) return;
    
    try {
      setDeletingUsers(prev => new Set(prev).add(userId));
      const response = await adminUsers.deleteUser(userId);
      
      if (response.success) { 
        setUsers(prev => prev.filter(user => user._id !== userId));
        toast({
          title: "User Deleted",
          description: `${userToDelete.firstName} ${userToDelete.lastName} has been deleted successfully`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to delete user',
        variant: "destructive",
      });
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleBulkStatusChange = async (newStatus: boolean) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to update",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsBulkUpdating(true);
      const response = await adminUsers.bulkUpdateStatus(
        selectedUsers, 
        newStatus ? 'active' : 'inactive'
      );

      if (response.success) {
        // Update local state
        setUsers(prev => prev.map(user => {
          if (selectedUsers.includes(user._id)) {
            return { ...user, isActive: newStatus };
          }
          return user;
        }));

        setSelectedUsers([]);
        setShowBulkActions(false);

        const message = newStatus 
          ? `${response.data.updatedCount} users have been activated`
          : `${response.data.updatedCount} users have been deactivated`;

        toast({
          title: "Bulk Update Complete",
          description: message,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to update some users',
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkUnsuspend = () => {
    const inactiveUsers = selectedUsers.filter(userId => {
      const user = users.find(u => u._id === userId);
      return user && !user.isActive;
    });

    if (inactiveUsers.length === 0) {
      toast({
        title: "No Inactive Users Selected",
        description: "Please select inactive users to activate",
        variant: "destructive",
      });
      return;
    }

    handleBulkStatusChange(true);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await adminUsers.bulkDelete(selectedUsers);
      
      if (response.success) {
        setUsers(prev => prev.filter(user => !selectedUsers.includes(user._id)));
        setSelectedUsers([]);
        setShowBulkActions(false);

        toast({
          title: "Bulk Delete Complete",
          description: `${response.data.deletedCount} users have been deleted successfully`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to delete some users',
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(filteredUsers.map(user => user._id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  // Edit user functions
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      phone: user.phone,
      city: user.address?.city || '',
      state: user.address?.state || '',
      location: user.location || '',
      isActive: user.isActive,
      isVerified: user.isVerified,
    });
    setShowEditUser(true);
  };

  const handleEditFormChange = (field: keyof EditUserForm, value: any) => {
    setEditUserForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsUpdatingUser(true);
      
      const updateData = {
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        email: editUserForm.email,
        phone: editUserForm.phone,
        address: {
          city: editUserForm.city,
          state: editUserForm.state
        },
        location: editUserForm.location,
        isActive: editUserForm.isActive,
        isVerified: editUserForm.isVerified,
      };

      const response = await adminUsers.updateUser(editingUser._id, updateData);
      
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user._id === editingUser._id 
            ? { ...user, ...updateData }
            : user
        ));
        
        toast({
          title: "User Updated",
          description: `${editUserForm.firstName} ${editUserForm.lastName}'s information has been updated successfully`,
          variant: "default",
        });

        setShowEditUser(false);
        setEditingUser(null);
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         user.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.isActive) ||
                         (statusFilter === "inactive" && !user.isActive);
    const matchesVerification = verificationFilter === "all" || 
                               (verificationFilter === "verified" && user.isVerified) ||
                               (verificationFilter === "unverified" && !user.isVerified);
    
    return matchesSearch && matchesStatus && matchesVerification;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate real-time stats from current users data
  const calculateStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const verifiedUsers = users.filter(u => u.isVerified).length;
    const inactiveUsers = users.filter(u => !u.isActive).length;
    
    return { totalUsers, activeUsers, verifiedUsers, inactiveUsers };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8 gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600 text-sm lg:text-base">Manage all registered users on the platform</p>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <Card className="mb-6">
          <CardContent className="p-4 lg:p-6">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded w-40"></div>
                <div className="h-10 bg-gray-200 rounded w-40"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-40"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header with Search & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 text-xs lg:text-sm">Manage all registered users on the platform</p>
        </div>
        
        {/* Search and Filters next to heading */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative w-full sm:w-60 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search users... ${searchTerm ? `(${filteredUsers.length})` : ''}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-white"
              disabled={isLoading || isRefreshing}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading || isRefreshing}
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading || isRefreshing}>
            <SelectTrigger className="w-32 h-9 text-sm bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={verificationFilter} onValueChange={setVerificationFilter} disabled={isLoading || isRefreshing}>
            <SelectTrigger className="w-32 h-9 text-sm bg-white">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 px-3 text-sm bg-white"
            onClick={async () => {
              setIsRefreshing(true);
              setSearchTerm("");
              setStatusFilter("all");
              setVerificationFilter("all");
              setSelectedUsers([]);
              setPagination(prev => ({ ...prev, page: 1 }));
              await fetchUsers();
              setIsRefreshing(false);
              toast({
                title: "Refreshed",
                description: "Filters have been reset and data refreshed",
              });
            }}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
        <Card className="shadow-sm">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Users</p>
                <p className="text-lg lg:text-xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Active Users</p>
                <p className="text-lg lg:text-xl font-bold text-gray-900">
                  {stats.activeUsers}
                </p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Verified Users</p>
                <p className="text-lg lg:text-xl font-bold text-gray-900">
                  {stats.verifiedUsers}
                </p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Inactive Users</p>
                <p className="text-lg lg:text-xl font-bold text-gray-900">
                  {stats.inactiveUsers}
                </p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <Card className="mb-4 shadow-sm border-0 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedUsers.length} user(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  disabled={isBulkUpdating}
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
                  disabled={isBulkUpdating || selectedUsers.length === 0}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {isBulkUpdating ? 'Updating...' : 'Activate Selected'}
                </Button>
                <Select 
                  onValueChange={(value) => handleBulkStatusChange(value === 'active')}
                  disabled={isBulkUpdating || selectedUsers.length === 0}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isBulkUpdating || selectedUsers.length === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isBulkUpdating ? 'Deleting...' : 'Delete Selected'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bulk Delete Users</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedUsers.length} selected user{selectedUsers.length > 1 ? 's' : ''}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isBulkUpdating}
                      >
                        {isBulkUpdating ? 'Deleting...' : 'Delete Users'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Summary */}
      {(searchTerm || statusFilter !== 'all' || verificationFilter !== 'all') && (
        <div className="flex flex-wrap gap-2 items-center text-xs text-gray-600 mb-4 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
          <span className="font-medium">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="text-xs py-0.5">
              Search: "{searchTerm}"
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs py-0.5 capitalize">
              Status: {statusFilter}
            </Badge>
          )}
          {verificationFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs py-0.5 capitalize">
              Verification: {verificationFilter}
            </Badge>
          )}
        </div>
      )}

      {/* Users Table Card */}
      <Card className="shadow-xs border border-gray-200/80 bg-white overflow-hidden rounded-xl">
        <CardHeader className="py-4 px-6 bg-white border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg lg:text-xl font-bold text-gray-900">
                Registered Users ({filteredUsers.length})
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage, review, and organize all registered customer accounts
              </p>
            </div>
            {filteredUsers.length > 0 && (
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60">
                <input
                  type="checkbox"
                  id="select-all-top"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={selectAllUsers}
                  className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  disabled={isLoading || isRefreshing}
                />
                <label htmlFor="select-all-top" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                  Select All ({filteredUsers.length})
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500 font-medium">Loading users data...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-800">No users found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search query or status filter</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="w-full table-auto">
                <TableHeader className="bg-slate-50/90 border-b border-gray-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={selectAllUsers}
                        className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        disabled={isLoading || isRefreshing}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider py-3 px-3">
                      User / Profile
                    </TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider py-3 px-3">
                      Contact Info
                    </TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider py-3 px-3">
                      Location
                    </TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider py-3 px-3 text-center">
                      Bookings
                    </TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider py-3 px-3">
                      Status
                    </TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider py-3 px-3">
                      Joined Date
                    </TableHead>
                    <TableHead className="text-right font-bold text-gray-700 text-xs uppercase tracking-wider py-3 pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user._id}
                      className={`hover:bg-blue-50/40 transition-colors ${selectedUsers.includes(user._id) ? 'bg-blue-50/60' : ''}`}
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => toggleUserSelection(user._id)}
                          className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          disabled={isLoading || isRefreshing || updatingUsers.has(user._id) || deletingUsers.has(user._id) || verifyingUsers.has(user._id)}
                        />
                      </TableCell>

                      {/* User / Profile */}
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10 border-2 border-white shadow-xs flex-shrink-0 ring-1 ring-gray-200">
                            <AvatarImage
                              src={user.profilePicture ? resolveImageUrl(user.profilePicture) : undefined}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs">
                              {`${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate leading-tight hover:text-blue-600 transition-colors">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center text-xs font-semibold text-gray-800">
                            <Phone className="w-3.5 h-3.5 text-blue-600 mr-1.5 flex-shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                          {user.email && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Mail className="w-3.5 h-3.5 text-gray-400 mr-1.5 flex-shrink-0" />
                              <span className="truncate max-w-[170px]">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center text-xs text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 mr-1.5 flex-shrink-0" />
                          <span className="truncate max-w-[160px] font-medium">
                            {user.location || (user.address?.city && user.address?.state
                              ? `${user.address.city}, ${user.address.state}`
                              : 'Not provided')
                            }
                          </span>
                        </div>
                      </TableCell>

                      {/* Bookings */}
                      <TableCell className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {user.totalBookings || 0} trips
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={`${getStatusColor(user.isActive)} text-[10px] font-semibold py-0.5 px-2`}>
                            {getStatusIcon(user.isActive)}
                            <span className="ml-1 capitalize">{user.isActive ? 'Active' : 'Inactive'}</span>
                          </Badge>
                          {user.isVerified && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100 py-0.5 px-1.5">
                              <Shield className="w-2.5 h-2.5 mr-0.5 text-blue-600" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center text-xs text-gray-600 font-medium whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1 flex-shrink-0" />
                          <span>{new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View Details Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View User Details"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDetails(true);
                            }}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            disabled={updatingUsers.has(user._id) || deletingUsers.has(user._id) || verifyingUsers.has(user._id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Edit User Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit User Info"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                            disabled={updatingUsers.has(user._id) || deletingUsers.has(user._id) || verifyingUsers.has(user._id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete User"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                disabled={deletingUsers.has(user._id)}
                              >
                                {deletingUsers.has(user._id) ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete <strong>{user.firstName} {user.lastName}</strong>? This action will remove all user records and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  disabled={deletingUsers.has(user._id)}
                                >
                                  {deletingUsers.has(user._id) ? 'Deleting...' : 'Delete User'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Table Footer with Pagination */}
          <div className="py-4 px-6 bg-gray-50/60 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500 font-medium">
              Showing <span className="font-semibold text-gray-800">{filteredUsers.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}</span> to <span className="font-semibold text-gray-800">{Math.min(pagination.page * pagination.limit, pagination.totalDocs)}</span> of <span className="font-semibold text-gray-800">{pagination.totalDocs}</span> users
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs bg-white shadow-xs"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1 || isLoading || isRefreshing}
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-gray-600 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs bg-white shadow-xs"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages || isLoading || isRefreshing}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-5 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              User Details
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                <Avatar className="w-11 h-11 flex-shrink-0 border border-white shadow-xs">
                  <AvatarImage src={selectedUser.profilePicture ? resolveImageUrl(selectedUser.profilePicture) : undefined} />
                  <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-700">{`${selectedUser.firstName?.[0] || 'U'}${selectedUser.lastName?.[0] || ''}`}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{`${selectedUser.firstName} ${selectedUser.lastName}`}</h3>
                  <p className="text-xs text-gray-500 truncate">{selectedUser.email || 'No email registered'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge className={getStatusColor(selectedUser.isActive)}>
                      {getStatusIcon(selectedUser.isActive)}
                      <span className="ml-1 capitalize text-[10px]">{selectedUser.isActive ? 'active' : 'inactive'}</span>
                    </Badge>
                    {selectedUser.isVerified && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] py-0 px-1.5">
                        <Shield className="w-2.5 h-2.5 mr-0.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 text-xs">
                <div>
                  <label className="text-gray-400 font-medium text-[11px]">Phone</label>
                  <p className="text-gray-900 font-semibold mt-0.5">{selectedUser.phone}</p>
                </div>
                <div>
                  <label className="text-gray-400 font-medium text-[11px]">Joined Date</label>
                  <p className="text-gray-900 font-semibold mt-0.5">{new Date(selectedUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 font-medium text-[11px]">Location</label>
                  <p className="text-gray-900 font-semibold mt-0.5">
                    {selectedUser.location || (selectedUser.address?.city && selectedUser.address?.state 
                      ? `${selectedUser.address.city}, ${selectedUser.address.state}`
                      : 'Location not set')
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto p-5 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Edit className="w-4 h-4 text-blue-600" />
              Edit User Information
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3.5 pt-1">
            {editingUser && (
              <div className="flex items-center space-x-3 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <Avatar className="w-10 h-10 flex-shrink-0 border border-white shadow-xs">
                  <AvatarImage src={editingUser.profilePicture ? resolveImageUrl(editingUser.profilePicture) : undefined} />
                  <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-700">{`${editingUser.firstName?.[0] || 'U'}${editingUser.lastName?.[0] || ''}`}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-xs">{editingUser.firstName} {editingUser.lastName}</p>
                  <p className="text-[11px] text-gray-500 truncate">{editingUser.phone} {editingUser.email ? `• ${editingUser.email}` : ''}</p>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">First Name *</label>
                  <Input
                    placeholder="First name"
                    value={editUserForm.firstName}
                    onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                    disabled={isUpdatingUser}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">Last Name *</label>
                  <Input
                    placeholder="Last name"
                    value={editUserForm.lastName}
                    onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                    disabled={isUpdatingUser}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">Email Address</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={editUserForm.email}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    disabled={isUpdatingUser}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">Phone Number *</label>
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={editUserForm.phone}
                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                    disabled={isUpdatingUser}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Location</label>
                <Input
                  placeholder="e.g. Indore, Madhya Pradesh"
                  value={editUserForm.location}
                  onChange={(e) => handleEditFormChange('location', e.target.value)}
                  disabled={isUpdatingUser}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Status & Verification */}
            <div className="space-y-2 pt-2.5 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2.5 items-end">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">Account Status</label>
                  <Select 
                    value={editUserForm.isActive ? 'active' : 'inactive'} 
                    onValueChange={(value: string) => handleEditFormChange('isActive', value === 'active')}
                    disabled={isUpdatingUser}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="text-xs">Active</SelectItem>
                      <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 h-8 px-2.5 bg-gray-50/80 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    id="isVerified"
                    checked={editUserForm.isVerified}
                    onChange={(e) => handleEditFormChange('isVerified', e.target.checked)}
                    className="rounded border-gray-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    disabled={isUpdatingUser}
                  />
                  <label htmlFor="isVerified" className="text-xs text-gray-700 font-medium cursor-pointer select-none">
                    Verified User
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEditUser(false);
                setEditingUser(null);
              }}
              disabled={isUpdatingUser}
              className="h-8 text-xs px-3 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateUser}
              disabled={isUpdatingUser}
              className="h-8 text-xs px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isUpdatingUser ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUserManagement;