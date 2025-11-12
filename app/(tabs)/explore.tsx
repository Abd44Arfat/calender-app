import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { apiService } from '../../services/api';
import { scheduleEventNotification } from '../../services/notificationservice';

interface Event {
  id: string | number;
  title: string;
  time: string;
  color: string;
  type: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  priceCents?: number;
  capacity?: number;
  description?: string;
}

interface EventsData {
  [key: string]: Event[];
}

export default function ExploreScreen() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const token = auth?.token ?? null;
  
  const insets = useSafeAreaInsets();
  const { snackbar, showError, showSuccess } = useSnackbar();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEventsModalVisible, setIsEventsModalVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [newEventCapacity, setNewEventCapacity] = useState('');
  const [newEventPrice, setNewEventPrice] = useState('');
  const [newEventTags, setNewEventTags] = useState('');
  const [is24HourFormat, setIs24HourFormat] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [newEventStartDate, setNewEventStartDate] = useState(new Date());
  const [newEventEndDate, setNewEventEndDate] = useState(new Date());
  const [tempHideModal, setTempHideModal] = useState(false);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const eventsResponse = await apiService.listEvents({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
        limit: 100,
      });

      const normalizedEvents = Array.isArray(eventsResponse?.events) ? eventsResponse.events : 
                              Array.isArray(eventsResponse?.data) ? eventsResponse.data :
                              Array.isArray(eventsResponse) ? eventsResponse : [];

      const formattedEvents = normalizedEvents.map((event: any, index: number) => ({
        id: event._id || `event-${index}`, // Ensure unique ID using _id or fallback
        title: event.title || 'Untitled Event',
        time: `${new Date(event.startsAt).toTimeString().slice(0, 5)}-${new Date(event.endsAt).toTimeString().slice(0, 5)}`,
        color: getRandomColor(event.title + event.startsAt), // Use random color based on event title and time
        type: 'event',
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        priceCents: event.priceCents,
        capacity: event.capacity,
        description: event.description,
      }));

      setEvents(formattedEvents);

      // Filter for future events and find the closest one
      const now = new Date();
      const futureEvents = formattedEvents.filter((event: Event) => event.startsAt && new Date(event.startsAt) > now);
      futureEvents.sort((a: Event, b: Event) => {
        if (!a.startsAt || !b.startsAt) return 0;
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      });

    } catch (err: any) {
      showError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  // Helper functions
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Helper function to generate random colors for events
  const getRandomColor = (seed: string) => {
    const colors = [
      '#EF4444', // Red
      '#F97316', // Orange
      '#EAB308', // Yellow
      '#22C55E', // Green
      '#06B6D4', // Cyan
      '#3B82F6', // Blue
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#84CC16', // Lime
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#6366F1', // Indigo
    ];
    
    // Use the seed to consistently generate the same color for the same event
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Convert events to calendar format
  const calendarEvents: EventsData = useMemo(() => {
    const eventsByDate: EventsData = {};
    events.forEach(event => {
      if (event.startsAt) {
        const dateKey = formatDate(new Date(event.startsAt));
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      }
    });
    return eventsByDate;
  }, [events]);

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const selectedDateKey = formatDate(selectedDate);
  const selectedDayEvents = calendarEvents[selectedDateKey] || [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const bookEvent = async (event: Event) => {
    if (!token) {
      showError('Please login to book events');
      return;
    }
  
    // Prevent booking if event start time is not in the future
    if (event.startsAt) {
      const eventDate = new Date(event.startsAt);
      if (eventDate.getTime() <= Date.now()) {
        setConfirmationMessage('Cannot book: Event time has passed or is ongoing.');
        setIsConfirmationVisible(true);
        return;
      }
    }
  
    Alert.alert(
      'Book Event',
      `Do you want to book "${event.title}" for $${event.priceCents ? (event.priceCents / 100).toFixed(2) : '0.00'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: async () => {
            try {
              setIsLoading(true);
              const eventIdStr = event.id.toString();
              const eventId = eventIdStr;
              await apiService.createBooking(token, { eventId });
              setIsEventsModalVisible(false);
              setConfirmationMessage('Your booking is confirmed!');
              setIsConfirmationVisible(true);
              showSuccess('Event booked successfully!');
              // Refresh events to reflect the booking
              await fetchEvents();
              if (event.startsAt && event.type !== 'personal') {
                try {
                  const eventDate = new Date(event.startsAt);
                  const REMINDER_MINUTES = 10;
                  const triggerDate = new Date(eventDate.getTime() - REMINDER_MINUTES * 60 * 1000);
                  if (triggerDate.getTime() > Date.now() + 5000) {
                    await scheduleEventNotification({
                      id: eventId,
                      title: 'Booking Reminder',
                      body: `Your booked event "${event.title}" starts in ${REMINDER_MINUTES} minutes!`,
                      eventDateISO: event.startsAt,
                      type: event.type,
                    });
                  } else {
                    console.debug('Skipping immediate scheduling for event', eventId);
                  }
                } catch (sErr) {
                  console.warn('Failed to ensure booking reminder', sErr);
                }
              }
            } catch (err: any) {
              showError(err.message || 'Failed to book event');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const cancelBooking = async (bookingId: string) => {
    if (!token || !user?._id) {
      showError('Please login to cancel bookings');
      return;
    }
  
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiService.cancelBooking(token, bookingId, {
                byUserId: user._id as string,
              });
              showSuccess('Booking cancelled successfully!');
              // Refresh events to reflect the cancellation
              await fetchEvents();
            } catch (err: any) {
              showError(err.message || 'Failed to cancel booking');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const createEvent = async () => {
    if (!token || user?.userType !== 'vendor') {
      showError('Only vendors can create events');
      return;
    }

    try {
      setIsLoading(true);

      // Parse time strings
      const parseTime = (timeStr: string) => {
        const time = timeStr.trim();
        const [hours, minutes] = time.split(':').map(Number);
        return { hours, minutes };
      };

      const startTime = parseTime(newEventStartTime);
      const endTime = parseTime(newEventEndTime);

      // Create start and end dates using the date pickers
      const startDate = new Date(newEventStartDate);
      startDate.setHours(startTime.hours, startTime.minutes, 0, 0);
      
      const endDate = new Date(newEventEndDate);
      endDate.setHours(endTime.hours, endTime.minutes, 0, 0);

      const eventData = {
        title: newEventTitle.trim(),
        description: newEventDescription.trim(),
        location: newEventLocation.trim(),
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        capacity: parseInt(newEventCapacity) || 10,
        priceCents: Math.round((parseFloat(newEventPrice) || 0) * 100),
        visibility: 'public' as const,
        status: 'published' as const,
        tags: newEventTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      };

      if (isEditMode && editingEventId) {
        await apiService.updateEvent(token, editingEventId, eventData);
        showSuccess('Event updated successfully!');
      } else {
        await apiService.createEvent(token, eventData);
        showSuccess('Event created successfully!');
      }
      
      setIsCreateModalVisible(false);
      resetEventForm();
      
      // Refresh events
      await fetchEvents();
    } catch (err: any) {
      console.error('Event save error:', err);
      // Handle authorization and other errors
      const errorMessage = err?.response?.data?.error || 
                          err?.response?.data?.message || 
                          err?.message || 
                          'Failed to save event';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetEventForm = () => {
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventLocation('');
    setNewEventStartTime('');
    setNewEventEndTime('');
    setNewEventCapacity('');
    setNewEventPrice('');
    setNewEventTags('');
    setIsEditMode(false);
    setEditingEventId(null);
    setNewEventStartDate(new Date());
    setNewEventEndDate(new Date());
  };

  const openEditEventModal = (event: Event) => {
    setIsEditMode(true);
    setEditingEventId(event.id.toString());
    setNewEventTitle(event.title);
    setNewEventDescription(event.description || '');
    setNewEventLocation(event.location || '');
    
    if (event.startsAt) {
      const startDate = new Date(event.startsAt);
      setNewEventStartDate(startDate);
      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      setNewEventStartTime(`${hours}:${minutes}`);
    }
    
    if (event.endsAt) {
      const endDate = new Date(event.endsAt);
      setNewEventEndDate(endDate);
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      setNewEventEndTime(`${hours}:${minutes}`);
    }
    
    setNewEventCapacity(event.capacity?.toString() || '');
    setNewEventPrice(event.priceCents ? (event.priceCents / 100).toString() : '');
    setNewEventTags('');
    setIsCreateModalVisible(true);
  };

  const deleteEvent = async (eventId: string) => {
    if (!token || user?.userType !== 'vendor') {
      showError('Only vendors can delete events');
      return;
    }

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiService.deleteEvent(token, eventId);
              showSuccess('Event deleted successfully!');
              setIsEventsModalVisible(false);
              await fetchEvents();
            } catch (err: any) {
              console.error('Event delete error:', err);
              // Handle authorization and other errors
              const errorMessage = err?.response?.data?.error || 
                                  err?.response?.data?.message || 
                                  err?.message || 
                                  'Failed to delete event';
              showError(errorMessage);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
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

  // Use useMemo to ensure events list updates when selectedDate changes
  const allEvents = useMemo(() => {
    return selectedDayEvents.map((event, index) => ({
      ...event,
      id: `${event.id}-${index}`, // Ensure unique IDs by combining with index
      subtitle: `Event for ${selectedDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      })}`,
    }));
  }, [selectedDate, selectedDayEvents]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Month Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => navigateMonth('prev')}
          >
            <Ionicons name="chevron-back" size={20} color="#000" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{getMonthName(currentMonth)}</Text>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => navigateMonth('next')}
          >
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT', 'SUN'].map((day, index) => (
              <Text key={index} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.calendarGrid}>
            {daysInMonth.map((date, index) => {
              const dateKey = formatDate(date);
              const dayEvents = calendarEvents[dateKey] || [];
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentMonthDay = isCurrentMonth(date);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDayCell,
                    !isCurrentMonthDay && styles.otherMonthDay
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setIsEventsModalVisible(true);
                  }}
                >
                  <Text style={[
                    styles.dayNumber,
                    isSelected && styles.selectedDayNumber,
                    !isCurrentMonthDay && styles.otherMonthDayNumber
                  ]}>
                    {date.getDate()}
                  </Text>
                  {dayEvents.map((event, eventIndex) => (
                    <View 
                      key={eventIndex} 
                      style={[
                        styles.eventIndicator, 
                        { backgroundColor: event.color }
                      ]}
                    >
<Text style={styles.eventText} numberOfLines={2}>{event.title}</Text>     
               </View>
                  ))}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

       
      </ScrollView>
 {/* Floating Action Button for Vendors */}
 {user?.userType === 'vendor' && (
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      {/* Events Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEventsModalVisible}
        onRequestClose={() => setIsEventsModalVisible(false)}
      >
        <View style={styles.eventsModalOverlay}>
          <View style={styles.eventsModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.upcomingTitle}>
              Events for {selectedDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsEventsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.upcomingEventsList}>
                {isLoading ? (
                  <ActivityIndicator size="large" color="#ef4444" />
                ) : selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => {
                    const isPastEvent = event.startsAt && new Date(event.startsAt).getTime() <= Date.now();
                    return (
                      <View key={event.id} style={styles.eventCard}>
                        <View style={[styles.eventColorDot, { backgroundColor: event.color }]} />
                        <View style={styles.eventContent}>
                          <Text style={styles.eventTime}>{event.time}</Text>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          {event.location && (
                            <Text style={styles.eventLocation} numberOfLines={1}>
                              📍 {event.location}
                            </Text>
                          )}
                          {event.description && (
                            <Text style={styles.eventSubtitle} numberOfLines={2}>
                              {event.description}
                            </Text>
                          )}
                          {event.priceCents && (
                            <Text style={styles.eventPrice}>
                              ${(event.priceCents / 100).toFixed(2)}
                            </Text>
                          )}
                          {isPastEvent && (
                            <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                              Event has passed
                            </Text>
                          )}
                        </View>
                        <View style={styles.eventActions}>
                          {user?.userType === 'customer' && !isPastEvent && (
                            <TouchableOpacity
                              style={styles.bookButton}
                              onPress={() => bookEvent(event)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <ActivityIndicator size="small" color="white" />
                              ) : (
                                <Text style={styles.bookButtonText}>Book</Text>
                              )}
                            </TouchableOpacity>
                          )}
                          {user?.userType === 'vendor' && (
                            <>
                              <TouchableOpacity
                                style={[styles.bookButton, { backgroundColor: '#3B82F6' }]}
                                onPress={() => {
                                  setIsEventsModalVisible(false);
                                  setTimeout(() => openEditEventModal(event), 300);
                                }}
                                disabled={isLoading}
                              >
                                <Text style={styles.bookButtonText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.bookButton, { backgroundColor: '#EF4444' }]}
                                onPress={() => deleteEvent(event.id.toString())}
                                disabled={isLoading}
                              >
                                <Text style={styles.bookButtonText}>Delete</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.noEventsContainer}>
                    <Ionicons name="calendar-outline" size={64} color="#CCC" />
                    <Text style={styles.noEventsTitle}>No events for this day</Text>
                    <Text style={styles.noEventsMessage}>Select a different day to see events</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create/Edit Event Modal - Modern Design */}
      <Modal 
        visible={isCreateModalVisible} 
        transparent 
        animationType="slide"
        presentationStyle="overFullScreen"
      >
        <View style={styles.modernModalOverlay}>
          <View style={styles.modernModalContainer}>
            {/* Header */}
            <View style={styles.modernModalHeader}>
              <Text style={styles.modernModalTitle}>{isEditMode ? 'Edit Event' : 'Create New Event'}</Text>
              <TouchableOpacity onPress={() => { setIsCreateModalVisible(false); resetEventForm(); }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.modernModalContent} showsVerticalScrollIndicator={false}>
              {/* Time Format Toggle */}
              <View style={styles.formatToggleContainer}>
                <Text style={styles.formatLabel}>Time Format</Text>
                <View style={styles.formatButtonGroup}>
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

              {/* Event Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Title *</Text>
                <TextInput
                  placeholder="Enter event title"
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                  style={styles.modernInput}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  placeholder="Describe your event"
                  value={newEventDescription}
                  onChangeText={setNewEventDescription}
                  style={[styles.modernInput, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  placeholder="Event location"
                  value={newEventLocation}
                  onChangeText={setNewEventLocation}
                  style={styles.modernInput}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Start Date & Time */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.modernInput, styles.dateTimeInput]}
                    onPress={() => setShowStartDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text style={styles.dateTimeText}>{newEventStartDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modernInput, styles.dateTimeInput]}
                    onPress={() => setShowStartTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text style={styles.dateTimeText}>
                      {newEventStartTime ? formatTimeDisplay(newEventStartTime) : 'Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Date & Time */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.modernInput, styles.dateTimeInput]}
                    onPress={() => setShowEndDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text style={styles.dateTimeText}>{newEventEndDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modernInput, styles.dateTimeInput]}
                    onPress={() => setShowEndTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text style={styles.dateTimeText}>
                      {newEventEndTime ? formatTimeDisplay(newEventEndTime) : 'Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Capacity & Price */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Capacity</Text>
                  <TextInput
                    placeholder="Max attendees"
                    value={newEventCapacity}
                    onChangeText={setNewEventCapacity}
                    style={styles.modernInput}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Price ($)</Text>
                  <TextInput
                    placeholder="0.00"
                    value={newEventPrice}
                    onChangeText={setNewEventPrice}
                    style={styles.modernInput}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Tags */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tags</Text>
                <TextInput
                  placeholder="fitness, yoga, wellness (comma separated)"
                  value={newEventTags}
                  onChangeText={setNewEventTags}
                  style={styles.modernInput}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.modernModalFooter}>
              <TouchableOpacity
                onPress={() => { setIsCreateModalVisible(false); resetEventForm(); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createEvent}
                style={styles.saveBtn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{isEditMode ? 'Update Event' : 'Create Event'}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Date/Time Pickers - INSIDE the modal container */}
            {showStartDatePicker && (
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Start Date</Text>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={newEventStartDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setNewEventStartDate(selectedDate);
                      }
                    }}
                    textColor="#000000"
                    style={styles.picker}
                  />
                </View>
              </View>
            )}
            {showStartTimePicker && (
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Start Time</Text>
                    <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={newEventStartTime ? new Date(`2000-01-01T${newEventStartTime}:00`) : new Date()}
                    mode="time"
                    is24Hour={is24HourFormat}
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const hours = selectedDate.getHours().toString().padStart(2, '0');
                        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                        setNewEventStartTime(`${hours}:${minutes}`);
                      }
                    }}
                    textColor="#000000"
                    style={styles.picker}
                  />
                </View>
              </View>
            )}
            {showEndDatePicker && (
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select End Date</Text>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={newEventEndDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setNewEventEndDate(selectedDate);
                      }
                    }}
                    textColor="#000000"
                    style={styles.picker}
                  />
                </View>
              </View>
            )}
            {showEndTimePicker && (
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select End Time</Text>
                    <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={newEventEndTime ? new Date(`2000-01-01T${newEventEndTime}:00`) : new Date()}
                    mode="time"
                    is24Hour={is24HourFormat}
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const hours = selectedDate.getHours().toString().padStart(2, '0');
                        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                        setNewEventEndTime(`${hours}:${minutes}`);
                      }
                    }}
                    textColor="#000000"
                    style={styles.picker}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={isConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmationVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" style={{ marginBottom: 12 }} />
            <Text style={styles.confirmTitle}>
              {confirmationMessage.includes('Cannot book') ? 'Booking Error' : 'Booking Confirmed'}
            </Text>
            <Text style={styles.confirmMessage}>{confirmationMessage}</Text>
            <TouchableOpacity onPress={() => setIsConfirmationVisible(false)} style={styles.confirmButton}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Snackbar - Always on top */}
      {snackbar.visible && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 16,
            right: 16,
            backgroundColor: snackbar.type === 'error' ? '#EF4444' : '#10B981',
            padding: 16,
            borderRadius: 12,
            zIndex: 9999,
            elevation: 9999,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 15, fontWeight: '600' }}>{snackbar.message}</Text>
        </View>
      )}

      {/* Global Loading Overlay */}
      {isLoading && (
        <View style={styles.globalLoadingOverlay}>
          <ActivityIndicator size="large" color="#1E88E5" />
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
  scrollView: {
    flex: 1,
    paddingBottom: 200,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  calendarContainer: {
    paddingHorizontal: 0,
    paddingVertical: 5,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    paddingVertical: 5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,                  // 👈 PERFECT WIDTH (NO GAPS!)
    minHeight: 120,
    minWidth:80,
    marginVertical: 5,        // 👈 TINY VERTICAL SPACE
    marginHorizontal: 5,      // 👈 ZERO HORIZONTAL SPACE
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 4,               // 👈 TIGHTER PADDING
    overflow: 'hidden',
  },
  selectedDayCell: {
    backgroundColor: '#FCE7E9',
    borderColor: '#EF4444',
  },
  otherMonthDay: {
    backgroundColor: '#FDFDFD',
    opacity: 0.7,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  selectedDayNumber: {
    color: '#EF4444',
  },
  otherMonthDayNumber: {
    color: '#AAA',
  },
  eventIndicator: {
    width: '100%',
    paddingHorizontal: 6,     // 👈 FROM 4 → 6 (WIDER!)
    paddingVertical: 4,       // 👈 FROM 3 → 4 (TALLER!)
    borderRadius: 4,          // 👈 FROM 3 → 4 (ROUNDED!)
    marginBottom: 2,          // 👈 FROM 1 → 2 (SPACING!)
    alignSelf: 'flex-start',
    justifyContent: 'center', // 👈 CENTER VERTICALLY!
    alignItems: 'center',     // 👈 CENTER HORIZONTALLY!
  },
  eventText: {
   
    fontSize: 9.5,        // 👈 PERFECT SIZE
  lineHeight: 11,       // 👈 TIGHT LINES
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  eventsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  eventsModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#CCC',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 1,
  },
  upcomingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  upcomingEventsList: {
    gap: 15,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  eventColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  eventAction: {
    padding: 4,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
  },
  noEventsMessage: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
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
    maxHeight: '80%',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12, 
    color: '#111827' 
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    color: '#111827',
  },
  modalBtn: { 
    backgroundColor: '#4CAF50', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  modalBtnText: { 
    color: 'white', 
    fontWeight: '600' 
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  confirmTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 8 
  },
  confirmMessage: { 
    fontSize: 15, 
    color: '#333', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  confirmButton: { 
    backgroundColor: '#22C55E', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  globalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
  // Modern Modal Styles
  modernModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modernModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modernModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modernModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  modernModalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modernModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 15,
    color: '#111827',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  formatButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  picker: {
    width: '100%',
  },
});