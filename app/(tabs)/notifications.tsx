import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ✅ تهيئة الإشعارات + صلاحيات + channel لأندرويد
export async function initNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ Notification permission not granted!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // استماع عند استلام إشعار
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

    // عند ضغط المستخدم على الإشعار
    Notifications.addNotificationResponseReceivedListener(async () => {
      await updateBadgeCount();
      notifyChange();
    });

    console.log('✅ Notifications initialized successfully');
  } catch (err) {
    console.error('💥 Notification init error:', err);
  }
}

async function readAll(): Promise<StoredNotification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeAll(items: StoredNotification[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getNotifications(): Promise<StoredNotification[]> {
  return readAll();
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function saveNotification(n: StoredNotification) {
  const list = await readAll();
  list.unshift(n); // newest first
  await writeAll(list);
}

export async function scheduleEventNotification(params: {
  id: string;
  title: string;
  body: string;
  eventDateISO: string;
  type?: string;
}) {
  await Notifications.cancelAllScheduledNotificationsAsync(); // Cancel all previous notifications

  const eventDate = new Date(params.eventDateISO);
  const triggerDate = new Date(eventDate.getTime() - 5 * 60 * 1000); // 5 دقائق قبل الحدث
  const now = new Date();

  if (triggerDate <= now) return null; // ما تشغلش إشعار فات معاده

  const schedulingId = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: { eventId: params.id, type: params.type ?? 'event' },
    },
    trigger: {
      type: 'date',
      date: triggerDate,
    } as Notifications.DateTriggerInput,  });

  const stored = {
    id: params.id,
    title: params.title,
    body: params.body,
    date: triggerDate.toISOString(),
    read: false,
    type: params.type,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearAllNotifications}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* زرار تجربة الإشعار */}
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
