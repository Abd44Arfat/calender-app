import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { apiService, Booking } from '../../services/api';
import { scheduleEventNotification } from '../../services/notificationservice';
import { addChangeListener, getNotifications, initNotifications } from './notifications';

// Change this value to adjust reminder offset
const REMINDER_OFFSET_MINUTES = 10;

interface Event {
  id: string | number;
  title: string;
  startsAt: string;
  endsAt: string;
  type: string;
  isPersonal?: boolean;
  [key: string]: any;
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

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { snackbar, showError, showSuccess } = useSnackbar();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('09:00');
  const [newEndTime, setNewEndTime] = useState<string>('10:00');
  const [newNotes, setNewNotes] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDetailsVisible, setIsEventDetailsVisible] = useState<boolean>(false);
  const modalOpeningRef = useRef(false);
  const [showPersonalStartTimePicker, setShowPersonalStartTimePicker] = useState(false);
  const [showPersonalEndTimePicker, setShowPersonalEndTimePicker] = useState(false);
  const [showPersonalStartDatePicker, setShowPersonalStartDatePicker] = useState(false);
  const [showPersonalEndDatePicker, setShowPersonalEndDatePicker] = useState(false);
  const [personalEventStartDate, setPersonalEventStartDate] = useState(new Date());
  const [personalEventEndDate, setPersonalEventEndDate] = useState(new Date());
  const [is24HourFormat, setIs24HourFormat] = useState(true);

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

  const isValidISO = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d instanceof Date && !isNaN(d.getTime());
  };

  const formatTimeForModal = (iso?: string) => {
    if (!isValidISO(iso)) return '--:--';
    return new Date(iso as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateForModal = (iso?: string) => {
    if (!isValidISO(iso)) return 'Unknown date';
    return new Date(iso as string).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

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
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://quackplan2.ahmed-abd-elmohsen.tech${imagePath}`;
  };
  
  const getRandomColor = (seed: string) => {
    const colors = [
      '#EF4444','#F97316','#EAB308','#22C55E','#06B6D4',
      '#3B82F6','#8B5CF6','#EC4899','#84CC16','#F59E0B',
      '#10B981','#6366F1',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const scheduleEventReminders = async (combinedEvents: Event[], bookingsList: Booking[]) => {
    const now = new Date().getTime();
    const offsetMs = REMINDER_OFFSET_MINUTES * 60 * 1000;
  
    console.log("⏰ Scheduling reminders...");
    console.log("Now:", new Date(now).toISOString());
  
    const upcomingEvents = combinedEvents.filter(
      e => (e.type === 'personal' || e.type === 'event') && new Date(e.startsAt).getTime() > now
    );
  
    const upcomingBookings = bookingsList.filter(
      b => b.eventId?.startsAt && new Date(b.eventId.startsAt).getTime() > now
    );
  
    console.log(`📌 Upcoming events: ${upcomingEvents.length}`);
    console.log(`📌 Upcoming bookings: ${upcomingBookings.length}`);
  
    console.log("📋 Upcoming events detail:", upcomingEvents.map(e => ({
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt
    })));
  
    for (const e of upcomingEvents) {
      try {
        if (e.type === 'personal') {
          console.log(`ℹ️ Skipping system reminder for personal event "${e.title}"`);
          continue;
        }
        await scheduleEventNotification({
          id: String(e.id),
          title: 'Event Reminder',
          body: `Your event "${e.title}" starts in ${REMINDER_OFFSET_MINUTES} minutes!`,
          eventDateISO: e.startsAt,
          type: e.type,
        });
        console.log(`✅ Requested scheduling for event "${e.title}"`);
      } catch (err) {
        console.warn('Failed to schedule reminder for event', e.title, err);
      }
    }

    for (const b of upcomingBookings) {
      try {
        const e = b.eventId as any;
        if (!e) continue;
        const eventId = String(e._id || e.id);
        await scheduleEventNotification({
          id: eventId,
          title: 'Booking Reminder',
          body: `Your booked event "${e.title}" starts in ${REMINDER_OFFSET_MINUTES} minutes!`,
          eventDateISO: e.startsAt,
          type: 'booking',
        });
        console.log(`✅ Requested scheduling for booking "${e.title}"`);
      } catch (err) {
        console.warn('Failed to schedule reminder for booking', err);
      }
    }
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
        (e: any, idx: number) => {
          const isPersonal = !!(e.isPersonal || e.type === 'personal');
          return ({
            id: e._id || e.id || `event-${Date.now()}-${idx}`,
            title: e.title || 'Untitled',
            startsAt: e.startsAt,
            endsAt: e.endsAt,
            type: isPersonal ? 'personal' : (e.type || 'event'),
            isPersonal,
          });
        }
      );

      setEvents(combined);

      let bookingsList: Booking[] = [];
      if (token) {
        const bookingsResponse = await apiService.listBookings(token, {
          status: 'confirmed',
          limit: 50,
        });
        const now = new Date();
        bookingsList = (bookingsResponse.bookings || []).filter(b => {
          const end = b.eventId?.endsAt ? new Date(b.eventId.endsAt) : null;
          return end && end > now;
        });
        setBookings(bookingsList);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const setup = async () => {
      await initNotifications();
      try {
        const startISO = new Date();
        const endISO = new Date();
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
          (e: any) => {
            const isPersonal = !!(e.isPersonal || e.type === 'personal');
            return ({
              id: e._id || e.id,
              title: e.title || 'Untitled',
              startsAt: e.startsAt,
              endsAt: e.endsAt,
              type: isPersonal ? 'personal' : (e.type || 'event'),
              isPersonal,
            });
          }
        );

        let bookingsList: Booking[] = [];
        if (token) {
          const bookingsResponse = await apiService.listBookings(token, {
            status: 'confirmed',
            limit: 50,
          });
          const now = new Date();
          bookingsList = (bookingsResponse.bookings || []).filter(b => {
            const end = b.eventId?.endsAt ? new Date(b.eventId.endsAt) : null;
            return end && end > now;
          });
        }

        try {
          const { resetScheduledReminders } = await import('../../services/notificationservice');
          await resetScheduledReminders();
        } catch (e) {
          console.warn('Failed to reset scheduled reminders:', e);
        }

        await scheduleEventReminders(combined, bookingsList);
      } catch (err) {
        console.warn('Failed to set up reminders:', err);
      }
    };
    setup();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, token]);

  useEffect(() => {
    if (selectedEvent) {
      console.debug('RENDER: selectedEvent changed ->', selectedEvent);
    } else {
      console.debug('RENDER: selectedEvent cleared');
    }
    console.debug('RENDER: isEventDetailsVisible ->', isEventDetailsVisible);
  }, [selectedEvent, isEventDetailsVisible]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [selectedDate, token])
  );

  useEffect(() => {
    const updateUnread = async () => {
      const notifs = await getNotifications();
      setUnreadCount(notifs.filter((n: { read: boolean }) => !n.read).length);
    };
    updateUnread();
    const unsubscribe = addChangeListener(updateUnread);
    return () => unsubscribe();
  }, []);

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
        id: String(e.id),
        originalId: String(e.id),
        fullEvent: e,
        title: e.title,
        time: `${toHHmm(e.startsAt)} - ${toHHmm(e.endsAt)}`,
        color: getRandomColor(e.title + e.startsAt),
        startHour: new Date(e.startsAt).getHours(),
        type: e.type || 'event',
      })),
      ...currentDayBookings.map((b, idx) => {
        const eventId = b.eventId?._id || b._id;
        return {
          id: `booking-${String(eventId)}`,
          originalId: String(eventId),
          title: `📅 ${b.eventId?.title || 'No Title'}`,
          time: `${toHHmm(b.eventId?.startsAt)} - ${toHHmm(b.eventId?.endsAt)}`,
          color: getRandomColor((b.eventId?.title || '') + (b.eventId?.startsAt || '') + 'booking'),
          startHour: b.eventId?.startsAt ? new Date(b.eventId.startsAt).getHours() : -1,
          type: 'booking',
          booking: b,
        };
      }),
    ];

    // Improved deduplication logic: prioritize bookings over events for the same event
    const uniqueItems = allItems.reduce((acc, item) => {
      // Use originalId as the key for deduplication since it represents the actual event ID
      const key = item.originalId;
      
      if (!acc[key]) {
        // No existing item for this event ID, add it
        acc[key] = item;
      } else if (item.type === 'booking' && acc[key].type !== 'booking') {
        // Replace event with booking if booking exists for the same event ID
        acc[key] = item;
      }
      // If both are bookings or both are events, keep the first one (shouldn't happen normally)
      
      return acc;
    }, {} as { [key: string]: any });

    return Object.values(uniqueItems).filter(item => item.startHour === parsed.h);
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
    setPersonalEventStartDate(selectedDate);
    setPersonalEventEndDate(selectedDate);
    setIsModalVisible(true);
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (is24HourFormat) {
      return timeStr;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
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
      const start = new Date(personalEventStartDate);
      start.setHours(startParsed.h, startParsed.m, 0, 0);
      const end = new Date(personalEventEndDate);
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
      setIsBookingSuccess(true); // Trigger success modal only for creation
      setBookingSuccessMsg('Your event was created successfully!');
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
              // Refresh events and bookings to ensure the canceled item is removed
              await fetchEvents();
              // Update bookings state to remove the canceled booking
              setBookings(prevBookings => prevBookings.filter(b => b._id !== booking._id));
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
    '08:00 am','09:00 am','10:00 am','11:00 am','12:00 pm',
    '01:00 pm','02:00 pm','03:00 pm','04:00 pm','05:00 pm',
    '06:00 pm','07:00 pm','08:00 pm','09:00 pm','10:00 pm',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.profilePic}>
                {getImageUrl(user?.profile?.profilePicture) ? (
                  <Image
                    source={{ uri: getImageUrl(user?.profile?.profilePicture)! }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <Ionicons name="person" size={40} color="#2196F3" />
                )}
              </View>
              <Text style={styles.greetingText}>
                Hi, {user?.profile?.fullName?.split(' ')[0] || 'User'}!
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationIcon}
              onPress={() => navigation.navigate('notifications' as never)}
            >
              <Ionicons name="notifications-outline" size={24} color="#000" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
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
                  <TouchableOpacity
                    key={booking._id}
                    style={styles.bookingCard}
                    onPress={() => {
                      setSelectedEvent({
                        id: booking.eventId?._id || booking._id,
                        title: booking.eventId?.title || 'Untitled',
                        startsAt: booking.eventId?.startsAt,
                        endsAt: booking.eventId?.endsAt,
                        type: 'booking',
                        isPersonal: false,
                        bookingData: booking,
                      });
                      modalOpeningRef.current = true;
                      setTimeout(() => {
                        setIsEventDetailsVisible(true);
                        setTimeout(() => { modalOpeningRef.current = false; }, 200);
                      }, 120);
                    }}
                  >
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
                  </TouchableOpacity>
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
                      ? eventsAt.map((ev: any) => (
                          <TouchableOpacity
                            key={`${index}-${ev.id}`}
                            onPress={() => {
                              if (ev.fullEvent) {
                                const e = ev.fullEvent;
                                const normalized = {
                                  id: e.id || e._id,
                                  title: e.title || 'Untitled',
                                  startsAt: e.startsAt,
                                  endsAt: e.endsAt,
                                  description: e.description || e.notes || '',
                                  location: e.location || '',
                                  priceCents: e.priceCents || e.costCents || null,
                                  type: e.type || 'event',
                                  isPersonal: !!e.isPersonal,
                                } as any;
                                console.debug('Opening event modal for', normalized);
                                setSelectedEvent(normalized);
                                modalOpeningRef.current = true;
                                setTimeout(() => {
                                  setIsEventDetailsVisible(true);
                                  setTimeout(() => { modalOpeningRef.current = false; }, 200);
                                }, 120);
                                return;
                              }
                              if (ev.booking) {
                                const bEvent = ev.booking.eventId as any;
                                setSelectedEvent({
                                  id: bEvent._id || ev.originalId,
                                  title: bEvent.title || 'Untitled',
                                  startsAt: bEvent.startsAt,
                                  endsAt: bEvent.endsAt,
                                  description: bEvent.description || '',
                                  location: bEvent.location || '',
                                  priceCents: bEvent.priceCents || null,
                                  type: 'booking',
                                  isPersonal: false,
                                  bookingData: ev.booking,
                                });
                                modalOpeningRef.current = true;
                                setTimeout(() => {
                                  setIsEventDetailsVisible(true);
                                  setTimeout(() => { modalOpeningRef.current = false; }, 200);
                                }, 120);
                              }
                            }}
                          >
                            <EventCard event={ev} />
                          </TouchableOpacity>
                        ))
                      : <View style={styles.emptySlot} />}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Personal Event Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', padding: 20, flexGrow: 1 }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create Personal Event</Text>
              
              {/* Time Format Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#666' }}>Time Format:</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.formatButton, is24HourFormat && styles.formatButtonActive]}
                    onPress={() => setIs24HourFormat(true)}
                  >
                    <Text style={[styles.formatButtonText, is24HourFormat && styles.formatButtonTextActive]}>24h</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formatButton, !is24HourFormat && styles.formatButtonActive]}
                    onPress={() => setIs24HourFormat(false)}
                  >
                    <Text style={[styles.formatButtonText, !is24HourFormat && styles.formatButtonTextActive]}>12h</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                placeholder="Title"
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />
              
              {/* Start Date & Time */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 4 }}>Start Date & Time</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setShowPersonalStartDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#111827' }}>
                    {personalEventStartDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setShowPersonalStartTimePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: newStartTime ? '#111827' : '#888' }}>
                    {newStartTime ? formatTimeDisplay(newStartTime) : 'Start Time'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {showPersonalStartDatePicker && (
                <DateTimePicker
                  value={personalEventStartDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPersonalStartDatePicker(false);
                    if (selectedDate) {
                      setPersonalEventStartDate(selectedDate);
                    }
                  }}
                />
              )}
              
              {showPersonalStartTimePicker && (
                <DateTimePicker
                  value={newStartTime ? new Date(`2000-01-01T${newStartTime}:00`) : new Date()}
                  mode="time"
                  is24Hour={is24HourFormat}
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPersonalStartTimePicker(false);
                    if (selectedDate) {
                      const hours = selectedDate.getHours().toString().padStart(2, '0');
                      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                      setNewStartTime(`${hours}:${minutes}`);
                    }
                  }}
                />
              )}

              {/* End Date & Time */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 4 }}>End Date & Time</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setShowPersonalEndDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#111827' }}>
                    {personalEventEndDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setShowPersonalEndTimePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: newEndTime ? '#111827' : '#888' }}>
                    {newEndTime ? formatTimeDisplay(newEndTime) : 'End Time'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {showPersonalEndDatePicker && (
                <DateTimePicker
                  value={personalEventEndDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPersonalEndDatePicker(false);
                    if (selectedDate) {
                      setPersonalEventEndDate(selectedDate);
                    }
                  }}
                />
              )}
              
              {showPersonalEndTimePicker && (
                <DateTimePicker
                  value={newEndTime ? new Date(`2000-01-01T${newEndTime}:00`) : new Date()}
                  mode="time"
                  is24Hour={is24HourFormat}
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPersonalEndTimePicker(false);
                    if (selectedDate) {
                      const hours = selectedDate.getHours().toString().padStart(2, '0');
                      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                      setNewEndTime(`${hours}:${minutes}`);
                    }
                  }}
                />
              )}

              <TextInput
                placeholder="Notes (optional)"
                value={newNotes}
                onChangeText={setNewNotes}
                style={styles.input}
                multiline
                placeholderTextColor="#9ca3af"
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
          </ScrollView>
        </View>
      </Modal>

      {/* Details Modal (centered for both events and bookings) */}
      <Modal
        visible={isEventDetailsVisible && !!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEventDetailsVisible(false)}
      >
        <TouchableOpacity
          style={styles.centeredModalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (modalOpeningRef.current) return;
            setIsEventDetailsVisible(false);
          }}
        >
          <TouchableOpacity
            style={styles.centeredModalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedEvent && (
              <>
                <Text style={styles.centeredModalTitle}>{(selectedEvent as any).title}</Text>

                <View style={styles.eventDetailItem}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.detailIcon} />
                  <Text style={styles.eventDetailText}>
                    {formatTimeForModal((selectedEvent as any).startsAt)} - {formatTimeForModal((selectedEvent as any).endsAt)}
                  </Text>
                </View>

                <View style={styles.eventDetailItem}>
                  <Ionicons name="calendar-outline" size={20} color="#666" style={styles.detailIcon} />
                  <Text style={styles.eventDetailText}>{formatDateForModal((selectedEvent as any).startsAt)}</Text>
                </View>

                {(selectedEvent as any).bookingData?.eventId?.location || (selectedEvent as any).location ? (
                  <View style={styles.eventDetailItem}>
                    <Ionicons name="location-outline" size={20} color="#666" style={styles.detailIcon} />
                    <Text style={styles.eventDetailText}>{(selectedEvent as any).bookingData?.eventId?.location || (selectedEvent as any).location}</Text>
                  </View>
                ) : null}

                {((selectedEvent as any).bookingData?.eventId?.description || (selectedEvent as any).description) ? (
                  <View style={[styles.eventDetailItem, { alignItems: 'flex-start' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#666" style={styles.detailIcon} />
                    <Text style={[styles.eventDetailText, { color: '#444' }]}>{(selectedEvent as any).bookingData?.eventId?.description || (selectedEvent as any).description}</Text>
                  </View>
                ) : null}

                {(selectedEvent as any).bookingData?.eventId?.priceCents != null || (selectedEvent as any).priceCents != null ? (
                  <View style={styles.eventDetailItem}>
                    <Text style={[styles.eventDetailText, { fontWeight: '700', color: '#10B981' }]}>${(((selectedEvent as any).bookingData?.eventId?.priceCents ?? (selectedEvent as any).priceCents) / 100).toFixed(2)}</Text>
                  </View>
                ) : null}

                <View style={[styles.eventTypePill, { alignSelf: 'center', marginTop: 8 }]}> 
                  <Text style={[styles.eventTypeText, { color: (selectedEvent as any).isPersonal ? '#60A5FA' : '#10B981' }]}>{(selectedEvent as any).isPersonal ? 'Personal Event' : ((selectedEvent as any).type === 'booking' ? 'Booking' : 'Personal')}</Text>
                </View>

                <TouchableOpacity style={[styles.closeModalButton, { marginTop: 18 }]} onPress={() => setIsEventDetailsVisible(false)}>
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Booking Success Modal (shown after creating personal event) */}
      <Modal
        visible={isBookingSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsBookingSuccess(false); // Reset state when modal is closed
          setBookingSuccessMsg('');
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, alignItems: 'center', minWidth: 250 }}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Success</Text>
            <Text style={{ fontSize: 16, color: '#333', marginBottom: 16, textAlign: 'center' }}>{bookingSuccessMsg}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsBookingSuccess(false); // Reset state on OK press
                setBookingSuccessMsg('');
              }}
              style={{ backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Event Details Modal (bottom sheet for non-booking events) */}
      <Modal
        visible={isEventDetailsVisible && !!selectedEvent && !(selectedEvent as any).bookingData}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEventDetailsVisible(false)}
      >
        <TouchableOpacity
          style={styles.eventModalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (modalOpeningRef.current) return;
            setIsEventDetailsVisible(false);
          }}
        >
          <TouchableOpacity
            style={styles.eventModalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 12 }} />
            {selectedEvent && (
              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                <View style={styles.modalIconHeader}>
                  <View style={[styles.modalIcon, {
                    backgroundColor: (selectedEvent as any).isPersonal ? '#60A5FA' : '#10B981'
                  }]}>
                    <Ionicons name={(selectedEvent as any).isPersonal ? 'calendar' : 'calendar-outline'} size={32} color="white" />
                  </View>
                </View>

                <Text style={[styles.eventModalTitle, { textAlign: 'center' }]}>{(selectedEvent as any).title}</Text>

                <View style={[styles.eventDetailItem, { marginTop: 8 }]}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.detailIcon} />
                  <Text style={styles.eventDetailText}>{formatTimeForModal((selectedEvent as any).startsAt)} - {formatTimeForModal((selectedEvent as any).endsAt)}</Text>
                </View>

                <View style={styles.eventDetailItem}>
                  <Ionicons name="calendar-outline" size={20} color="#666" style={styles.detailIcon} />
                  <Text style={styles.eventDetailText}>{formatDateForModal((selectedEvent as any).startsAt)}</Text>
                </View>

                <View style={styles.eventDetailItem}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.detailIcon} />
                  <Text style={styles.eventDetailText}>{(selectedEvent as any).location || 'No location'}</Text>
                </View>

                {(selectedEvent as any).description ? (
                  <View style={[styles.eventDetailItem, { alignItems: 'flex-start' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#666" style={styles.detailIcon} />
                    <Text style={[styles.eventDetailText, { color: '#444' }]}>{(selectedEvent as any).description}</Text>
                  </View>
                ) : null}

                {(selectedEvent as any).priceCents != null && (
                  <View style={styles.eventDetailItem}>
                    <Text style={[styles.eventDetailText, { fontWeight: '700', color: '#10B981' }]}>${(((selectedEvent as any).priceCents) / 100).toFixed(2)}</Text>
                  </View>
                )}

                <View style={[styles.eventTypePill, { alignSelf: 'center', marginTop: 12 }]}> 
                  <Text style={[styles.eventTypeText, { color: (selectedEvent as any).isPersonal ? '#60A5FA' : '#10B981' }]}>{(selectedEvent as any).isPersonal ? 'Personal Event' : 'Public Event'}</Text>
                </View>

                <TouchableOpacity style={[styles.closeModalButton, { marginTop: 18 }]} onPress={() => setIsEventDetailsVisible(false)}>
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Snackbar */}
      {snackbar.visible && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 10,
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
  centeredModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centeredModalCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalIconHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  centeredModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  detailIcon: {
    marginRight: 12,
  },
  eventDetailText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  eventTypePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
    marginBottom: 20,
  },
  eventTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  closeModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  eventModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  eventModalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  eventModalHeader: {
    marginBottom: 20,
  },
  eventModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  eventModalContent: {
    gap: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventDetailTextRow: {
    fontSize: 16,
    color: '#666',
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  eventTypeBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  bookEventButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  bookEventButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
  notificationIcon: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
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
    bottom: 120,
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
  formatButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  formatButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default HomeScreen;