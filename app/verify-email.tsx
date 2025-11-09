// app/verify-email.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OTPTextInput from 'react-native-otp-textinput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';

export default function VerifyEmailScreen() {
  const { verifyEmail, resendOtp } = useAuth() as any;
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRef = useRef<OTPTextInput>(null);

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    const cleanEmail = email?.trim().toLowerCase() || '';

    if (!cleanEmail) return showError('Missing email — please register again.');
    if (cleanOtp.length < 4) return showError('Please enter the full OTP.');

    try {
      setIsSubmitting(true);
      console.log('📤 VERIFY PAYLOAD', { email: cleanEmail, otp: cleanOtp });

      const res = await verifyEmail({ email: cleanEmail, otp: cleanOtp });
      console.log('✅ VERIFY SUCCESS:', res);

      showSuccess('Email verified! Redirecting...');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('❌ API Error:', err?.response?.data);
      showError(err?.response?.data?.error || err?.response?.data?.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email?.trim().toLowerCase() || '';
    if (!cleanEmail) return showError('Missing email');

    try {
      await resendOtp({ email: cleanEmail });
      otpInputRef.current?.clear();
      showSuccess('Verification code resent!');
    } catch (err: any) {
      console.error('❌ Resend error:', err?.response?.data);
      showError(err?.response?.data?.message || err.message || 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Email</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>We sent a verification code to</Text>
        <Text style={styles.emailText}>{email || 'No email found'}</Text>

        <OTPTextInput
          ref={otpInputRef}
          handleTextChange={setOtp}
          inputCount={6}
          keyboardType="number-pad"
          tintColor="#ef4444"
          offTintColor="#e5e7eb"
          containerStyle={styles.otpContainer}
          textInputStyle={styles.otpBox}
          autoFocusOnLoad={false}
        />

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={handleResend}>
          <Text style={styles.linkText}>Resend code</Text>
        </TouchableOpacity>
      </View>

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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
  emailText: { fontSize: 16, fontWeight: '600', marginBottom: 20 },
  otpContainer: { marginBottom: 20 },
  otpBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '600' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#2563EB' },
});
