import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '@/services/api.js';
import { registerFcmToken, unregisterFcmToken } from '@/lib/fcm';

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'driver';
  isVerified: boolean;
  isApproved: boolean;
  profilePicture?: string;
  agreement?: {
    isAccepted: boolean;
    acceptedAt?: string;
    ipAddress?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  dateOfBirth?: string;
  gender?: string;
  rating?: number;
  reviewCount?: number;
  totalRides?: number;
  totalEarnings?: number;
  currentLocation?: {
    coordinates: [number, number];
    address: string;
    lastUpdated: string;
  };
  availability?: {
    isOnline: boolean;
    workingHours: {
      start: string;
      end: string;
    };
    workingDays: string[];
  };
  earnings?: {
    wallet: {
      balance: number;
      transactions: Array<{
        type: 'credit' | 'debit';
        amount: number;
        description: string;
        date: string;
      }>;
    };
    commission: number;
  };
  documents?: {
    drivingLicense: {
      number: string;
      expiryDate: string;
      image?: string;
      isVerified: boolean;
    };
    vehicleRC: {
      number: string;
      expiryDate: string;
      image?: string;
      isVerified: boolean;
    };
    insurance?: {
      number: string;
      expiryDate: string;
      image?: string;
      isVerified: boolean;
    };
    fitness?: {
      number: string;
      expiryDate: string;
      image?: string;
      isVerified: boolean;
    };
    permit?: {
      number: string;
      expiryDate: string;
      image?: string;
      isVerified: boolean;
    };
  };
  vehicleDetails?: {
    type: string;
    brand: string;
    fuelType: string;
    seatingCapacity: number;
    images: string[];
    isAc: boolean;
    isAvailable: boolean;
  };
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DriverAuthContextType {
  driver: Driver | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (phone: string, otp: string) => Promise<any>;
  registerDriver: (data: { firstName: string; lastName: string; email?: string; phone: string; otp: string }) => Promise<any>;
  sendOTP: (phone: string, purpose?: string) => Promise<any>;
  verifyOTP: (phone: string, otp: string, purpose?: string, driverData?: any) => Promise<any>;
  resendOTP: (phone: string, purpose?: string) => Promise<any>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateDriverData: (data: Partial<Driver>) => void;
  refreshDriverData: () => Promise<void>;
}

const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

// Once a driver has logged in on this device it stays a driver device, even after logout:
// user-only pages bounce to /driver (see UserAppLayout). Reset = clear site data.
export const isDriverDevice = () =>
  localStorage.getItem('appSide') === 'driver' || Boolean(localStorage.getItem('driverToken'));

export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};

interface DriverAuthProviderProps {
  children: React.ReactNode;
}

