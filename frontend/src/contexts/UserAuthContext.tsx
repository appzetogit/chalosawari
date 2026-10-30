import React, { createContext, useContext, useEffect, useState } from 'react';
import apiService from '@/services/api';

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        console.log('Checking auth status...');
        
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
        // Clear invalid tokens and user data
        apiService.removeAuthToken();
        setUser(null);
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
        apiService.setAuthToken(response.token);
        
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
        apiService.setAuthToken(response.token);
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
      // If refresh fails, clear the invalid token and user data
      apiService.removeAuthToken();
      setUser(null);
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
