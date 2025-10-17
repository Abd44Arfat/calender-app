import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useSnackbar } from '../hooks/useSnackbar';

export default function ResetPasswordOtpScreen() {
  const params = useLocalSearchParams();
  const emailParam = (params as any)?.email || '';
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!emailParam) {
      showError('Missing email parameter');
      return;
    }
    if (!otp) {
      showError('Enter the OTP sent to your email');
      return;
    }
    setIsSubmitting(true);
    router.push({ pathname: '/reset-password-new', params: { email: emailParam, otp } } as any);
    setIsSubmitting(false);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button at top */}
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>A code was sent to {emailParam}</Text>
        <TextInput
          placeholder="OTP"
          value={otp}
          onChangeText={setOtp}
          style={styles.input}
          keyboardType="number-pad"
            placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Next...' : 'Next'}</Text>
        </TouchableOpacity>
      </View>

      <Snackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onHide={hideSnackbar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  backButton: {
    padding: 16,
    backgroundColor: 'transparent',
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
  button: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '600' },
});
