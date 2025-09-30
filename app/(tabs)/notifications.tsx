import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Event {
  id: string | number;
  title: string;
  time?: string;
  color?: string;
  type: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  priceCents?: number;
  capacity?: number;
  description?: string;
}

type StoredNotification = {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
  read: boolean;
  type?: string;
  systemNotificationId?: string; // id returned by scheduleNotificationAsync or delivered notification
};

const STORAGE_KEY = 'APP_NOTIFICATIONS';
let changeListeners: (() => void)[] = [];

const notifyChange = () => {
  changeListeners.forEach((l) => l());
};

export async function initNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  // You can check `status` and inform user if denied
  // Save delivered notifications when received
  Notifications.addNotificationReceivedListener(async (notif) => {
    const content = notif.request.content;
    const stored: StoredNotification = {
      id: String(Date.now()),
      title: content.title ?? 'Notification',
      body: content.body ?? '',
      date: new Date().toISOString(),
      read: false,
      systemNotificationId: notif.request.identifier,
    };
    await saveNotification(stored);
    await updateBadgeCount();
    notifyChange();
  });

  // When user taps notification (optional)
  Notifications.addNotificationResponseReceivedListener(async () => {
    // update badge / state if needed
    await updateBadgeCount();
    notifyChange();
  });
}

async function readAll(): Promise<StoredNotification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeAll(items: StoredNotification[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getNotifications(): Promise<StoredNotification[]> {
  return readAll();
}

export async function saveNotification(n: StoredNotification) {
  const list = await readAll();
  list.unshift(n); // newest first
  await writeAll(list);
}

export async function scheduleEventNotification(events: Event[]) {
  await cancelAllScheduledNotifications(); // Cancel all previous notifications

  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.startsAt!) > now);

  if (upcomingEvents.length === 0) {
    return null; // No upcoming events to schedule
  }

  // Sort events to find the closest one
  upcomingEvents.sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
  const closestEvent = upcomingEvents[0];

  const eventDate = new Date(closestEvent.startsAt!);
  const triggerDate = new Date(eventDate.getTime() - 5 * 60 * 1000); // 5 minutes before the event

  if (triggerDate <= now) return null; // Don't schedule if trigger date is in the past

  const schedulingId = await Notifications.scheduleNotificationAsync({
    content: {
      title: closestEvent.title,
      body: closestEvent.description || `Event starts at ${new Date(closestEvent.startsAt!).toLocaleTimeString()}`,
      data: { eventId: closestEvent.id, type: closestEvent.type ?? 'event' },
    },
    trigger: {
      type: 'date',
      date: triggerDate,
    } as any,
  });

  const stored = {
    id: closestEvent.id as string,
    title: closestEvent.title,
    body: closestEvent.description || `Event starts at ${new Date(closestEvent.startsAt!).toLocaleTimeString()}`,
    date: triggerDate.toISOString(),
    read: false,
    type: closestEvent.type,
    systemNotificationId: schedulingId,
  };
  await saveNotification(stored);
  await updateBadgeCount();
  notifyChange();
  return schedulingId;
}

export async function markAsRead(notificationId: string) {
  const list = await readAll();
  const updated = list.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  await writeAll(updated);
  await updateBadgeCount();
  notifyChange();
}

export async function clearAllNotifications() {
  await writeAll([]);
  await updateBadgeCount();
  notifyChange();
}

export async function updateBadgeCount() {
  const list = await readAll();
  const unread = list.filter((n) => !n.read).length;
  try {
    await Notifications.setBadgeCountAsync(unread);
  } catch {
    // setBadge may be platform limited
  }
}

export function addChangeListener(fn: () => void) {
  changeListeners.push(fn);
  return () => {
    changeListeners = changeListeners.filter((l) => l !== fn);
  };
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const storedNotifications = await getNotifications();
      setNotifications(storedNotifications);
    };

    fetchNotifications();
    const unsubscribe = addChangeListener(() => {
      fetchNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Ionicons name="time" size={20} color="#EF4444" />;
      case 'event':
        return <Ionicons name="calendar" size={20} color="#2196F3" />;
      case 'update':
        return <Ionicons name="refresh" size={20} color="#FF9800" />;
      default:
        return <Ionicons name="notifications" size={20} color="#666" />;
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearAllNotifications}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>


<TouchableOpacity
  style={{
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  }}
  onPress={async () => {
    const schedulingId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification 🎉',
        body: 'This is a test notification fired immediately.',
        data: { test: true },
      },
      trigger: null, // 👈 null = show immediately
    });

    // خزّنه لو حابب يظهر في لستتك
    const stored = {
      id: String(Date.now()),
      title: 'Test Notification 🎉',
      body: 'This is a test notification fired immediately.',
      date: new Date().toISOString(),
      read: false,
      type: 'test',
      systemNotificationId: schedulingId,
    };
    await saveNotification(stored);
    await updateBadgeCount();
    notifyChange();
  }}
>
  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
    Test Notification
  </Text>
</TouchableOpacity>

      {/* Notifications List */}
      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationItem,
              !notification.read && styles.unreadNotification
            ]}
            onPress={() => markAsRead(notification.id)}
          >
            <View style={styles.notificationIcon}>
              {getNotificationIcon(notification.type ?? '')}
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.body}</Text>
              <Text style={styles.notificationTime}>{new Date(notification.date).toLocaleString()}</Text>
            </View>
            {!notification.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Empty State */}
      {notifications.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyMessage}>You're all caught up!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});