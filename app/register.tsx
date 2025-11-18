import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';
import { RegisterRequest } from '../services/api';

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // State for date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date(2000, 0, 1));

  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    userType: 'customer',
    profile: {
      fullName: '',
      phone: '',
      dob: '',
      location: '',
      academyName: '',
      specializations: [],
    },
  });

  const [specializationsText, setSpecializationsText] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.profile.fullName) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.profile.phone) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.profile.dob) {
      newErrors.dob = 'Date of birth is required';
    }

    if (!formData.profile.location) {
      newErrors.location = 'Location is required';
    }

    if (formData.userType === 'vendor') {
      if (!formData.profile.academyName) {
        newErrors.academyName = 'Academy name is required for vendors';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Clean up data before sending
    const submitData = { ...formData };
    
    // Process specializations from the text input
    if (submitData.userType === 'vendor' && specializationsText.trim()) {
      const specializations = specializationsText
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
      submitData.profile.specializations = specializations;
    }
    
    if (submitData.userType === 'customer') {
      delete submitData.profile.academyName;
      delete submitData.profile.specializations;
    }

    try {
      console.log('🚀 Registration form submitted:', submitData);
      const res = await register(submitData);
      console.log('✅ Registration response received', res);
      // The API now requires OTP verification. Redirect to verify screen with email prefilled.
      showSuccess('Registration created. Check your email for the verification code.');
      router.push({
        pathname: '/verify-email',
        params: { email: submitData.email.trim() },
      });
    } catch (error: any) {
      console.error('💥 Registration form error:', {
        message: error.message,
        stack: error.stack,
        formData: formData,
        submitData: submitData,
        response: error.response?.data,
      });

      const apiData = error.response?.data;

      if (apiData?.details?.length) {
        // If there are field-specific errors
        const apiErrors: Record<string, string> = {};
        apiData.details.forEach((err: any) => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
        // Show first error in snackbar
        showError(apiData.details[0].message);
      } else if (apiData?.error) {
        // Direct error message
        showError(apiData.error);
      } else if (apiData?.message) {
        // Message field
        showError(apiData.message);
      } else if (error.message) {
        // Error object message
        showError(error.message);
      } else {
        // Fallback
        showError('Registration failed. Please try again.');
      }
    }
  };

  const updateFormData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us to get started</Text>
          </View>

          <View style={styles.form}>
            {/* User Type Selection */}
            <View style={styles.userTypeContainer}>
              <Text style={styles.label}>I am a:</Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    formData.userType === 'customer' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('userType', 'customer')}
                >
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      formData.userType === 'customer' && styles.userTypeButtonTextActive,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    formData.userType === 'vendor' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('userType', 'vendor')}
                >
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      formData.userType === 'vendor' && styles.userTypeButtonTextActive,
                    ]}
                  >
                    Vendor
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                  placeholderTextColor="#9ca3af"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry
                autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Enter your full name"
                value={formData.profile.fullName}
                onChangeText={(text) => updateFormData('profile.fullName', text)}
                autoCapitalize="words"
                  placeholderTextColor="#9ca3af"
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Enter your phone number"
                value={formData.profile.phone}
                onChangeText={(text) => updateFormData('profile.phone', text)}
                keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }, errors.dob && styles.inputError]}
                onPress={() => {
                  setTempDate(formData.profile.dob ? new Date(formData.profile.dob) : new Date(2000, 0, 1));
                  setShowDatePicker(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: formData.profile.dob ? '#111827' : '#888' }}>
                  {formData.profile.dob ? formData.profile.dob : 'Select your date of birth'}
                </Text>
              </TouchableOpacity>
              {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
            </View>
  // State for date picker
  const [showDatePicker, setShowDatePicker] = useState(false);

            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={[styles.input, errors.location && styles.inputError]}
                placeholder="Enter your location"
                value={formData.profile.location}
                onChangeText={(text) => updateFormData('profile.location', text)}
                autoCapitalize="words"
                  placeholderTextColor="#9ca3af"
              />
              {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            </View>

            {/* Vendor-specific fields */}
            {formData.userType === 'vendor' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Academy Name</Text>
                  <TextInput
                    style={[styles.input, errors.academyName && styles.inputError]}
                    placeholder="Enter your academy name"
                    value={formData.profile.academyName || ''}
                    onChangeText={(text) => updateFormData('profile.academyName', text)}
                    autoCapitalize="words"
                      placeholderTextColor="#9ca3af"
                  />
                  {errors.academyName && <Text style={styles.errorText}>{errors.academyName}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Specializations (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., fitness, yoga, pilates"
                    placeholderTextColor="#9ca3af"
                    value={specializationsText}
                    onChangeText={(text) => {
                      setSpecializationsText(text);
                    }}
                    onBlur={() => {
                      // Process specializations when user finishes typing
                      const specializations = specializationsText
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s);
                      updateFormData('profile.specializations', specializations);
                    }}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        onHide={hideSnackbar}
      />

      {/* Date Picker Modal - Outside ScrollView to cover entire screen */}
      {showDatePicker && (
        <View style={styles.datePickerModal}>
          <TouchableOpacity 
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => {
                  const iso = tempDate.toISOString().split('T')[0];
                  updateFormData('profile.dob', iso);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[styles.datePickerButton, styles.datePickerDone]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              textColor="#000000"
              onChange={(_, selectedDate) => {
                if (selectedDate && Platform.OS === 'android') {
                  // Android: apply immediately
                  const iso = selectedDate.toISOString().split('T')[0];
                  updateFormData('profile.dob', iso);
                  setShowDatePicker(false);
                } else if (selectedDate) {
                  // iOS: just update temp date, don't close
                  setTempDate(selectedDate);
                }
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    flex: 1,
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  userTypeButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  userTypeButtonTextActive: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerButton: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    minWidth: 60,
  },
  datePickerDone: {
    color: '#EF4444',
    fontWeight: '600',
  },
});
