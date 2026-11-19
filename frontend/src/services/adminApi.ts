import axios from 'axios';
import { resolveUploadsUrls } from '../utils/imageUrl';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  console.log('Admin API Request:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    tokenLength: token ? token.length : 0
  });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and resolve relative upload URLs
adminApi.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = resolveUploadsUrls(response.data);
    }
    console.log('Admin API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('Admin API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin-auth';
    }
    return Promise.reject(error);
  }
);

// Admin Authentication
export const adminAuth = {
  login: async (email: string, password: string) => {
    const response = await adminApi.post('/login', { email, password });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await adminApi.get('/profile');
    return response.data;
  },
  
  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    const response = await adminApi.put('/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await adminApi.put('/change-password', { currentPassword, newPassword });
    return response.data;
  }
};

// Dashboard & Analytics
export const adminDashboard = {
  getStats: async (period: 'week' | 'month' | 'year' = 'month') => {
    const response = await adminApi.get(`/dashboard?period=${period}`);
    return response.data;
  },
  
  getAnalytics: async (period: 'week' | 'month' | 'year' = 'month') => {
    const response = await adminApi.get(`/analytics?period=${period}`);
    return response.data;
  },
  
  getActivityLog: async (page: number = 1, limit: number = 20) => {
    const response = await adminApi.get(`/activity-log?page=${page}&limit=${limit}`);
    return response.data;
  }
};

// User Management
export const adminUsers = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    isVerified?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    const response = await adminApi.get(`/users?${queryParams.toString()}`);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await adminApi.get(`/users/${id}`);
    return response.data;
  },
  
  updateStatus: async (id: string, status: string, reason?: string) => {
    const response = await adminApi.put(`/users/${id}/status`, { status, reason });
    return response.data;
  },

  updateUser: async (id: string, userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: {
      city?: string;
      state?: string;
    };
    isActive?: boolean;
    isVerified?: boolean;
    totalBookings?: number;
    totalSpent?: number;
  }) => {
    const response = await adminApi.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await adminApi.delete(`/users/${id}`);
    return response.data;
  },

  toggleVerification: async (id: string, isVerified: boolean) => {
    const response = await adminApi.put(`/users/${id}/verification`, { isVerified });
    return response.data;
  },

  bulkUpdateStatus: async (userIds: string[], status: string, reason?: string) => {
    const response = await adminApi.put('/users/bulk/status', { userIds, status, reason });
    return response.data;
  },

  bulkDelete: async (userIds: string[]) => {
    const response = await adminApi.delete('/users/bulk', { data: { userIds } });
    return response.data;
  }
};

// Driver Management
export const adminDrivers = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    isOnline?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const response = await adminApi.get('/drivers', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await adminApi.get(`/drivers/${id}`);
    return response.data;
  },
  
  create: async (driverData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    password: string;
  }) => {
    const response = await adminApi.post('/drivers', driverData);
    return response.data;
  },
  
  update: async (id: string, driverData: any) => {
    const response = await adminApi.put(`/drivers/${id}`, driverData);
    return response.data;
  },
  
  updateStatus: async (id: string, status: string, reason?: string) => {
    const response = await adminApi.put(`/drivers/${id}/status`, { status, reason });
    return response.data;
  },
  
  deleteDriver: async (id: string) => {
    const response = await adminApi.delete(`/drivers/${id}`);
    return response.data;
  },
  
  bulkDelete: async (driverIds: string[]) => {
    const response = await adminApi.delete('/drivers/bulk', { data: { driverIds } });
    return response.data;
  }
};

