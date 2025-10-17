const BASE_URL = 'https://quackplan2.ahmed-abd-elmohsen.tech'; // Replace with your actual server URL

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

export interface Booking {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    location: string;
    startsAt: string;
    endsAt: string;
    priceCents: number;
  };
  userId: {
    _id: string;
    profile: {
      fullName: string;
    };
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingsResponse {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateEventRequest {
  title: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  capacity: number;
  priceCents: number;
  visibility: 'public' | 'private';
  status: 'draft' | 'published';
  tags: string[];
  coverUrl?: string;
}

export interface CreateBookingRequest {
  eventId: string;
}

export interface UpdateProfileRequest {
  profile: {
    bio?: string;
    location?: string;
    rating?: number;
    fullName?: string;
    phone?: string;
    academyName?: string;
    specializations?: string[];
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CancelBookingRequest {
  byUserId: string;
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

        // بدل throw Error عام → نرمي object كامل عشان نقدر نقرأ details فوق
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: data,
          },
        };
      }
      
      console.log('✅ API Success:', data);
      return data;
    } catch (error: any) {
      console.error('💥 API Request Failed:', {
        url,
        error: error.message || error,
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

  // Verify email OTP after registration
  async verifyEmail(body: { email: string; otp: string }): Promise<AuthResponse> {
    console.log('📤 VERIFY PAYLOAD', body);

    return this.request<AuthResponse>('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email.trim(),
        otp: body.otp.trim(),
      }),
    });
  }
  

  // Resend verification OTP
  async resendOtp(body: { email: string }): Promise<any> {
    return this.request<any>('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Forgot password: request reset OTP
  async forgotPassword(body: { email: string }): Promise<any> {
    console.log('📤 VERIFY PAYLOAD', body);
    return this.request<any>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Reset password with OTP
  async resetPassword(body: { email: string; otp: string; newPassword: string }): Promise<any> {
    console.log('📤 VERIFY PAYLOAD', body);
    return this.request<any>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
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
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: { message: errorText },
          },
        };
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

  // ================= Events =================
  async listEvents(params?: {
    vendorId?: string;
    status?: string;
    visibility?: string;
    tags?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    const endpoint = `/api/events${qs ? `?${qs}` : ''}`;
    return this.request<any>(endpoint, { method: 'GET' });
  }

  async getEventById(id: string): Promise<any> {
    return this.request<any>(`/api/events/${id}`, { method: 'GET' });
  }

  // ================= Personal Events =================
  async listPersonalEvents(token: string, params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    const endpoint = `/api/personal-events${qs ? `?${qs}` : ''}`;
    return this.request<any>(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  async createPersonalEvent(token: string, body: {
    userId: string;
    title: string;
    startsAt: string; // ISO
    endsAt: string;   // ISO
    notes?: string;
  }): Promise<any> {
    return this.request<any>('/api/personal-events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // ================= Bookings =================
  async listBookings(token: string, params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<BookingsResponse> {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    const endpoint = `/api/bookings${qs ? `?${qs}` : ''}`;
    return this.request<BookingsResponse>(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  async createBooking(token: string, body: CreateBookingRequest): Promise<any> {
    return this.request<any>('/api/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // ================= Event Creation (Vendor) =================
  async createEvent(token: string, body: CreateEventRequest): Promise<any> {
    return this.request<any>('/api/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // ================= Profile Management =================
  async updateProfile(token: string, body: UpdateProfileRequest): Promise<any> {
    return this.request<any>('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async changePassword(token: string, body: ChangePasswordRequest): Promise<any> {
    return this.request<any>('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // ================= Booking Management =================
  async cancelBooking(token: string, bookingId: string, body: CancelBookingRequest): Promise<any> {
    return this.request<any>(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }
}  

export const apiService = new ApiService();
