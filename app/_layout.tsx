import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

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
      <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