// Vehicle Management
export const adminVehicles = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isAvailable?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    const response = await adminApi.get(`/vehicles?${queryParams.toString()}`);
    return response.data;
  },
  
  getPendingApprovals: async (page: number = 1, limit: number = 10) => {
    const response = await adminApi.get(`/vehicles/pending?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getApprovalStats: async () => {
    const response = await adminApi.get('/vehicles/approval-stats');
    return response.data;
  },
  
  approveVehicle: async (id: string, notes?: string) => {
    const response = await adminApi.put(`/vehicles/${id}/approve`, { notes });
    return response.data;
  },
  
  rejectVehicle: async (id: string, reason: string, notes?: string) => {
    const response = await adminApi.put(`/vehicles/${id}/reject`, { reason, notes });
    return response.data;
  },

  deleteVehicle: async (id: string) => {
    const response = await adminApi.delete(`/vehicles/${id}`);
    return response.data;
  }
};

// Booking Management
export const adminBookings = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value.toString());
    });

    const response = await adminApi.get(`/bookings?${queryParams.toString()}`);
    return response.data;
  },

  exportAll: async (params: {
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    const response = await adminApi.get(`/bookings/export?${queryParams.toString()}`);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await adminApi.get(`/bookings/${id}`);
    return response.data;
  },
  
  updateStatus: async (id: string, status: string, reason?: string, notes?: string) => {
    const response = await adminApi.put(`/bookings/${id}/status`, { status, reason, notes });
    return response.data;
  },

  getPaymentDetails: async (id: string) => {
    const response = await adminApi.get(`/bookings/${id}/payment`);
    return response.data;
  },

  cancel: async (id: string, reason?: string) => {
    const response = await adminApi.put(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  processRefund: async (id: string, refundMethod: 'razorpay' | 'manual', refundReason?: string, adminNotes?: string) => {
    const response = await adminApi.post(`/bookings/${id}/refund`, { 
      refundMethod, 
      refundReason, 
      adminNotes 
    });
    return response.data;
  },

  markCashCollected: async (id: string, notes?: string) => {
    const response = await adminApi.put(`/bookings/${id}/cash-collected`, { notes });
    return response.data;
  },

  approveCancellationRequest: async (id: string, reason?: string, notes?: string) => {
    const response = await adminApi.put(`/bookings/${id}/approve-cancellation`, { reason, notes });
    return response.data;
  },

  rejectCancellationRequest: async (id: string, reason?: string, notes?: string) => {
    const response = await adminApi.put(`/bookings/${id}/reject-cancellation`, { reason, notes });
    return response.data;
  }
};

// Driver document management
export const adminDriverDocuments = {
  uploadRcCard: async (driverId: string, file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await adminApi.post(`/drivers/${driverId}/documents/rc-card`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadInsurance: async (driverId: string, file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await adminApi.post(`/drivers/${driverId}/documents/insurance`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteRcCard: async (driverId: string) => {
    const response = await adminApi.delete(`/drivers/${driverId}/documents/rc-card`);
    return response.data;
  },

  deleteInsurance: async (driverId: string) => {
    const response = await adminApi.delete(`/drivers/${driverId}/documents/insurance`);
    return response.data;
  }
};

// Admin Vehicle Earnings & Profit Check
export const adminEarnings = {
  getVehicleEarnings: async (params?: {
    search?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await adminApi.get('/earnings/vehicles', { params });
    return response.data;
  },

  getVehicleBookingEarnings: async (
    vehicleId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ) => {
    const response = await adminApi.get(`/earnings/vehicles/${vehicleId}`, { params });
    return response.data;
  }
};

// Admin Ratings & Reviews
export const adminReviews = {
  getAllReviews: async (params?: {
    search?: string;
    stars?: number | string;
    hasReviewText?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await adminApi.get('/reviews', { params });
    return response.data;
  }
};

// Admin Notifications
export interface AdminNotificationItem {
  _id: string;
  title: string;
  description: string;
  targetAudience: 'user' | 'driver' | 'all';
  sentBy?: {
    _id: string;
    name?: string;
    email?: string;
  };
  status: 'sent' | 'scheduled' | 'failed';
  recipientCount: number;
  successCount?: number;
  failureCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const adminNotifications = {
  send: async (data: {
    title: string;
    description: string;
    targetAudience: 'user' | 'driver' | 'all';
  }) => {
    const response = await adminApi.post('/notifications', data);
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    targetAudience?: 'user' | 'driver' | 'all';
  }) => {
    const response = await adminApi.get('/notifications', { params });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await adminApi.delete(`/notifications/${id}`);
    return response.data;
  }
};

export default adminApi;

// Loads every page: the admin driver/vehicle tables filter in the browser, so they need all rows (not just the first 100)
export const fetchAllPages = async (getAll: (params: any) => Promise<any>, params: Record<string, unknown> = {}) => {
  const first = await getAll({ ...params, page: 1, limit: 100 });
  const docs = [...(first?.data?.docs || [])];
  const totalPages = first?.data?.totalPages || 1;
  for (let page = 2; page <= totalPages; page++) {
    const next = await getAll({ ...params, page, limit: 100 });
    docs.push(...(next?.data?.docs || []));
  }
  return { ...first, data: { ...(first?.data || {}), docs } };
};
