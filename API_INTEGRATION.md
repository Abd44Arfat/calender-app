# API Integration Guide

This document describes the API integration for the Calendar App authentication system.

## API Endpoints

### Base URL
Update the `BASE_URL` in `/services/api.ts` to match your server URL.

### Authentication Endpoints

#### 1. Register User
- **Endpoint**: `POST {{baseUrl}}/api/auth/register`
- **Description**: Register a new user (vendor or customer)

**Vendor Registration:**
```json
{
  "email": "joh.o4fg@example.com",
  "password": "Str0ngPass!",
  "userType": "vendor",
  "profile": {
    "fullName": "John Doe",
    "phone": "+201091893835",
    "dob": "1990-01-01",
    "location": "New York, NY",
    "academyName": "John's Fitness Studio",
    "specializations": ["fitness", "yoga"]
  }
}
```

**Customer Registration:**
```json
{
  "email": "joh.4fg@example.com",
  "password": "Str0ngPass!",
  "userType": "customer",
  "profile": {
    "fullName": "John Doe",
    "phone": "+201091893835",
    "dob": "1990-01-01",
    "location": "New York, NY"
  }
}
```

#### 2. Login User
- **Endpoint**: `POST {{baseUrl}}/api/auth/login`
- **Description**: Authenticate user and return JWT token

```json
{
  "email": "joh.oy4@example.com",
  "password": "Str0ngPass!"
}
```

## Features Implemented

### 1. Authentication Flow
- ✅ User registration with form validation
- ✅ User login with form validation
- ✅ JWT token storage using AsyncStorage
- ✅ Automatic token persistence across app restarts
- ✅ Logout functionality with token cleanup

### 2. User Experience
- ✅ Loading states during API calls
- ✅ Snackbar notifications for success/error messages
- ✅ Form validation with error messages
- ✅ Smooth navigation between screens
- ✅ User type selection (vendor/customer)
- ✅ Dynamic profile display based on user type

### 3. Security
- ✅ Secure password input fields
- ✅ Token-based authentication
- ✅ Automatic logout on token expiration
- ✅ Protected routes with AuthWrapper

## File Structure

```
app/
├── index.tsx              # Initial routing logic
├── login.tsx              # Login screen
├── register.tsx           # Registration screen
├── _layout.tsx            # Root layout with AuthProvider
└── (tabs)/
    ├── _layout.tsx        # Tab layout with AuthWrapper
    └── profile.tsx        # Profile screen with logout

components/
├── AuthWrapper.tsx        # Authentication wrapper component
└── Snackbar.tsx          # Snackbar notification component

contexts/
└── AuthContext.tsx        # Authentication context and state management

hooks/
└── useSnackbar.ts         # Custom hook for snackbar notifications

services/
└── api.ts                 # API service with authentication endpoints
```

## Usage

1. **Start the app**: The app will automatically check for existing authentication
2. **Register**: New users can register as either vendors or customers
3. **Login**: Existing users can log in with their credentials
4. **Profile**: Users can view their profile and logout
5. **Navigation**: Authenticated users are automatically redirected to the main app

## Configuration

To use with your server:

1. Update the `BASE_URL` in `/services/api.ts`
2. Ensure your server endpoints match the expected request/response format
3. Make sure CORS is configured for your mobile app

## Error Handling

The app includes comprehensive error handling:
- Network errors are caught and displayed to users
- Form validation prevents invalid submissions
- API errors are shown via snackbar notifications
- Loading states prevent multiple submissions

## Next Steps

- Add password reset functionality
- Implement profile editing
- Add social login options
- Enhance error handling for specific API error codes


