import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiService, LoginRequest, RegisterRequest } from '../services/api';

interface User {
  _id: string;
  email: string;
  userType: 'vendor' | 'customer';
  isEmailVerified: boolean;
  isActive: boolean;
  profile: {
    fullName: string;
    phone: string;
    dob: string;
    location: string;
    rating: number;
    isVendor: boolean;
    academyName?: string;
    specializations: string[];
    verificationStatus: string;
    profilePicture?: string;
    blockedVendors?: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<any>;
  verifyEmail?: (payload: { email: string; otp: string }) => Promise<any>;
  resendOtp?: (payload: { email: string }) => Promise<any>;
  forgotPassword?: (payload: { email: string }) => Promise<any>;
  resetPassword?: (payload: { email: string; otp: string; newPassword: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // FIXED: Accept string | FormData, return response
  uploadProfileImage: (
    imageData: string | FormData
  ) => Promise<{ message: string; profilePicture: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    loadStoredAuth();

    // Check token expiry every minute
    const intervalId = setInterval(async () => {
      const tokenExpiry = await AsyncStorage.getItem('token_expiry');
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry, 10);
        const currentTime = Date.now();

        if (currentTime >= expiryTime) {
          console.log('🔒 Token expired, auto-logging out...');
          await logout();
        }
      }
    }, 60000); // Check every minute

    // Check token expiry when app comes to foreground
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const tokenExpiry = await AsyncStorage.getItem('token_expiry');
        if (tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry, 10);
          const currentTime = Date.now();

          if (currentTime >= expiryTime) {
            console.log('🔒 Token expired on app resume, auto-logging out...');
            await logout();
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      const tokenExpiry = await AsyncStorage.getItem('token_expiry');

      if (storedToken && storedUser && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry, 10);
        const currentTime = Date.now();

        // Check if token has expired
        if (currentTime >= expiryTime) {
          console.log('🔒 Token expired, logging out...');
          await logout();
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          console.log('✅ Token valid, expires in:', Math.floor((expiryTime - currentTime) / 1000 / 60 / 60), 'hours');
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      console.log('🔐 Starting login process...', data);
      setIsLoading(true);

      const response = await apiService.login(data);
      console.log('🔐 Login response received:', response);

      if (response.token && response.user) {
        console.log('✅ Login successful, storing data...');
        setToken(response.token);
        setUser(response.user);

        // Calculate token expiry time (7 days from now)
        const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds

        // Store in AsyncStorage
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        await AsyncStorage.setItem('token_expiry', expiryTime.toString());
        console.log('💾 User data stored successfully, token expires:', new Date(expiryTime).toISOString());
      } else {
        console.error('❌ Login failed - missing token or user data:', response);
        throw new Error(response.message || 'Login failed - missing token or user data');
      }
    } catch (error: any) {
      console.error('💥 Login error:', {
        message: error.message,
        stack: error.stack,
        data: data
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      console.log('📝 Starting registration process...', data);
      setIsLoading(true);
      // New flow: registration returns a message and requires OTP verification.
      const response = await apiService.register(data);
      console.log('📝 Registration response received:', response);
      // Do not auto-login here — the user must verify OTP via verifyEmail endpoint.
      return response;
    } catch (error: any) {
      console.error('💥 Registration error:', {
        message: error.message,
        stack: error.stack,
        data: data
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (payload: { email: string; otp: string }) => {
    try {
      setIsLoading(true);
      const response = await apiService.verifyEmail(payload);
      if (response.token && response.user) {
        setToken(response.token);
        setUser(response.user);

        // Calculate token expiry time (7 days from now)
        const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000);

        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        await AsyncStorage.setItem('token_expiry', expiryTime.toString());
      }
      return response;
    } catch (e) {
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (payload: { email: string }) => {
    return apiService.resendOtp(payload);
  };

  const forgotPassword = async (payload: { email: string }) => {
    return apiService.forgotPassword(payload);
  };

  const resetPassword = async (payload: { email: string; otp: string; newPassword: string }) => {
    return apiService.resetPassword(payload);
  };

  const refreshProfile = async () => {
    if (!token) return;

    try {
      console.log('🔄 Refreshing profile...');
      const response = await apiService.getProfile(token);
      console.log('👤 Profile refreshed:', response);

      setUser(response.user);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
    } catch (error: any) {
      console.error('💥 Profile refresh error:', error);
      throw error;
    }
  };

  // REPLACE the old uploadProfileImage with this:
  const uploadProfileImage = async (imageData: string | FormData) => {
    if (!token) throw new Error('Authentication token missing');

    try {
      console.log('Uploading profile image...', typeof imageData === 'string' ? imageData : '[FormData]');

      // Build FormData if input is URI string
      let formData: FormData;
      if (typeof imageData === 'string') {
        formData = new FormData();
        formData.append('image', {
          uri: imageData,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
      } else {
        formData = imageData;
      }

      // Call API service (supports FormData)
      const response = await apiService.uploadProfileImage(token, formData);

      console.log('Upload success:', response);

      // Update user state + AsyncStorage
      if (user && response.profilePicture) {
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            profilePicture: response.profilePicture,
          },
        };

        setUser(updatedUser);
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        console.log('User updated with new profile picture');
      }

      return response;
    } catch (error: any) {
      console.error('Upload failed:', error);
      throw new Error(error.message || 'Failed to upload image');
    }
  };
  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('token_expiry');
      console.log('🔓 Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    // new methods
    verifyEmail,
    resendOtp,
    forgotPassword,
    resetPassword,
    logout,
    refreshProfile,
    uploadProfileImage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
