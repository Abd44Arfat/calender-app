import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';
import { Snackbar } from '../components/Snackbar';
import { RegisterRequest } from '../services/api';

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  
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
      // Don't show generic error message, let individual field errors show
      return;
    }

    // Clean up data before sending
    const submitData = { ...formData };
    if (submitData.userType === 'customer') {
      delete submitData.profile.academyName;
      delete submitData.profile.specializations;
    }

    try {
      console.log('🚀 Registration form submitted:', submitData);
      await register(submitData);
      console.log('✅ Registration successful, showing success message');
      showSuccess('Registration successful! Welcome to the app!');
      // Navigate to home after successful registration
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('💥 Registration form error:', {
        message: error.message,
        stack: error.stack,
        formData: formData,
        submitData: submitData
      });
      showError(error.message || 'Registration failed. Please try again.');
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
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={[styles.input, errors.dob && styles.inputError]}
                placeholder="YYYY-MM-DD"
                value={formData.profile.dob}
                onChangeText={(text) => updateFormData('profile.dob', text)}
              />
              {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
            </View>

            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={[styles.input, errors.location && styles.inputError]}
                placeholder="Enter your location"
                value={formData.profile.location}
                onChangeText={(text) => updateFormData('profile.location', text)}
                autoCapitalize="words"
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
                  />
                  {errors.academyName && <Text style={styles.errorText}>{errors.academyName}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Specializations (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., fitness, yoga, pilates"
                    value={formData.profile.specializations?.join(', ') || ''}
                    onChangeText={(text) => {
                      const specializations = text.split(',').map(s => s.trim()).filter(s => s);
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
});
