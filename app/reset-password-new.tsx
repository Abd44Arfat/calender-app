import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function ResetPasswordNewScreen() {
  const params = useLocalSearchParams();
  const email = (params as any)?.email || '';
  const otp = (params as any)?.otp || '';
  const auth = useAuth();
  const resetPassword = auth?.resetPassword;
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation rules
  const passwordRules = [
    { label: 'At least 6 characters', valid: newPassword.length >= 6 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'Contains number', valid: /[0-9]/.test(newPassword) },
    { label: 'Contains special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const handleSubmit = async () => {
    const allValid = passwordRules.every(rule => rule.valid);
    if (!email || !otp) {
      showError('Missing email or code');
      return;
    }
    if (!allValid) {
      showError('Password does not meet all requirements');
      return;
    }

    try {
      setIsSubmitting(true);
      if (resetPassword) {
        await resetPassword({ email, otp, newPassword });
        showSuccess('Password reset successful. Please login.');
        router.replace('/login');
      } else {
        showError('Reset password function not available');
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || err.message || 'Reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button at top */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>New Password</Text>
        <Text style={styles.subtitle}>Set a new password for {email}</Text>
        <TextInput
          placeholder="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          style={styles.input}
          secureTextEntry
            placeholderTextColor="#9ca3af"
        />

        {/* Password Strength Rules */}
        <View style={styles.rulesContainer}>
          {passwordRules.map((rule, index) => (
            <Text
              key={index}
              style={[styles.ruleText, { color: rule.valid ? 'green' : 'red' }]}
            >
              {rule.valid ? '✔' : '✖'} {rule.label}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save New Password'}</Text>
        </TouchableOpacity>
      </View>

      <Snackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onHide={hideSnackbar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },

  content: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rulesContainer: { marginBottom: 12 },
  ruleText: { fontSize: 12, marginVertical: 2 },
  button: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});
