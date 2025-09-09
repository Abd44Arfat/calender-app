import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { useSnackbar } from '../../hooks/useSnackbar';

interface Event {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  type: string;
}

const HomeScreen = () => {
  const { user, token } = useAuth();
  const { snackbar, showError, showSuccess } = useSnackbar();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('09:00');
  const [newEndTime, setNewEndTime] = useState<string>('10:00');
  const [newNotes, setNewNotes] = useState<string>('');

  // Build the next 7 days list starting from today
  const days = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en', { weekday: 'short' });
    const list: { date: Date; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({ date: d, label: formatter.format(d) });
    }
    return list;
  }, []);

  // Safer same-day check (UTC aligned)
  const sameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  const toHHmm = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

  // Parse time strings into hours/minutes
  const parseTime = (value: string): { h: number; m: number } | null => {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    let match = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) {
      return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) };
    }
    match = v.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const mer = match[3];
      if (mer === 'pm' && h !== 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      return { h, m };
    }
    return null;
  };

  // Normalize API responses
  const normalize = (res: any) => {
    if (Array.isArray(res?.events)) return res.events;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res)) return res;
    return [];
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const startISO = new Date(selectedDate);
      startISO.setHours(0, 0, 0, 0);
      const endISO = new Date(selectedDate);
      endISO.setHours(23, 59, 59, 999);

      // Public events
      const publicEvents = await apiService.listEvents({
        startDate: startISO.toISOString(),
        endDate: endISO.toISOString(),
        limit: 200,
      });

      // Personal events
      let personalEvents: any = [];
      if (token) {
        personalEvents = await apiService.listPersonalEvents(token, {
          startDate: startISO.toISOString(),
          endDate: endISO.toISOString(),
          limit: 200,
        });
      }

      const combined = [...normalize(publicEvents), ...normalize(personalEvents)].map(
        (e: any, idx: number) => ({
          id: typeof e.id === 'number' ? e.id : idx,
          title: e.title || 'Untitled',
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          type: e.type || (e.isPersonal ? 'personal' : 'event'),
        })
      );

      setEvents(combined);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, token]);

  // Match event to a timeline slot
  const getEventForTime = (time: string) => {
    const parsed = parseTime(time);
    if (!parsed) return null;
    const currentDayEvents = events.filter(e =>
      sameDay(new Date(e.startsAt), selectedDate)
    );
    return currentDayEvents
      .map(e => ({
        id: typeof e.id === 'number' ? e.id : 0,
        title: e.title,
        time: `${toHHmm(e.startsAt)} - ${toHHmm(e.endsAt)}`,
        color: '#2196F3',
        startTime: new Date(e.startsAt).getHours(),
        type: e.type || 'event',
      }))
      .find(ev => ev.startTime === parsed.h);
  };

  // Default modal times
  const openCreateModal = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    setNewStartTime(now.toTimeString().slice(0, 5));
    setNewEndTime(end.toTimeString().slice(0, 5));
    setNewTitle('');
    setIsModalVisible(true);
  };

  const submitPersonalEvent = async () => {
    if (!token || !user?._id) {
      showError('You must be logged in to create personal events');
      return;
    }
    if (!newTitle.trim()) {
      showError('Title is required');
      return;
    }
    try {
      setIsLoading(true);
      const startParsed = parseTime(newStartTime);
      const endParsed = parseTime(newEndTime);
      if (!startParsed || !endParsed) {
        showError('Time must be in HH:mm or h:mm am/pm');
        setIsLoading(false);
        return;
      }
      const start = new Date(selectedDate);
      start.setHours(startParsed.h, startParsed.m, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(endParsed.h, endParsed.m, 0, 0);

      const payload = {
        userId: user._id as string,
        title: newTitle.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: newNotes?.trim() || undefined,
      };

      console.log('📝 Creating personal event with payload:', payload);
      await apiService.createPersonalEvent(token, payload);
      showSuccess('Personal event created');
      setIsModalVisible(false);
      await fetchEvents();
    } catch (err: any) {
      showError(err.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const timeSlots = [
    '08:00 am', '09:00 am', '10:00 am', '11:00 am', '12:00 pm',
    '01:00 pm', '02:00 pm', '03:00 pm', '04:00 pm', '05:00 pm',
    '06:00 pm', '07:00 pm', '08:00 pm', '09:00 pm', '10:00 pm',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.profilePic}>
              <Ionicons name="person" size={24} color="#2196F3" />
            </View>
            <Text style={styles.greetingText}>
              Hi, {user?.profile?.fullName?.split(' ')[0] || 'User'}!
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
            {days.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  sameDay(item.date, selectedDate) && styles.selectedDay,
                ]}
                onPress={() => setSelectedDate(item.date)}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    sameDay(item.date, selectedDate) && styles.selectedDayText,
                  ]}
                >
                  {item.date.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dayLabel,
                    sameDay(item.date, selectedDate) && styles.selectedDayText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Schedule Timeline */}
        <View style={styles.scheduleContainer}>
          {timeSlots.map((time, index) => {
            const event = getEventForTime(time);
            return (
              <View key={index} style={styles.timelineRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{time}</Text>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.eventColumn}>
                  {event ? <EventCard event={event} /> : <View style={styles.emptySlot} />}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Personal Event Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Personal Event</Text>
            <TextInput
              placeholder="Title"
              value={newTitle}
              onChangeText={setNewTitle}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Start (HH:mm)"
                value={newStartTime}
                onChangeText={setNewStartTime}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                placeholder="End (HH:mm)"
                value={newEndTime}
                onChangeText={setNewEndTime}
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            <TextInput
              placeholder="Notes (optional)"
              value={newNotes}
              onChangeText={setNewNotes}
              style={styles.input}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.modalBtn, { backgroundColor: '#9ca3af' }]}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitPersonalEvent} style={styles.modalBtn} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Snackbar */}
      {snackbar.visible && (
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 16,
            right: 16,
            backgroundColor: snackbar.type === 'error' ? '#EF4444' : '#10B981',
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>{snackbar.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  notificationIcon: { padding: 8 },
  dateSection: { paddingHorizontal: 20, paddingBottom: 20 },
  daysContainer: { flexDirection: 'row' },
  dayItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDay: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  dayNumber: { fontSize: 16, fontWeight: '600', color: '#000' },
  dayLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  selectedDayText: { color: 'white' },
  scheduleContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  timelineRow: { flexDirection: 'row', marginBottom: 20 },
  timeColumn: { width: 80, alignItems: 'flex-end', paddingRight: 15 },
  timeText: { fontSize: 14, color: '#999', marginBottom: 8 },
  timelineLine: { width: 1, height: 60, backgroundColor: '#E0E0E0', alignSelf: 'center' },
  eventColumn: { flex: 1, paddingLeft: 15 },
  emptySlot: { height: 60 },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    color: '#111827',
  },
  modalBtn: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  modalBtnText: { color: 'white', fontWeight: '600' },
});

export default HomeScreen;
