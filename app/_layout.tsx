import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { SnackbarProvider } from '../contexts/SnackbarContext';

// Set up notification handler for all states (foreground, background, terminated)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Handle notification received while app is in FOREGROUND
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received (FOREGROUND):', notification);
      const data = notification.request.content.data as any;
      console.log('📦 Notification data:', data);
    });

    // Handle notification tapped (works in all states: FOREGROUND, BACKGROUND, TERMINATED)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);

      const data = response.notification.request.content.data as any;
      console.log('📦 Tapped notification data:', data);

      // Navigate based on notification type
      if (data.type === 'event_assignment') {
        // Customer tapped notification about new event assignment
        console.log('🎯 Navigating to event details:', data.eventId);
        router.push({
          pathname: '/event-details',
          params: {
            eventId: data.eventId,
            assignmentId: data.assignmentId,
          },
        });
      } else if (data.type === 'assignment_response') {
        // Vendor tapped notification about customer response
        console.log('🎯 Navigating to notifications tab');
        router.push('/(tabs)/notifications');
      }
    });

    // Check for notification that opened the app (TERMINATED state)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('🚀 App opened from notification (TERMINATED):', response);
        const data = response.notification.request.content.data as any;

        // Handle navigation after app is ready
        setTimeout(() => {
          if (data.type === 'event_assignment') {
            router.push({
              pathname: '/event-details',
              params: {
                eventId: data.eventId,
                assignmentId: data.assignmentId,
              },
            });
          } else if (data.type === 'assignment_response') {
            router.push('/(tabs)/notifications');
          }
        }, 1000);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
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
            <Stack.Screen name="event-details" />
            <Stack.Screen name="day-events" />
          </Stack>
        </SnackbarProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
