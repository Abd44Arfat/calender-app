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
const SCHEDULED_KEY = 'SCHEDULED_REMINDERS';
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
    // Deduplicate any previously scheduled reminders so we start clean
    try {
      await cleanupScheduledReminders();
    } catch (e) {
      // ignore cleanup errors
    }
  } catch (err) {
    console.error(err);
  }
}

// Cleanup scheduled reminders: group by eventId (from content.data.eventId) or by normalized title/body
async function cleanupScheduledReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (!scheduled || scheduled.length <= 1) return;

    // group by eventId if present, otherwise by title+body text
    const groups: Record<string, any[]> = {};
    for (const s of scheduled) {
      const content = (s as any).content || {};
      const data = content.data || {};
      const key = data.eventId ? String(data.eventId) : ((content.title || '') + '|' + (content.body || ''));
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }

    const registry = await getScheduledRegistry();
    for (const key of Object.keys(groups)) {
      const items = groups[key];
      if (items.length <= 1) {
        // ensure registry contains mapping if eventId present
        const data = (items[0] as any).content?.data || {};
        if (data.eventId) {
          const ident = (items[0] as any).identifier ?? (items[0] as any).id ?? null;
          if (ident) registry[String(data.eventId)] = String(ident);
        }
        continue;
      }

      // keep the first (earliest scheduled) and cancel the rest
      // attempt to pick the one with the earliest trigger date
      items.sort((a: any, b: any) => {
        const ta = a.trigger?.date ? new Date(a.trigger.date).getTime() : 0;
        const tb = b.trigger?.date ? new Date(b.trigger.date).getTime() : 0;
        return ta - tb;
      });
      const keeper = items[0];
      const keeperIdent = (keeper as any).identifier ?? (keeper as any).id ?? null;
      const keeperData = (keeper as any).content?.data || {};
      for (let i = 1; i < items.length; i++) {
        try {
          const ident = (items[i] as any).identifier ?? (items[i] as any).id ?? null;
          if (ident) await Notifications.cancelScheduledNotificationAsync(ident);
        } catch (e) {}
      }
      if (keeperData.eventId && keeperIdent) {
        registry[String(keeperData.eventId)] = String(keeperIdent);
      }
    }

    await saveScheduledRegistry(registry);
  } catch (e) {
    // ignore cleanup failures
  }
}

// Storage functions
export async function getNotifications(): Promise<StoredNotification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function getScheduledRegistry(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveScheduledRegistry(reg: Record<string, string>) {
  try {
    await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(reg));
  } catch {}
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
    // load registry + scheduled list
    const registry = await getScheduledRegistry();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    // if registry maps this event -> identifier and that identifier still exists, do nothing
    const knownIdent = registry[String(id)];
    if (knownIdent) {
      const exists = scheduled.some((s) => {
        const ident = (s as any).identifier ?? (s as any).id ?? null;
        return ident && String(ident) === String(knownIdent);
      });
      if (exists) return;
      // registry pointed to missing identifier; remove it and continue
      delete registry[String(id)];
      await saveScheduledRegistry(registry);
    }

    // If a scheduled notification already carries data.eventId matching this event, skip
    const alreadyByData = scheduled.some((s) => {
      const data = (s as any).content?.data as any;
      return data && (data.eventId === id || data.eventId === String(id));
    });
    if (alreadyByData) return;

    // Heuristic cleanup: cancel older scheduled notifications whose content mentions the same title
    for (const s of scheduled) {
      try {
        const content = (s as any).content || {};
        const text = ((content.title || '') + ' ' + (content.body || '')).toLowerCase();
        if (title && title.length > 3 && text.includes(title.toLowerCase())) {
          const ident = (s as any).identifier ?? (s as any).id ?? null;
          if (ident) {
            await Notifications.cancelScheduledNotificationAsync(ident);
          }
        }
      } catch (e) {
        // ignore single item errors
      }
    }

    // schedule and attach the event id to the notification payload so we can inspect/cancel later
    const newIdent = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', data: { eventId: id, type } },
      trigger: { date: triggerDate } as any,
    });

    // persist mapping eventId -> scheduled identifier
    const reg2 = await getScheduledRegistry();
    reg2[String(id)] = newIdent;
    await saveScheduledRegistry(reg2);
  } catch (e) {
    // ignore and continue
  }
}
