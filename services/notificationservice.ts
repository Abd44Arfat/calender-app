import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type StoredNotification = {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  type?: string;
  systemNotificationId?: string;
};

const STORAGE_KEY = 'APP_NOTIFICATIONS';
let changeListeners: (() => void)[] = [];

const notifyChange = () => changeListeners.forEach((l) => l());

// Init notifications
export async function initNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

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
  } catch (err) {
    console.error(err);
  }
}

// Storage functions
export async function getNotifications(): Promise<StoredNotification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveNotification(n: StoredNotification) {
  const list = await getNotifications();
  list.unshift(n);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function markAsRead(notificationId: string) {
  const list = await getNotifications();
  const updated = list.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  await updateBadgeCount();
  notifyChange();
}

export async function clearAllNotifications() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await updateBadgeCount();
  notifyChange();
}

export async function updateBadgeCount() {
  const list = await getNotifications();
  const unread = list.filter((n) => !n.read).length;
  try {
    await Notifications.setBadgeCountAsync(unread);
  } catch {}
}

export function addChangeListener(fn: () => void) {
  changeListeners.push(fn);
  return () => {
    changeListeners = changeListeners.filter((l) => l !== fn);
  };
}

// Schedule event notification helper
export async function scheduleEventNotification({
  id,
  title,
  body,
  eventDateISO,
  type,
}: {
  id: string;
  title: string;
  body: string;
  eventDateISO: string;
  type?: string;
}) {
  const eventDate = new Date(eventDateISO);
  const REMINDER_MINUTES = 10; // schedule 10 minutes before
  const triggerDate = new Date(eventDate.getTime() - REMINDER_MINUTES * 60 * 1000);

  // don't schedule reminders for past triggers
  if (triggerDate <= new Date()) return;

  try {
    // Check existing scheduled notifications and avoid duplicate scheduling.
    // We store the event id inside the scheduled notification's content.data.eventId
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const already = scheduled.some((s) => {
      // ScheduledNotification has a `content` field at top-level
      const data = (s as any).content?.data as any;
      return data && (data.eventId === id || data.eventId === String(id));
    });
    if (already) return; // an identical reminder already exists
  } catch (e) {
    // ignore and continue to schedule if we can't inspect
  }

  // schedule and attach the event id to the notification payload so we can inspect/cancel later
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { eventId: id, type } },
    trigger: { date: triggerDate } as any,
  });
}
