// const BASE_URL = 'https://quackplan2.ahmed-abd-elmohsen.tech';
const BASE_URL = 'http://localhost:3000';

export interface RegisterRequest {
  email: string;
  password: string;
  userType: 'vendor' | 'customer';
  profile: {
    fullName: string;
    phone?: string;
    dob?: string; // Optional - not required for core app functionality
    location?: string;
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
      allowedVendors?: string[];
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
    allowedVendors?: string[];
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CancelBookingRequest {
  byUserId: string;
}

// ================= Event Assignment Interfaces =================
export interface User {
  _id: string;
  email: string;
  profile: {
    fullName: string;
    profilePicture?: string;
  };
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateEventWithAssignmentRequest extends CreateEventRequest {
  assignedUsers?: string[];
}

export interface EventAssignment {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    vendorId: {
      profile: {
        fullName: string;
      };
    };
  };
  userId: string | {
    _id: string;
    email: string;
    profile: {
      fullName: string;
    };
  };
  status: 'pending' | 'accepted' | 'rejected';
  assignedBy: {
    profile: {
      fullName: string;
    };
  };
  respondedAt?: string;
  createdAt: string;
}

export interface EventAssignmentsResponse {
  assignments: EventAssignment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AcceptedEventsResponse {
  events: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
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

  async uploadProfileImage(
    token: string,
    imageData: string | FormData
  ): Promise<{ message: string; profilePicture: string }> {
    const url = `${this.baseUrl}/api/auth/profile/picture`;

    let formData: FormData;
    if (typeof imageData === 'string') {
      formData = new FormData();
      formData.append('picture', {
        uri: imageData,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);
    } else {
      formData = imageData;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type — fetch adds boundary
        },
        body: formData,
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(data.message || `Upload failed: ${response.status}`);
      }

      return {
        message: data.message || 'Success',
        profilePicture: data.profilePicture || '',
      };
    } catch (error: any) {
      console.error('API Upload Error:', error);
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

  async updatePersonalEvent(token: string, eventId: string, body: {
    title?: string;
    startsAt?: string;
    endsAt?: string;
    notes?: string;
  }): Promise<any> {
    return this.request<any>(`/api/personal-events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async deletePersonalEvent(token: string, eventId: string): Promise<any> {
    return this.request<any>(`/api/personal-events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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

  // ================= Event Update (Vendor) =================
  async updateEvent(token: string, eventId: string, body: CreateEventRequest): Promise<any> {
    return this.request<any>(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // ================= Event Delete (Vendor) =================
  async deleteEvent(token: string, eventId: string): Promise<any> {
    return this.request<any>(`/api/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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

  // ================= Account Deletion =================
  async deleteAccount(token: string, userId: string): Promise<any> {
    return this.request<any>(`/api/users/${userId}/permanent`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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

  // ================= Event Assignment APIs =================

  // Get all users (for vendor to select users)
  async getAllUsers(token: string, params?: {
    userType?: 'customer' | 'vendor';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<UsersResponse> {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    const endpoint = `/api/users${qs ? `?${qs}` : ''}`;
    return this.request<UsersResponse>(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  // Create event with assigned users
  async createEventWithAssignment(token: string, body: CreateEventWithAssignmentRequest): Promise<any> {
    return this.request<any>('/api/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // Get user's event assignments (pending/accepted/rejected)
  async getMyAssignments(token: string, params?: {
    status?: 'pending' | 'accepted' | 'rejected';
    page?: number;
    limit?: number;
  }): Promise<EventAssignmentsResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const qs = query.toString();
    const endpoint = `/api/event-assignments/my-assignments${qs ? `?${qs}` : ''}`;
    return this.request<EventAssignmentsResponse>(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  // Get user's accepted events (calendar)
  async getMyAcceptedEvents(token: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<AcceptedEventsResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const qs = query.toString();
    const endpoint = `/api/event-assignments/my-events${qs ? `?${qs}` : ''}`;
    return this.request<AcceptedEventsResponse>(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  // Accept event assignment
  async acceptEventAssignment(token: string, assignmentId: string): Promise<EventAssignment> {
    return this.request<EventAssignment>(`/api/event-assignments/${assignmentId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Reject event assignment
  async rejectEventAssignment(token: string, assignmentId: string): Promise<EventAssignment> {
    return this.request<EventAssignment>(`/api/event-assignments/${assignmentId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Get event assignments for specific event (vendor only)
  async getEventAssignments(token: string, eventId: string): Promise<EventAssignmentsResponse> {
    return this.request<EventAssignmentsResponse>(`/api/event-assignments/event/${eventId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  // Get notifications
  async getNotifications(token: string, params?: {
    type?: string;
    sent?: boolean;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    const endpoint = `/api/notifications${qs ? `?${qs}` : ''}`;
    return this.request<any>(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  // Push Notifications
  async updatePushToken(token: string, pushToken: string) {
    return this.request<{ message: string }>('/api/users/push-token', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pushToken }),
    });
  }
  // Send manual reminder to attendees (Vendor)
  async sendEventReminder(token: string, eventId: string): Promise<any> {
    return this.request<any>(`/api/events/${eventId}/remind`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}

export const apiService = new ApiService();
