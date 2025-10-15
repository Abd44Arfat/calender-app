import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';

export default function ResetPasswordNewScreen() {
  const params = useLocalSearchParams();
  const email = (params as any)?.email || '';
  const otp = (params as any)?.otp || '';
  const { resetPassword } = useAuth() as any;
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !otp) {
      showError('Missing email or code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword({ email, otp, newPassword });
      showSuccess('Password reset successful. Please login.');
      router.replace('/login');
    } catch (err: any) {
      showError(err?.response?.data?.message || err.message || 'Reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>New Password</Text>
        <Text style={styles.subtitle}>Set a new password for {email}</Text>
        <TextInput placeholder="New password" value={newPassword} onChangeText={setNewPassword} style={styles.input} secureTextEntry />
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
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});
