const BASE_URL = 'http://localhost:3000'; // Replace with your actual server URL

export interface RegisterRequest {
  email: string;
  password: string;
  userType: 'vendor' | 'customer';
  profile: {
    fullName: string;
    phone: string;
    dob: string;
    location: string;
    academyName?: string; // Only for vendors
    specializations?: string[]; // Only for vendors
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
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
    };
    createdAt: string;
    updatedAt: string;
    lastLogin: string;
  };
  expiresIn: string;
}

export interface ProfileResponse {
  user: {
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
  };
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log('🚀 API Request:', {
        url,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body as string) : null
      });

      const response = await fetch(url, config);
      console.log('📡 API Response Status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📦 API Response Data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('✅ API Success:', data);
      return data;
    } catch (error : any) {
      console.error('💥 API Request Failed:', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(token: string): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async uploadProfileImage(token: string, imageUri: string): Promise<{ message: string; profilePicture: string }> {
    const formData = new FormData();
    formData.append('picture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    const url = `${this.baseUrl}/api/auth/profile/picture`;
    
    try {
      console.log('📸 Uploading profile image:', imageUri);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the browser set it with boundary
        },
        body: formData,
      });

      console.log('📡 Upload Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Upload Success:', data);
      return data;
    } catch (error: any) {
      console.error('💥 Upload Request Failed:', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

export const apiService = new ApiService();
