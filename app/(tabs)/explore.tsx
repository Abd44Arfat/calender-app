import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [eventCreationDate, setEventCreationDate] = useState(new Date());
  const [startTimeDate, setStartTimeDate] = useState(new Date());
  const [endTimeDate, setEndTimeDate] = useState(new Date());
  const [use24HourFormatVendor, setUse24HourFormatVendor] = useState(true);
  const [newEventCapacity, setNewEventCapacity] = useState('');
  const [newEventPrice, setNewEventPrice] = useState('');
  const [newEventTags, setNewEventTags] = useState('');
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingVendorEventId, setEditingVendorEventId] = useState<string | null>(null);

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

  const formatVendorTimeDisplay = (date: Date) => {
    if (use24HourFormatVendor) {
      return date.toTimeString().slice(0, 5);
    } else {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    }
  };

  const openEditEventModal = (event: Event) => {
    setIsEditingEvent(true);
    setEditingVendorEventId(String(event.id));
    setNewEventTitle(event.title || '');
    setNewEventDescription(event.description || '');
    setNewEventLocation(event.location || '');
    setNewEventCapacity(event.capacity?.toString() || '');
    setNewEventPrice(event.priceCents ? (event.priceCents / 100).toString() : '');
    
    const startDate = new Date(event.startsAt!);
    const endDate = new Date(event.endsAt!);
    
    setEventCreationDate(startDate);
    setStartTimeDate(startDate);
    setEndTimeDate(endDate);
    setIsEventsModalVisible(false);
    setIsCreateModalVisible(true);
  };

  const deleteVendorEvent = async (eventId: string) => {
    if (!token || user?.userType !== 'vendor') {
      showError('Only vendors can delete events');
      return;
    }

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? All bookings will be cancelled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiService.deleteEvent(token, eventId);
              showSuccess('Event deleted successfully');
              setIsEventsModalVisible(false);
              await fetchEvents();
            } catch (err: any) {
              showError(err.message || 'Failed to delete event');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const createEvent = async () => {
    if (!token || user?.userType !== 'vendor') {
      showError('Only vendors can create events');
      return;
    }

    if (!newEventTitle.trim()) {
      showError('Event title is required');
      return;
    }

    try {
      setIsLoading(true);

      // Use the date and time from pickers
      const startDate = new Date(eventCreationDate);
      startDate.setHours(startTimeDate.getHours(), startTimeDate.getMinutes(), 0, 0);
      
      const endDate = new Date(eventCreationDate);
      endDate.setHours(endTimeDate.getHours(), endTimeDate.getMinutes(), 0, 0);

      // Validate end time is after start time
      if (endDate <= startDate) {
        showError('End time must be after start time');
        setIsLoading(false);
        return;
      }

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

      if (isEditingEvent && editingVendorEventId) {
        // Update existing event
        await apiService.updateEvent(token, editingVendorEventId, eventData);
        showSuccess('Event updated successfully!');
      } else {
        // Create new event
        await apiService.createEvent(token, eventData);
        showSuccess('Event created successfully!');
      }
      
      setIsCreateModalVisible(false);
      setIsEditingEvent(false);
      setEditingVendorEventId(null);
      
      // Reset form
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventLocation('');
      setNewEventStartTime('');
      setNewEventEndTime('');
      setNewEventCapacity('');
      setNewEventPrice('');
      setNewEventTags('');
      
      // Refresh events
      await fetchEvents();
    } catch (err: any) {
      showError(err.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
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
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.profileSection}>
            <View style={styles.profilePic}>
              {user?.profile?.profilePicture ? (
                <Image
                  source={{ uri: `https://quackplan2.ahmed-abd-elmohsen.tech${user.profile.profilePicture}` }}
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
        </View>

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
            onPress={() => {
              setIsEditingEvent(false);
              setEditingVendorEventId(null);
              setNewEventTitle('');
              setNewEventDescription('');
              setNewEventLocation('');
              setNewEventCapacity('');
              setNewEventPrice('');
              setNewEventTags('');
              const now = new Date();
              setEventCreationDate(selectedDate);
              setStartTimeDate(now);
              const end = new Date(now);
              end.setHours(end.getHours() + 1);
              setEndTimeDate(end);
              setIsCreateModalVisible(true);
            }}
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
                                style={[styles.bookButton, { backgroundColor: '#3B82F6', marginRight: 4 }]}
                                onPress={() => openEditEventModal(event)}
                              >
                                <Ionicons name="create-outline" size={16} color="white" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.bookButton, { backgroundColor: '#EF4444' }]}
                                onPress={() => deleteVendorEvent(String(event.id))}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <Ionicons name="trash-outline" size={16} color="white" />
                                )}
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

      {/* Create Event Modal */}
      <Modal visible={isCreateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {isEditingEvent ? 'Edit Event' : 'Create Event'}
              </Text>
              
              {/* Title Input */}
              <TextInput
                placeholder="Event Title"
                value={newEventTitle}
                onChangeText={setNewEventTitle}
                style={styles.input}
              />

              {/* Description Input */}
              <TextInput
                placeholder="Description"
                value={newEventDescription}
                onChangeText={setNewEventDescription}
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
              />

              {/* Location Input */}
              <TextInput
                placeholder="Location"
                value={newEventLocation}
                onChangeText={setNewEventLocation}
                style={styles.input}
              />

              {/* Time Format Toggle */}
              <View style={styles.timeFormatContainer}>
                <Text style={styles.timeFormatLabel}>Time Format:</Text>
                <View style={styles.timeFormatToggle}>
                  <TouchableOpacity
                    style={[
                      styles.timeFormatButton,
                      use24HourFormatVendor && styles.timeFormatButtonActive
                    ]}
                    onPress={() => setUse24HourFormatVendor(true)}
                  >
                    <Text style={[
                      styles.timeFormatButtonText,
                      use24HourFormatVendor && styles.timeFormatButtonTextActive
                    ]}>24h</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.timeFormatButton,
                      !use24HourFormatVendor && styles.timeFormatButtonActive
                    ]}
                    onPress={() => setUse24HourFormatVendor(false)}
                  >
                    <Text style={[
                      styles.timeFormatButtonText,
                      !use24HourFormatVendor && styles.timeFormatButtonTextActive
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
                  setShowEventDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.pickerButtonText}>
                  {eventCreationDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>

              {showEventDatePicker && (
                <DateTimePicker
                  value={eventCreationDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEventDatePicker(false);
                    if (selectedDate) {
                      setEventCreationDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Time Pickers */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.pickerButton, { flex: 1 }]}
                  onPress={() => {
                    setShowEventDatePicker(false);
                    setShowEndTimePicker(false);
                    setShowStartTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.pickerButtonText}>
                    {formatVendorTimeDisplay(startTimeDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerButton, { flex: 1 }]}
                  onPress={() => {
                    setShowEventDatePicker(false);
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.pickerButtonText}>
                    {formatVendorTimeDisplay(endTimeDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              {showStartTimePicker && (
                <DateTimePicker
                  value={startTimeDate}
                  mode="time"
                  is24Hour={use24HourFormatVendor}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowStartTimePicker(false);
                    if (selectedTime) {
                      setStartTimeDate(selectedTime);
                    }
                  }}
                />
              )}

              {showEndTimePicker && (
                <DateTimePicker
                  value={endTimeDate}
                  mode="time"
                  is24Hour={use24HourFormatVendor}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(false);
                    if (selectedTime) {
                      setEndTimeDate(selectedTime);
                    }
                  }}
                />
              )}

              {/* Capacity and Price */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="Capacity"
                  value={newEventCapacity}
                  onChangeText={setNewEventCapacity}
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Price ($)"
                  value={newEventPrice}
                  onChangeText={setNewEventPrice}
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="numeric"
                />
              </View>

              {/* Tags Input */}
              <TextInput
                placeholder="Tags (comma separated)"
                value={newEventTags}
                onChangeText={setNewEventTags}
                style={styles.input}
              />

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <TouchableOpacity 
                  onPress={() => setIsCreateModalVisible(false)} 
                  style={[styles.modalBtn, { backgroundColor: '#9ca3af' }]}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={createEvent} 
                  style={styles.modalBtn} 
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>{isEditingEvent ? 'Update' : 'Create'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  userHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#000' 
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
    maxHeight: '85%',
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
    backgroundColor: '#4CAF50',
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
});