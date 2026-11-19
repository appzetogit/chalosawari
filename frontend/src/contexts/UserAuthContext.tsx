import React, { createContext, useContext, useEffect, useState } from 'react';
import apiService from '@/services/api';
import { registerFcmToken, unregisterFcmToken } from '@/lib/fcm';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePicture?: string;
  location?: string;
  wallet: {
    balance: number;
    transactions: Array<{
      type: 'credit' | 'debit';
      amount: number;
      description: string;
      date: string;
    }>;
  };
  preferences: {
    preferredVehicleType: string;
    preferredSeat: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, otp: string, userData?: any) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  updateAvatar: (file: File) => Promise<string>;
  refreshUser: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};

interface UserAuthProviderProps {
  children: React.ReactNode;
}

export const UserAuthProvider: React.FC<UserAuthProviderProps> = ({ children }) => {
  // Cached profile → pages render instantly on app open; the server copy refreshes it in the background
  const [user, setUser] = useState<User | null>(() => {
    if (!localStorage.getItem('token')) return null;
    try { return JSON.parse(localStorage.getItem('userData') || 'null'); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(() => !user);

  const isAuthenticated = !!user;

  // Keep the cache in sync with every login / profile update / logout
  useEffect(() => {
    try {
      if (user) localStorage.setItem('userData', JSON.stringify(user));
      else localStorage.removeItem('userData');
    } catch { /* storage full or blocked: cache is optional */ }
  }, [user]);

  // Store FCM token after login / register / session restore
  useEffect(() => {
    if (user?._id) registerFcmToken('user');
  }, [user?._id]);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // No loader when a cached profile is already on screen
        if (!localStorage.getItem('userData')) setIsLoading(true);
        
        // Check if we have a token first
        const hasToken = apiService.isAuthenticated();
        console.log('Token check result:', hasToken);
        
        if (hasToken) {
          console.log('Token found, attempting to refresh user data');
          await refreshUser();
        } else {
          console.log('No token found, user not authenticated');
          // Clear any stale user data
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // refreshUser already logged out on a real 401; a network/5xx error keeps the cached user signed in
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (phone: string, otp: string, userData?: any) => {
    try {
      setIsLoading(true);
      // Remove country code if present
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      
      console.log('Attempting unified login with:', { phone: phoneNumber, otp });
      
      const response = await apiService.verifyOTP(phoneNumber, otp, 'auth', userData);
      
      console.log('Login/verify response:', response);
      
      if (response.success && response.token) {
        console.log('Login successful, setting token and user');
        // Set token first
        apiService.setAuthToken(response.token, 'user', response.refreshToken);
        
        // Fetch complete user profile data
        try {
          const profileResponse = await apiService.getUserProfile();
          if (profileResponse.success) {
            const profileData = profileResponse.data?.user || profileResponse.data;
            setUser(profileData);
          } else {
            setUser(response.user);
          }
        } catch (profileError) {
          console.warn('Failed to fetch complete profile, using basic user data:', profileError);
          setUser(response.user);
        }
        
        return response;
      } else if (response.success && response.isNewUser) {
        // User needs to fill details
        return response;
      } else {
        console.log('Login failed:', response);
        throw new Error(response.error?.message || response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      apiService.removeAuthToken();
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await apiService.registerUser(userData);
      
      if (response.success && response.token) {
        apiService.setAuthToken(response.token, 'user', response.refreshToken);
        try {
          const profileResponse = await apiService.getUserProfile();
          if (profileResponse.success) {
            const userProfile = profileResponse.data?.user || profileResponse.data;
            setUser(userProfile);
          } else {
            setUser(response.user);
          }
        } catch (profileErr) {
          setUser(response.user);
        }
        return response;
      } else if (response.success) {
        return response;
      } else {
        throw new Error(response.error?.message || response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    unregisterFcmToken('user');
    try {
      console.log('Logging out user');
      // Clear user data first
      setUser(null);
      // Then clear token
      apiService.removeAuthToken();
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear state even if there's an error
      setUser(null);
      apiService.removeAuthToken();
      window.location.href = '/';
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      setIsLoading(true);
      const response = await apiService.updateUserProfile(profileData);
      
      if (response.success) {
        // Fix: Handle the nested data structure from backend
        const updatedUser = response.data?.user || response.data;
        setUser(updatedUser);
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvatar = async (file: File): Promise<string> => {
    try {
      setIsLoading(true);
      const response = await apiService.uploadUserAvatar(file);
      if (response.success) {
        const updatedUser = response.data?.user || response.user;
        if (updatedUser) {
          setUser(updatedUser);
        } else if (response.data?.profilePicture) {
          setUser(prev => prev ? { ...prev, profilePicture: response.data.profilePicture } : null);
        }
        return response.data?.profilePicture || '';
      } else {
        throw new Error(response.message || response.error?.message || 'Profile picture upload failed');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Refreshing user data');
      const response = await apiService.getUserProfile();
      console.log('Profile API response:', response);
      
      if (response.success) {
        // Fix: Handle the nested data structure from backend
        const userData = response.data?.user || response.data;
        console.log('User data refreshed successfully:', userData);
        setUser(userData);
      } else {
        console.log('Failed to refresh user data:', response.message);
        throw new Error(response.message || 'Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Profile refresh error:', error);
      // api.js removes the token only on a real 401 (after a failed refresh): that is a logout.
      // Network/5xx errors (offline, deploy restart) keep the cached user.
      if (!localStorage.getItem('token')) setUser(null);
      throw error;
    }
  };

  const value: UserAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    updateAvatar,
    refreshUser,
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};
