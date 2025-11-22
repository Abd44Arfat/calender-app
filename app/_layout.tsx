import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { SnackbarProvider } from '../contexts/SnackbarContext';

// 🟢 حط الـ handler هنا قبل ما ترجع الـ JSX
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // يبين Banner
    shouldPlaySound: true,   // يشغل صوت
    shouldSetBadge: true,    // يعدل Badge
    shouldShowBanner: true,  // يظهر Banner (مطلوب حسب النوع)
    shouldShowList: true,    // يظهر في قائمة الإشعارات (مطلوب حسب النوع)
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SnackbarProvider>
        <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="reset-password-new" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="help" />
          <Stack.Screen name="about" />
        </Stack>
      </SnackbarProvider>
    </AuthProvider>
  );
}
