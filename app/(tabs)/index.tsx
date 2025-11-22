import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { apiService } from '../../services/api';
import { scheduleEventNotification } from '../../services/notificationservice';

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
  // All hooks MUST be called at the top level - never conditionally
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const { snackbar, showError, showSuccess } = useSnackbar();
  
  // Date restrictions - current year only
  const now = new Date();
  const minimumDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
  const maximumDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // December 31st of current year

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('09:00');
  const [newEndTime, setNewEndTime] = useState<string>('10:00');
  const [newNotes, setNewNotes] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDetailsVisible, setIsEventDetailsVisible] = useState<boolean>(false);
  const modalOpeningRef = useRef(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [use24HourFormat, setUse24HourFormat] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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
    return `http://localhost:3000${imagePath}`;
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

  const scheduleEventReminders = async (combinedEvents: Event[]) => {
    const now = new Date().getTime();
    const offsetMs = REMINDER_OFFSET_MINUTES * 60 * 1000;
  
    console.log("⏰ Scheduling reminders...");
    console.log("Now:", new Date(now).toISOString());
  
    const upcomingEvents = combinedEvents.filter(
      e => (e.type === 'personal' || e.type === 'event') && new Date(e.startsAt).getTime() > now
    );
  
    console.log(`📌 Upcoming events: ${upcomingEvents.length}`);
  
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
  };
  

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const startISO = new Date(selectedDate);
      startISO.setHours(0, 0, 0, 0);
      const endISO = new Date(selectedDate);
      endISO.setHours(23, 59, 59, 999);

      let vendorEvents: any = [];
      let personalEvents: any = [];
      let acceptedEvents: any = [];

      // For customers, fetch accepted events instead of all public events
      if (user?.userType === 'customer' && token) {
        try {
          const acceptedEventsResponse = await apiService.getMyAcceptedEvents(token, {
            limit: 200,
          });
          
          // Filter accepted events for the selected date
          acceptedEvents = (acceptedEventsResponse.events || []).filter((e: any) => {
            const eventDate = new Date(e.startsAt);
            return eventDate >= startISO && eventDate <= endISO;
          });
        } catch (err: any) {
          console.warn('Failed to fetch accepted events:', err);
          // If token is invalid, continue without accepted events
          if (err.response?.status === 401) {
            console.log('Token invalid, skipping accepted events');
          }
        }

        // Also fetch personal events for customers
        try {
          personalEvents = await apiService.listPersonalEvents(token, {
            startDate: startISO.toISOString(),
            endDate: endISO.toISOString(),
            limit: 200,
          });
        } catch (err: any) {
          console.warn('Failed to fetch personal events:', err);
          // If token is invalid, continue without personal events
          if (err.response?.status === 401) {
            console.log('Token invalid, skipping personal events');
          }
        }
      } else if (user?.userType === 'vendor' && token) {
        // For vendors, show their own events
        vendorEvents = await apiService.listEvents({
          startDate: startISO.toISOString(),
          endDate: endISO.toISOString(),
          limit: 200,
        });

        // Also fetch personal events for vendors
        try {
          personalEvents = await apiService.listPersonalEvents(token, {
            startDate: startISO.toISOString(),
            endDate: endISO.toISOString(),
            limit: 200,
          });
        } catch (err: any) {
          console.warn('Failed to fetch personal events:', err);
        }
      } else {
        // For non-logged-in users, show all public events
        vendorEvents = await apiService.listEvents({
          startDate: startISO.toISOString(),
          endDate: endISO.toISOString(),
          limit: 200,
        });
      }

      // Mark personal events explicitly
      const normalizedPersonalEvents = normalize(personalEvents).map((e: any) => ({
        ...e,
        isPersonal: true,
        type: 'personal',
      }));

      // Mark vendor/accepted events as not personal
      const normalizedVendorEvents = normalize(vendorEvents).map((e: any) => ({
        ...e,
        isPersonal: false,
        type: 'event',
      }));

      const normalizedAcceptedEvents = acceptedEvents.map((e: any) => ({
        ...e,
        isPersonal: false,
        type: 'event',
      }));

      const combined = [
        ...normalizedVendorEvents,
        ...normalizedPersonalEvents,
        ...normalizedAcceptedEvents
      ].map(
        (e: any, idx: number) => {
          return ({
            ...e, // Preserve all original fields including isPersonal
            id: e._id || e.id || `event-${Date.now()}-${idx}`,
            title: e.title || 'Untitled',
            startsAt: e.startsAt,
            endsAt: e.endsAt,
            // Keep the type and isPersonal that was already set
          });
        }
      );

      console.log('📅 Combined events:', combined.map(e => ({
        id: e.id,
        title: e.title,
        isPersonal: e.isPersonal,
        type: e.type
      })));

      setEvents(combined);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      // Only show error for critical failures, not token issues
      if (err.response?.status !== 401) {
        showError(err.message || 'Failed to fetch events');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const setup = async () => {
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

        try {
          const { resetScheduledReminders } = await import('../../services/notificationservice');
          await resetScheduledReminders();
        } catch (e) {
          console.warn('Failed to reset scheduled reminders:', e);
        }

        await scheduleEventReminders(combined);
      } catch (err) {
        console.warn('Failed to set up reminders:', err);
      }
    };
    setup();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, token]);

  // Clear events when user changes or logs out
  useEffect(() => {
    if (!user || !token) {
      setEvents([]);
    }
  }, [user, token]);

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
    // Load unread notification count from API if needed
    const updateUnread = async () => {
      if (token && user?.userType === 'customer') {
        try {
          const response = await apiService.getMyAssignments(token, {
            status: 'pending',
            limit: 100,
          });
          setUnreadCount(response.assignments?.length || 0);
        } catch (err) {
          console.warn('Failed to fetch notification count:', err);
        }
      }
    };
    updateUnread();
  }, [token, user]);

  const getEventsForTime = (time: string) => {
    const parsed = parseTime(time);
    if (!parsed) return [];

    const currentDayEvents = events.filter(e =>
      e.startsAt && sameDay(new Date(e.startsAt), selectedDate)
    );

    const allItems = currentDayEvents.map((e, idx) => ({
      id: String(e.id),
      originalId: String(e.id),
      fullEvent: e,
      title: e.title,
      time: `${toHHmm(e.startsAt)} - ${toHHmm(e.endsAt)}`,
      color: getRandomColor(e.title + e.startsAt),
      startHour: new Date(e.startsAt).getHours(),
      type: e.type || 'event',
    }));

    return allItems.filter(item => item.startHour === parsed.h);
  };

  const openCreateModal = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    
    setIsEditMode(false);
    setEditingEventId(null);
    setEventDate(selectedDate);
    setStartTime(now);
    setEndTime(end);
    setNewStartTime(now.toTimeString().slice(0, 5));
    setNewEndTime(end.toTimeString().slice(0, 5));
    setNewTitle('');
    setNewNotes('');
    setIsModalVisible(true);
  };

  const openEditModal = (event: any) => {
    setIsEditMode(true);
    setEditingEventId(event.id);
    setNewTitle(event.title || '');
    setNewNotes(event.description || event.notes || '');
    
    const startDate = new Date(event.startsAt);
    const endDate = new Date(event.endsAt);
    
    setEventDate(startDate);
    setStartTime(startDate);
    setEndTime(endDate);
    setIsModalVisible(true);
  };

  const deletePersonalEvent = async (eventId: string) => {
    if (!token) {
      showError('You must be logged in');
      return;
    }

    console.log('🗑️ Attempting to delete event:', eventId);

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('🗑️ Deleting event with ID:', eventId);
              await apiService.deletePersonalEvent(token, eventId);
              showSuccess('Event deleted successfully');
              setIsEventDetailsVisible(false);
              await fetchEvents();
            } catch (err: any) {
              console.error('❌ Delete error:', err);
              showError(err.message || err.response?.data?.error || 'Failed to delete event');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTimeDisplay = (date: Date) => {
    if (use24HourFormat) {
      return date.toTimeString().slice(0, 5);
    } else {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
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
      
      // Use the date and time from pickers
      const start = new Date(eventDate);
      start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      
      const end = new Date(eventDate);
      end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

      // Validate end time is after start time
      if (end <= start) {
        showError('End time must be after start time');
        setIsLoading(false);
        return;
      }

      const payload = {
        userId: user._id as string,
        title: newTitle.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: newNotes?.trim() || undefined,
      };

      if (isEditMode && editingEventId) {
        // Update existing event
        await apiService.updatePersonalEvent(token, editingEventId, payload);
        showSuccess('Personal event updated');
      } else {
        // Create new event
        await apiService.createPersonalEvent(token, payload);
        showSuccess('Personal event created');
      }
      setIsModalVisible(false);
      await fetchEvents();
    } catch (err: any) {
      showError(err.message || 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
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
              onPress={() => router.push('/(tabs)/notifications')}
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
                                const eventId = e._id || e.id;
                                const normalized = {
                                  id: eventId,
                                  _id: e._id, // Keep _id for API calls
                                  title: e.title || 'Untitled',
                                  startsAt: e.startsAt,
                                  endsAt: e.endsAt,
                                  description: e.description || e.notes || '',
                                  notes: e.notes || e.description || '',
                                  location: e.location || '',
                                  priceCents: e.priceCents || e.costCents || null,
                                  type: e.type || 'event',
                                  isPersonal: !!e.isPersonal,
                                } as any;
                                console.log('🔍 Opening event modal:', {
                                  id: normalized.id,
                                  _id: normalized._id,
                                  isPersonal: normalized.isPersonal,
                                  type: normalized.type,
                                  title: normalized.title
                                });
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

      {/* Create/Edit Personal Event Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Edit Personal Event' : 'Create Personal Event'}
              </Text>
              
              {/* Title Input */}
              <TextInput
                placeholder="Title"
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />

              {/* Time Format Toggle */}
              <View style={styles.timeFormatContainer}>
                <Text style={styles.timeFormatLabel}>Time Format:</Text>
                <View style={styles.timeFormatToggle}>
                  <TouchableOpacity
                    style={[
                      styles.timeFormatButton,
                      use24HourFormat && styles.timeFormatButtonActive
                    ]}
                    onPress={() => setUse24HourFormat(true)}
                  >
                    <Text style={[
                      styles.timeFormatButtonText,
                      use24HourFormat && styles.timeFormatButtonTextActive
                    ]}>24h</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.timeFormatButton,
                      !use24HourFormat && styles.timeFormatButtonActive
                    ]}
                    onPress={() => setUse24HourFormat(false)}
                  >
                    <Text style={[
                      styles.timeFormatButtonText,
                      !use24HourFormat && styles.timeFormatButtonTextActive
                    ]}>12h</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Picker */}
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setShowStartTimePicker(false);
                  setShowEndTimePicker(false);
                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.pickerButtonText}>
                  {eventDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  textColor="#2196F3"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setEventDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Time Pickers */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.pickerButton, { flex: 1 }]}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowEndTimePicker(false);
                    setShowStartTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.pickerButtonText}>
                    {formatTimeDisplay(startTime)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerButton, { flex: 1 }]}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.pickerButtonText}>
                    {formatTimeDisplay(endTime)}
                  </Text>
                </TouchableOpacity>
              </View>

              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={use24HourFormat}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  textColor="#2196F3"
                  onChange={(event, selectedTime) => {
                    setShowStartTimePicker(false);
                    if (selectedTime) {
                      setStartTime(selectedTime);
                    }
                  }}
                />
              )}

              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={use24HourFormat}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  textColor="#2196F3"
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(false);
                    if (selectedTime) {
                      setEndTime(selectedTime);
                    }
                  }}
                />
              )}

              {/* Notes Input */}
              <TextInput
                placeholder="Notes (optional)"
                value={newNotes}
                onChangeText={setNewNotes}
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                placeholderTextColor="#9ca3af"
              />

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <TouchableOpacity 
                  onPress={() => setIsModalVisible(false)} 
                  style={[styles.modalBtn, { backgroundColor: '#9ca3af' }]}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={submitPersonalEvent} 
                  style={styles.modalBtn} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnText}>{isEditMode ? 'Update' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Details Modal (centered for both events and bookings) */}
      <Modal
        visible={isEventDetailsVisible && !!selectedEvent && !!(selectedEvent as any).bookingData}
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
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
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
                  <Text style={[styles.eventTypeText, { color: (selectedEvent as any).isPersonal || (selectedEvent as any).type === 'personal' ? '#60A5FA' : '#10B981' }]}>
                    {(selectedEvent as any).isPersonal || (selectedEvent as any).type === 'personal' ? 'Personal Event' : ((selectedEvent as any).type === 'booking' ? 'Booking' : 'Personal Event')}
                  </Text>
                </View>

                {/* ALWAYS SHOW BUTTONS FOR TESTING */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
                  <TouchableOpacity 
                    style={[styles.closeModalButton, { flex: 1, backgroundColor: '#3B82F6', borderWidth: 0 }]} 
                    onPress={() => {
                      console.log('EDIT BUTTON CLICKED');
                      setIsEventDetailsVisible(false);
                      openEditModal(selectedEvent);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text style={[styles.closeModalButtonText, { color: 'white' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.closeModalButton, { flex: 1, backgroundColor: '#EF4444', borderWidth: 0 }]} 
                    onPress={() => {
                      console.log('DELETE BUTTON CLICKED');
                      deletePersonalEvent((selectedEvent as any).id);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 6 }} />
                        <Text style={[styles.closeModalButtonText, { color: 'white' }]}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.closeModalButton, { marginTop: 12 }]} onPress={() => setIsEventDetailsVisible(false)}>
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
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

                {/* Event Type Badge */}
                <View style={[styles.eventTypePill, { alignSelf: 'center', marginTop: 12 }]}> 
                  <Text style={[styles.eventTypeText, { color: (selectedEvent as any).isPersonal || (selectedEvent as any).type === 'personal' ? '#60A5FA' : '#10B981' }]}>
                    {(selectedEvent as any).isPersonal || (selectedEvent as any).type === 'personal' ? 'Personal Event' : 'Public Event'}
                  </Text>
                </View>

                {/* Show Edit/Delete buttons ONLY for personal events */}
                {((selectedEvent as any).isPersonal || (selectedEvent as any).type === 'personal') && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
                    <TouchableOpacity 
                      style={[styles.closeModalButton, { flex: 1, backgroundColor: '#3B82F6', borderWidth: 0 }]} 
                      onPress={() => {
                        setIsEventDetailsVisible(false);
                        openEditModal(selectedEvent);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="white" style={{ marginRight: 6 }} />
                      <Text style={[styles.closeModalButtonText, { color: 'white' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.closeModalButton, { flex: 1, backgroundColor: '#EF4444', borderWidth: 0 }]} 
                      onPress={() => {
                        const eventId = (selectedEvent as any)._id || (selectedEvent as any).id;
                        console.log('🗑️ Delete button pressed, eventId:', eventId);
                        deletePersonalEvent(eventId);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 6 }} />
                          <Text style={[styles.closeModalButtonText, { color: 'white' }]}>Delete</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={[styles.closeModalButton, { marginTop: 12 }]} onPress={() => setIsEventDetailsVisible(false)}>
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
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  dayNumber: { fontSize: 16, fontWeight: '700', color: '#000000' },
  dayLabel: { fontSize: 12, color: '#000000', marginTop: 2, fontWeight: '500' },
  selectedDayText: { color: '#FFFFFF', fontWeight: '700' },
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
  modalCard: { 
    width: '100%', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    color: '#111827',
  },
  timeFormatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  timeFormatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timeFormatToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  timeFormatButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeFormatButtonActive: {
    backgroundColor: '#EF4444',
  },
  timeFormatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeFormatButtonTextActive: {
    color: 'white',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: 'white',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
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