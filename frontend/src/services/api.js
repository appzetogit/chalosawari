import { resolveUploadsUrls } from '../utils/imageUrl';

// Resolve API base URL without hardcoded insecure IPs
const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  return import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
};
const API_BASE_URL = resolveApiBaseUrl();

// localStorage key per role; the refresh token sits under `${key}Refresh`
const TOKEN_KEY = { user: 'token', driver: 'driverToken', admin: 'adminToken' };
const tokenKey = (role) => TOKEN_KEY[role] || 'token';

class ApiService {
  constructor() {
    this.baseURL = resolveApiBaseUrl();
    this.tokens = {
      user: null,
      driver: null,
      admin: null
    };
    this.refreshing = {};
  }

  // Check if we're currently on an auth page to prevent redirect loops
  isOnAuthPage() {
    const currentPath = window.location.pathname;
    return currentPath.includes('/auth') || 
           currentPath.includes('/driver-auth') || 
           currentPath.includes('/admin-auth') ||
           currentPath === '/';
  }

  // Get auth token from localStorage
  getAuthToken(role = 'user') {
    return localStorage.getItem(tokenKey(role));
  }

  storeTokens(role, token, refreshToken) {
    localStorage.setItem(tokenKey(role), token);
    if (refreshToken) localStorage.setItem(`${tokenKey(role)}Refresh`, refreshToken);
  }

  // Called on login
  setAuthToken(token, role = 'user', refreshToken) {
    this.storeTokens(role, token, refreshToken);
  }

  // Remove auth + refresh token from localStorage
  removeAuthToken(role = 'user') {
    localStorage.removeItem(tokenKey(role));
    localStorage.removeItem(`${tokenKey(role)}Refresh`);
  }

