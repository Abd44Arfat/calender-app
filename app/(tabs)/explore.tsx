import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { useSnackbar } from '../../hooks/useSnackbar';
import { scheduleEventNotification } from '../../app/(tabs)/notifications';

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
  let user, token;
  try {
    const auth = useAuth();
    user = auth.user;
    token = auth.token;
  } catch (error) {
    console.log('Auth context not available in ExploreScreen');
    user = null;
    token = null;
  }
  
  const { snackbar, showError, showSuccess } = useSnackbar();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEventsModalVisible, setIsEventsModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventCapacity, setNewEventCapacity] = useState('');
  const [newEventPrice, setNewEventPrice] = useState('');
  const [newEventTags, setNewEventTags] = useState('');

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
        id: event._id || `event-${index}`, // Use actual _id or fallback to unique string
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
      await scheduleEventNotification(formattedEvents);
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
              // Extract the original event ID (remove the index suffix if present)
              const eventIdStr = event.id.toString();
              const eventId = eventIdStr.includes('-') ? eventIdStr.split('-')[0] : eventIdStr;
              await apiService.createBooking(token, { eventId });
              showSuccess('Event booked successfully!');
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
              await fetchEvents(); // Refresh the events
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

      // Create start and end dates
      const startDate = new Date(selectedDate);
      startDate.setHours(startTime.hours, startTime.minutes, 0, 0);
      
      const endDate = new Date(selectedDate);
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

      await apiService.createEvent(token, eventData);
      showSuccess('Event created successfully!');
      setIsCreateModalVisible(false);
      
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
    // Only show selected day events, not upcoming events
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
                      <Text style={styles.eventText} numberOfLines={1}>{event.title}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
                  selectedDayEvents.map((event) => (
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
                      </View>
                      <View style={styles.eventActions}>
                        {user?.userType === 'customer' && (
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
                        <TouchableOpacity style={styles.eventAction}>
                          <Ionicons name="ellipsis-vertical" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
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
            <Text style={styles.modalTitle}>Create Event</Text>
            <TextInput
              placeholder="Event Title"
              value={newEventTitle}
              onChangeText={setNewEventTitle}
              style={styles.input}
            />
            <TextInput
              placeholder="Description"
              value={newEventDescription}
              onChangeText={setNewEventDescription}
              style={styles.input}
              multiline
            />
            <TextInput
              placeholder="Location"
              value={newEventLocation}
              onChangeText={setNewEventLocation}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Start Time (HH:mm)"
                value={newEventStartTime}
                onChangeText={setNewEventStartTime}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                placeholder="End Time (HH:mm)"
                value={newEventEndTime}
                onChangeText={setNewEventEndTime}
                style={[styles.input, { flex: 1 }]}
              />
            </View>
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
            <TextInput
              placeholder="Tags (comma separated)"
              value={newEventTags}
              onChangeText={setNewEventTags}
              style={styles.input}
            />
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollViewContent: {
    flexGrow: 1, // Allows content to grow within ScrollView
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statusTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 4,
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
    flex: 1, // Take full height
    paddingHorizontal: 0, // No horizontal padding for calendar container
    paddingVertical: 0, // No vertical padding for calendar container
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 0, // No margin bottom for day headers
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8, // Keep some vertical padding for headers
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    alignContent: 'stretch', // Stretch items to fill container height
    justifyContent: 'flex-start', // Align to start to remove unnecessary spacing
    borderTopWidth: 1, // Add top border for grid
    borderLeftWidth: 1, // Add left border for grid
    borderColor: '#E0E0E0', // Border color for grid
  },
  dayCell: {
    width: '14.28%', // Perfect width for 7 columns
    borderRightWidth: 1, // Add right border for cells
    borderBottomWidth: 1, // Add bottom border for cells
    borderColor: '#E0E0E0',
    justifyContent: 'flex-start', // Align content to top-start
    alignItems: 'flex-start',
    padding: 4, // Internal padding
    overflow: 'hidden',
  },
  selectedDayCell: {
    backgroundColor: '#FCE7E9', // Lighter red background for selected day
    borderColor: '#EF4444',
  },
  otherMonthDay: {
    backgroundColor: '#FDFDFD', // Very light grey for other month days
    opacity: 1,
  },
  dayNumber: {
    fontSize: 14, // Font size for day number
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4, // Space between number and events
  },
  selectedDayNumber: {
    color: '#EF4444',
  },
  otherMonthDayNumber: {
    color: '#AAA',
  },
  eventIndicator: {
    width: '100%', // Full width for event display
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 2, // Space between events
    alignSelf: 'flex-start', // Align to the start of the cell
  },
  eventText: {
    fontSize: 9, // Smaller font size for events
    color: 'white',
    fontWeight: '500',
  },
  eventsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // Align to bottom
  },
  eventsModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%', // Take up to 70% of screen height
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
    fontSize: 22, // Bigger title
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20, // More space
    textAlign: 'center',
  },
  upcomingEventsList: {
    gap: 15,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5', // Lighter background
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000', // Add shadow for depth
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
  viewMoreText: {
    color: '#F44336',
    fontWeight: '500',
  },
  eventAction: {
    padding: 4,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEventsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
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
    bottom: 100,
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
}); 