export const DriverAuthProvider: React.FC<DriverAuthProviderProps> = ({ children }) => {
  const [driver, setDriver] = useState<Driver | null>(() => {
    try {
      const saved = localStorage.getItem('driverData');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('driverToken'));
  });
  const [isLoading, setIsLoading] = useState(true);

  // Store FCM token after login / register / session restore
  useEffect(() => {
    if (isLoggedIn && driver?._id) registerFcmToken('driver');
  }, [isLoggedIn, driver?._id]);

  // Login, register or session restore → mark as driver device (sticky, logout doesn't clear it)
  useEffect(() => {
    if (isLoggedIn) localStorage.setItem('appSide', 'driver');
  }, [isLoggedIn]);

  const refreshDriverData = useCallback(async () => {
    try {
      if (!localStorage.getItem('driverToken')) {
        return;
      }
      
      const response = await apiService.getDriverProfile();
      if (response.success && response.data) {
        const driverData = response.data?.driver || response.data;
        setDriver(driverData);
        try {
          localStorage.setItem('driverData', JSON.stringify(driverData));
        } catch (e) {
          console.warn('Failed to cache driverData', e);
        }
      }
    } catch (error) {
      console.error('Error refreshing driver data:', error);
      // If there's an auth error, logout the user
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        logout();
      }
    }
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('driverToken');
      const isDriverLoggedIn = localStorage.getItem('isDriverLoggedIn');

      if (token) {
        setIsLoggedIn(true);
        await refreshDriverData();
        setIsLoading(false);
        return;
      }

      if (!token || !isDriverLoggedIn) {
        setIsLoggedIn(false);
        setDriver(null);
        localStorage.removeItem('driverData');
        setIsLoading(false);
        return;
      }

      // Fallback: try to get driver info from backend
      await refreshDriverData();
      setIsLoggedIn(true);
      
    } catch (error) {
      console.error('Error checking auth:', error);
      // Clear all auth data on error
      setIsLoggedIn(false);
      setDriver(null);
      localStorage.removeItem('driverToken');
      localStorage.removeItem('isDriverLoggedIn');
      localStorage.removeItem('driverPhone');
      localStorage.removeItem('driverData');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, otp: string) => {
    try {
      setIsLoading(true);
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      
      console.log('Attempting driver login with:', { phone: phoneNumber, otp });
      const response = await apiService.verifyDriverOTP(phoneNumber, otp, 'auth');
      console.log('Driver login response:', response);
      
      if (response.success && response.token) {
        apiService.setAuthToken(response.token, 'driver', response.refreshToken);
        localStorage.setItem('isDriverLoggedIn', 'true');
        localStorage.setItem('driverPhone', phoneNumber);
        
        try {
          const profileResponse = await apiService.getDriverProfile();
          if (profileResponse.success) {
            const driverData = profileResponse.data?.driver || profileResponse.data;
            setDriver(driverData);
            localStorage.setItem('driverData', JSON.stringify(driverData));
          } else {
            setDriver(response.driver);
            if (response.driver) localStorage.setItem('driverData', JSON.stringify(response.driver));
          }
        } catch (profileError) {
          setDriver(response.driver);
          if (response.driver) localStorage.setItem('driverData', JSON.stringify(response.driver));
        }
        
        setIsLoggedIn(true);
        return response;
      } else if (response.success && response.isNewUser) {
        return response;
      } else {
        throw new Error(response.error?.message || response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Driver login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerDriver = async (data: { firstName: string; lastName: string; email?: string; phone: string; otp: string }) => {
    try {
      setIsLoading(true);
      const phoneNumber = data.phone.replace(/[^0-9]/g, '');
      
      const response = await apiService.verifyDriverOTP(phoneNumber, data.otp, 'auth', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
      });

      if (response.success && response.token) {
        apiService.setAuthToken(response.token, 'driver', response.refreshToken);
        localStorage.setItem('isDriverLoggedIn', 'true');
        localStorage.setItem('driverPhone', phoneNumber);
        
        try {
          const profileResponse = await apiService.getDriverProfile();
          if (profileResponse.success) {
            const driverData = profileResponse.data?.driver || profileResponse.data;
            setDriver(driverData);
            localStorage.setItem('driverData', JSON.stringify(driverData));
          } else {
            setDriver(response.driver);
            if (response.driver) localStorage.setItem('driverData', JSON.stringify(response.driver));
          }
        } catch (profileError) {
          setDriver(response.driver);
          if (response.driver) localStorage.setItem('driverData', JSON.stringify(response.driver));
        }
        
        setIsLoggedIn(true);
        return response;
      } else {
        throw new Error(response.error?.message || response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Driver registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string, purpose: string = 'auth') => {
    try {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      const response = await apiService.sendDriverOTP(phoneNumber, purpose);
      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Failed to send OTP');
      }
      return response;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  };

  const verifyOTP = async (phone: string, otp: string, purpose: string = 'auth', driverData?: any) => {
    try {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      const response = await apiService.verifyDriverOTP(phoneNumber, otp, purpose, driverData);
      
      if (response.success) {
        if (response.token) {
          apiService.setAuthToken(response.token, 'driver', response.refreshToken);
          localStorage.setItem('isDriverLoggedIn', 'true');
          localStorage.setItem('driverPhone', phoneNumber);
          await refreshDriverData();
          setIsLoggedIn(true);
        }
        return response;
      } else {
        throw new Error(response.error?.message || response.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  };

  const resendOTP = async (phone: string, purpose: string = 'auth') => {
    try {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      const response = await apiService.resendDriverOTP(phoneNumber, purpose);
      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Failed to resend OTP');
      }
      return response;
    } catch (error) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  };

  const logout = () => {
    unregisterFcmToken('driver');
    try {
      console.log('Logging out driver');
      // Clear driver data first
      setDriver(null);
      setIsLoggedIn(false);
      
      // Then clear token and localStorage
      apiService.removeAuthToken('driver');
      localStorage.removeItem('isDriverLoggedIn');
      localStorage.removeItem('driverPhone');
      localStorage.removeItem('driverData');
      
      // Redirect to driver auth page
      window.location.href = '/driver/auth';
    } catch (error) {
      console.error('Driver logout error:', error);
      // Force clear state even if there's an error
      setDriver(null);
      setIsLoggedIn(false);
      apiService.removeAuthToken('driver');
      localStorage.removeItem('isDriverLoggedIn');
      localStorage.removeItem('driverPhone');
      localStorage.removeItem('driverData');
      window.location.href = '/driver/auth';
    }
  };

  const updateDriverData = (data: Partial<Driver>) => {
    setDriver((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...data,
        agreement: data.agreement ? { ...prev.agreement, ...data.agreement } : prev.agreement,
        documents: data.documents ? { ...prev.documents, ...data.documents } : prev.documents,
        vehicleDetails: data.vehicleDetails ? { ...prev.vehicleDetails, ...data.vehicleDetails } : prev.vehicleDetails,
      };
      try {
        localStorage.setItem('driverData', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to cache driverData', e);
      }
      return updated;
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: DriverAuthContextType = {
    driver,
    isLoggedIn,
    isLoading,
    login,
    registerDriver,
    sendOTP,
    verifyOTP,
    resendOTP,
    logout,
    checkAuth,
    updateDriverData,
    refreshDriverData,
  };

  return (
    <DriverAuthContext.Provider value={value}>
      {children}
    </DriverAuthContext.Provider>
  );
};