  // Swap the stored refresh token for new tokens. true = refreshed, false = none/rejected (log out).
  // Network/5xx errors throw instead, so a server restart (deploy) doesn't log anyone out.
  // Parallel 401s share one refresh call per role.
  refreshAuth(role) {
    const refreshToken = localStorage.getItem(`${tokenKey(role)}Refresh`);
    if (!refreshToken) return Promise.resolve(false);
    this.refreshing[role] ??= fetch(`${this.baseURL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then(async (res) => {
      if (res.status === 401) return false;
      if (!res.ok) throw new Error(`Token refresh failed: HTTP ${res.status}`);
      const data = await res.json();
      this.storeTokens(role, data.token, data.refreshToken);
      return true;
    }).finally(() => { delete this.refreshing[role]; });
    return this.refreshing[role];
  }

  // Get headers for API requests
  getHeaders(role = 'user', isFormData = false) {
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Don't add authentication for public endpoints
    if (role === 'public') {
      return headers;
    }

    const token = this.getAuthToken(role);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Make API request with retry mechanism
  async request(endpoint, options = {}, role = 'user', retryCount = 0, refreshed = false) {
    try {
      
      const isFormData = options.body instanceof FormData;
      const defaultHeaders = this.getHeaders(role, isFormData);
      const customHeaders = options.headers || {};
      const headers = { ...defaultHeaders, ...customHeaders };
      if (isFormData && headers['Content-Type']) {
        delete headers['Content-Type'];
      }

      const url = `${this.baseURL}${endpoint}`;
      const config = {
        ...options,
        headers,
      };

      const response = await fetch(url, config);
      // nginx returns an HTML page on 502/504 (e.g. during a deploy): don't surface "Unexpected token <"
      let data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // 429 is not retried: retrying only burns more of the limit (OTP limiter counts every hit)

        // Handle authentication errors (but not for public endpoints)
        if (response.status === 401 && role !== 'public') {
          // Access token expired → refresh once and retry
          if (!refreshed && await this.refreshAuth(role)) {
            return this.request(endpoint, options, role, retryCount, true);
          }
          this.removeAuthToken(role);

          // Redirect only inside that role's own pages: a stale user token on /driver must not
          // throw the driver onto the user login (and vice versa). Skip on auth pages to prevent loops.
          const path = window.location.pathname;
          const area = path.startsWith('/driver') ? 'driver' : path.startsWith('/admin') ? 'admin' : 'user';
          if (area === role && !this.isOnAuthPage()) {
            window.location.href = { driver: '/driver-auth', admin: '/admin-auth', user: '/auth' }[role];
          }

          throw new Error('Authentication failed. Please login again.');
        }

        // Backend sends either { error: { message } } or { message }
        const fallback = response.status >= 500 ? 'Server is busy, please try again in a moment.' : `Request failed (${response.status})`;
        const err = new Error(data.error?.message || (typeof data.error === 'string' && data.error) || data.message || fallback);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      if (data) {
        data = resolveUploadsUrls(data);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication APIs
  async registerUser(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, 'public');
  }

  async sendOTP(phone, purpose = 'auth') {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }, 'public');
  }

  async verifyOTP(phone, otp, purpose = 'auth', userData = null) {
    const payload = { phone, otp, purpose };
    if (userData) {
      payload.userData = userData;
    }
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 'public');
  }

  async resendOTP(phone, purpose = 'auth') {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }, 'public');
  }

  async logout(role = 'user') {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      }, role);
    } finally {
      this.removeAuthToken(role);
    }
  }

  // Driver OTP APIs (Public endpoints - no authentication required)
  async sendDriverOTP(phone, purpose = 'signup') {
    return this.request('/auth/driver/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }, 'public');
  }

  async verifyDriverOTP(phone, otp, purpose = 'signup', driverData = null) {
    return this.request('/auth/driver/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, purpose, driverData }),
    }, 'public');
  }

  async resendDriverOTP(phone, purpose = 'signup') {
    return this.request('/auth/driver/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }, 'public');
  }

  // User Profile APIs
  async getUserProfile() {
    return this.request('/user/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadUserAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.request('/user/avatar', {
      method: 'POST',
      body: formData,
    }, 'user');
  }

  async getUserBookings(status = null, page = 1, limit = 10) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page);
    params.append('limit', limit);

    return this.request(`/user/bookings?${params.toString()}`);
  }

  async getUserPreferences() {
    return this.request('/user/preferences');
  }

  async updateUserPreferences(preferences) {
    return this.request('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Vehicle Search APIs
  async searchVehicles(searchParams) {
    const params = new URLSearchParams();
    if (searchParams.from) params.append('from', searchParams.from);
    if (searchParams.to) params.append('to', searchParams.to);
    if (searchParams.date) params.append('date', searchParams.date);
    if (searchParams.time) params.append('time', searchParams.time);
    if (searchParams.type) params.append('type', searchParams.type);

    return this.request(`/vehicles/search?${params.toString()}`);
  }

  async getVehicleDetails(vehicleId) {
    return this.request(`/vehicles/${vehicleId}`);
  }

  // Booking APIs
  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBookingDetails(bookingId) {
    return this.request(`/bookings/${bookingId}`);
  }

  async getBookingReceipt(bookingId) {
    return this.request(`/bookings/${bookingId}/receipt`);
  }

  async rateBooking(bookingId, stars, review = '') {
    return this.request(`/user/bookings/${bookingId}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ stars, review }),
    });
  }

  async requestCancellation(bookingId, reason) {
    return this.request(`/user/bookings/${bookingId}/request-cancellation`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Driver Management APIs
  async getDriverProfile() {
    return this.request('/driver/profile', {}, 'driver');
  }

  async updateDriverProfile(profileData) {
    return this.request('/driver/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }, 'driver');
  }

  async uploadDriverAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.request('/driver/avatar', {
      method: 'POST',
      body: formData,
    }, 'driver');
  }

  async getDriverRequests() {
    return this.request('/driver/requests', {}, 'driver');
  }

  // Driver booking list (matches backend /api/driver/bookings)
  async getDriverBookings(status = null, page = 1, limit = 10) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page);
    params.append('limit', limit);
    return this.request(`/driver/bookings?${params.toString()}`, {}, 'driver');
  }

  // Update driver booking status
  async updateDriverBookingStatus(bookingId, status, extras = {}) {
    return this.request(`/driver/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...extras })
    }, 'driver');
  }

  async updateDriverLocation(latitude, longitude, address) {
    return this.request('/driver/location', {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude, address }),
    }, 'driver');
  }

  async getDriverEarnings() {
    return this.request('/driver/earnings', {}, 'driver');
  }

  async getDriverStats() {
    return this.request('/driver/stats', {}, 'driver');
  }

  async acceptDriverAgreement(agreementData) {
    return this.request('/driver/accept-agreement', {
      method: 'POST',
      body: JSON.stringify(agreementData),
    }, 'driver');
  }

  // Admin Management APIs
  async getAdminDashboard() {
    return this.request('/admin/dashboard', {}, 'admin');
  }

  async getAllUsers(page = 1, limit = 10, status = null) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (status) params.append('status', status);

    return this.request(`/admin/users?${params.toString()}`, {}, 'admin');
  }

  async getAllDrivers(page = 1, limit = 10, status = null) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (status) params.append('status', status);

    return this.request(`/admin/drivers?${params.toString()}`, {}, 'admin');
  }

  async verifyDriver(driverId) {
    return this.request(`/admin/drivers/${driverId}/verify`, {
      method: 'PUT',
    }, 'admin');
  }

  async getAllBookings(page = 1, limit = 10, status = null) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (status) params.append('status', status);

    return this.request(`/admin/bookings?${params.toString()}`, {}, 'admin');
  }

  async getAdminAnalytics() {
    return this.request('/admin/analytics', {}, 'admin');
  }

  // Utility methods
  isAuthenticated(role = 'user') {
    const hasToken = !!this.getAuthToken(role);
    return hasToken;
  }

  getCurrentUserRole() {
    if (this.getAuthToken('admin')) return 'admin';
    if (this.getAuthToken('driver')) return 'driver';
    if (this.getAuthToken('user')) return 'user';
    return null;
  }

  // Error handling
  handleApiError(error) {
    console.error('API Error:', error);
    
    if (error.message.includes('Authentication failed')) {
      // Redirect to login
      window.location.href = '/auth';
      return;
    }

    // You can add more specific error handling here
    return {
      message: error.message || 'An unexpected error occurred',
      type: 'error'
    };
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;
