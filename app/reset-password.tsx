import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OTPTextInput from 'react-native-otp-textinput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useSnackbar } from '../hooks/useSnackbar';

export default function ResetPasswordOtpScreen() {
  const params = useLocalSearchParams();
  const emailParam = (params as any)?.email || '';
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRef = useRef<OTPTextInput>(null);

  const handleSubmit = async () => {
    if (!emailParam) {
      showError('Missing email parameter');
      return;
    }
    if (!otp || otp.length < 4) {
      showError('Enter the full code sent to your email');
      return;
    }

    setIsSubmitting(true);
    try {
      router.push({
        pathname: '/reset-password-new',
        params: { email: emailParam, otp },
      } as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔙 Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Code</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>A code was sent to</Text>
        <Text style={styles.emailText}>{emailParam}</Text>

        {/* 🔢 OTP Boxes */}
        <OTPTextInput
          ref={otpInputRef}
          handleTextChange={setOtp}
          inputCount={6}
          keyboardType="number-pad"
          tintColor="#ef4444"
          offTintColor="#e5e7eb"
          containerStyle={styles.otpContainer}
          textInputStyle={styles.otpBox}
        />

        <TouchableOpacity
          style={[styles.button, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Next...' : 'Next'}</Text>
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
});
