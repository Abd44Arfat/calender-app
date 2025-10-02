import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, Booking } from '../../services/api';
import { useSnackbar } from '../../hooks/useSnackbar';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

interface Event {
  id: string | number;
  title: string;
  startsAt: string;
  endsAt: string;
  type: string;
}

const HomeScreen = () => {
  let user, token;
  try {
    const auth = useAuth();
    user = auth.user;
    token = auth.token;
  } catch (error) {
    console.log('Auth context not available in HomeScreen');
    user = null;
    token = null;
  }

  const { snackbar, showError, showSuccess } = useSnackbar();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('09:00');
  const [newEndTime, setNewEndTime] = useState<string>('10:00');
  const [newNotes, setNewNotes] = useState<string>('');

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

  const sameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  const toHHmm = (iso?: string) =>
    iso ? new Date(iso).toTimeString().slice(0, 5) : '--:--';

  const parseTime = (value: string): { h: number; m: number } | null => {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    let match = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) };
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

  const normalize = (res: any) => {
    if (Array.isArray(res?.events)) return res.events;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res)) return res;
    return [];
  };

  const getRandomColor = (seed: string) => {
    const colors = [
      '#EF4444',
      '#F97316',
      '#EAB308',
      '#22C55E',
      '#06B6D4',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
      '#84CC16',
      '#F59E0B',
      '#10B981',
      '#6366F1',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const startISO = new Date(selectedDate);
      startISO.setHours(0, 0, 0, 0);
      const endISO = new Date(selectedDate);
      endISO.setHours(23, 59, 59, 999);

      const publicEvents = await apiService.listEvents({
        startDate: startISO.toISOString(),
        endDate: endISO.toISOString(),
        limit: 200,
      });

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
          id: e._id || e.id || `event-${Date.now()}-${idx}`,
          title: e.title || 'Untitled',
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          type: e.type || (e.isPersonal ? 'personal' : 'event'),
        })
      );

      setEvents(combined);

      if (token) {
        const bookingsResponse = await apiService.listBookings(token, {
          status: 'confirmed',
          limit: 50,
        });
        setBookings(bookingsResponse.bookings || []);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, token]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [selectedDate, token])
  );

  const getEventsForTime = (time: string) => {
    const parsed = parseTime(time);
    if (!parsed) return [];

    const currentDayEvents = events.filter(e =>
      e.startsAt && sameDay(new Date(e.startsAt), selectedDate)
    );

    const currentDayBookings = bookings.filter(
      b => b.eventId?.startsAt && sameDay(new Date(b.eventId.startsAt), selectedDate)
    );

    const allItems = [
      ...currentDayEvents.map((e, idx) => ({
        id: `${e.id}-event-${idx}`,
        title: e.title,
        time: `${toHHmm(e.startsAt)} - ${toHHmm(e.endsAt)}`,
        color: getRandomColor(e.title + e.startsAt),
        startHour: new Date(e.startsAt).getHours(),
        type: e.type || 'event',
      })),
      ...currentDayBookings.map((b, idx) => ({
        id: `${b._id}-booking-${idx}`,
        title: `📅 ${b.eventId?.title || 'No Title'}`,
        time: `${toHHmm(b.eventId?.startsAt)} - ${toHHmm(b.eventId?.endsAt)}`,
        color: getRandomColor((b.eventId?.title || '') + (b.eventId?.startsAt || '') + 'booking'),
        startHour: b.eventId?.startsAt ? new Date(b.eventId.startsAt).getHours() : -1,
        type: 'booking',
      })),
    ];

    return allItems.filter(item => item.startHour === parsed.h);
  };

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

  const cancelBooking = async (booking: Booking) => {
    if (!token || !user?._id) {
      showError('You must be logged in to cancel bookings');
      return;
    }
    if (!booking.eventId) {
      showError('This booking has no linked event.');
      return;
    }

    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for "${booking.eventId.title || 'Untitled'}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiService.cancelBooking(token, booking._id, {
                byUserId: user._id as string,
              });
              showSuccess('Booking cancelled successfully!');
              await fetchEvents();
            } catch (err: any) {
              showError(err.message || 'Failed to cancel booking');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
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

        {/* My Bookings Section */}
        {user?.userType === 'customer' && bookings.length > 0 && (
          <View style={styles.bookingsSection}>
            <Text style={styles.sectionTitle}>My Bookings</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingsContainer}>
              {bookings.slice(0, 5).map((booking) => (
                <View key={booking._id} style={styles.bookingCard}>
                  <Text style={styles.bookingTitle} numberOfLines={1}>
                    {booking.eventId?.title || 'Untitled'}
                  </Text>
                  <Text style={styles.bookingTime}>
                    {toHHmm(booking.eventId?.startsAt)} - {toHHmm(booking.eventId?.endsAt)}
                  </Text>
                  {booking.eventId?.location && (
                    <Text style={styles.bookingLocation} numberOfLines={1}>
                      📍 {booking.eventId.location}
                    </Text>
                  )}
                  {typeof booking.eventId?.priceCents === 'number' && (
                    <Text style={styles.bookingPrice}>
                      ${(booking.eventId.priceCents / 100).toFixed(2)}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelBooking(booking)}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Schedule Timeline */}
        <View style={styles.scheduleContainer}>
          {timeSlots.map((time, index) => {
            const eventsAt = getEventsForTime(time);
            return (
              <View key={index} style={styles.timelineRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{time}</Text>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.eventColumn}>
                  {eventsAt.length
                    ? eventsAt.map(ev => <EventCard key={`${index}-${ev.id}`} event={ev} />)
                    : <View style={styles.emptySlot} />}
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
  bookingsSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111827' },
  bookingsContainer: { flexDirection: 'row' },
  bookingCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  bookingTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  bookingTime: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  bookingLocation: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  bookingPrice: { fontSize: 12, fontWeight: '600', color: '#059669' },
  scheduleContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  timelineRow: { flexDirection: 'row', marginBottom: 20 },
  timeColumn: { width: 80, alignItems: 'flex-end', paddingRight: 15 },
  timeText: { fontSize: 14, color: '#999', marginBottom: 8 },
  timelineLine: { width: 1, height: 60, backgroundColor: '#E0E0E0', alignSelf: 'center' },
  eventColumn: { flex: 1, paddingLeft: 15, gap: 8 },
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
  cancelButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomeScreen;
