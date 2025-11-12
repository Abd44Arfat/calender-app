import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthWrapper } from '../../components/AuthWrapper';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AuthWrapper>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#EF4444',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            paddingTop: 8,
            paddingBottom: 8 + insets.bottom, // 👈 SAFE AREA SPACING
            height: 80 + insets.bottom,       // 👈 TOTAL HEIGHT WITH SAFE AREA
            position: 'absolute',             // 👈 ENSURES PROPER POSITIONING
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 4,
          },
        }}
        initialRouteName="explore"
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name="home"
                size={24}
                color={focused ? '#EF4444' : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Week',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name="list"
                size={24}
                color={focused ? '#EF4444' : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notification',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name="notifications-outline"
                size={24}
                color={focused ? '#EF4444' : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name="person-outline"
                size={24}
                color={focused ? '#EF4444' : color}
              />
            ),
          }}
        />
      </Tabs>
    </AuthWrapper>
  );
}