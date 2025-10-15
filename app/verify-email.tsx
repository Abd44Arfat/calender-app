import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';

export default function VerifyEmailScreen() {
  const { verifyEmail, resendOtp } = useAuth() as any;
  const params = (router as any).query || {};
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const [email] = useState(params.email || '');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async () => {
    try {
      setIsSubmitting(true);
      const res = await verifyEmail({ email, otp });
      showSuccess('Email verified. Redirecting...');
      // navigate to home
      router.replace('/(tabs)');
    } catch (err: any) {
      showError(err?.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp({ email });
      showSuccess('Verification code resent');
    } catch (err: any) {
      showError(err?.response?.data?.message || err.message || 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
  <Text style={styles.title}>Verify your email</Text>
  <Text style={styles.subtitle}>We sent a verification code to</Text>
  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{email}</Text>
  <TextInput placeholder="OTP" value={otp} onChangeText={setOtp} style={styles.input} keyboardType="number-pad" />
        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>
  <TouchableOpacity style={styles.link} onPress={handleResend} disabled={!email}>
          <Text style={styles.linkText}>Resend code</Text>
        </TouchableOpacity>
      </View>
      <Snackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onHide={hideSnackbar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#2563EB' },
});
