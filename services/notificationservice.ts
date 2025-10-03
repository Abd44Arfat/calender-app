import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const triggerDate = new Date(eventDate.getTime() - 10 * 60 * 1000); // 10 min before

  if (triggerDate <= new Date()) return; // skip past events

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: { date: triggerDate }as any,
  });
}
