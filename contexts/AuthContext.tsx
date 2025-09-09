import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, RegisterRequest, LoginRequest } from '../services/api';

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
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  uploadProfileImage: (imageUri: string) => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
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
        
        // Store in AsyncStorage
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        console.log('💾 User data stored successfully');
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
      
      const response = await apiService.register(data);
      console.log('📝 Registration response received:', response);
      
      if (response.token && response.user) {
        console.log('✅ Registration successful, storing data...');
        setToken(response.token);
        setUser(response.user);
        
        // Store in AsyncStorage
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        console.log('💾 User data stored successfully');
      } else {
        console.error('❌ Registration failed - missing token or user data:', response);
        throw new Error(response.message || 'Registration failed - missing token or user data');
      }
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

  const uploadProfileImage = async (imageUri: string) => {
    if (!token) throw new Error('No authentication token');
    
    try {
      console.log('📸 Uploading profile image...', imageUri);
      const response = await apiService.uploadProfileImage(token, imageUri);
      console.log('✅ Profile image uploaded:', response);
      
      // Update user data with new profile picture
      if (user) {
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            profilePicture: response.profilePicture,
          },
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        console.log('💾 Updated user with new profile picture:', response.profilePicture);
      }
    } catch (error: any) {
      console.error('💥 Profile image upload error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
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
    logout,
    refreshProfile,
    uploadProfileImage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
