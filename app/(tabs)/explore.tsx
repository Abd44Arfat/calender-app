import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Event {
  id: number;
  title: string;
  time: string;
  color: string;
  type: string;
}

interface EventsData {
  [key: string]: Event[];
}

export default function ExploreScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2023, 8, 1)); // September 2023
  const [selectedDate, setSelectedDate] = useState(new Date(2023, 8, 27)); // September 27

  // Sample events data for calendar
  const calendarEvents: EventsData = {
    '2023-08-29': [
      { id: 1, title: 'Football training', time: '10:00-12:00', color: '#4CAF50', type: 'sport' }
    ],
    '2023-09-01': [
      { id: 2, title: 'Basketball', time: '10:00-12:00', color: '#4CAF50', type: 'sport' }
    ],
    '2023-09-03': [
      { id: 3, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' },
      { id: 4, title: 'Swimming', time: '14:00-15:00', color: '#FF9800', type: 'sport' }
    ],
    '2023-09-05': [
      { id: 5, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' },
      { id: 6, title: 'Riding school', time: '16:00-17:00', color: '#FF9800', type: 'sport' }
    ],
    '2023-09-07': [
      { id: 7, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' }
    ],
    '2023-09-09': [
      { id: 8, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' },
      { id: 9, title: 'Martial Arts', time: '18:00-19:00', color: '#FF9800', type: 'sport' }
    ],
    '2023-09-11': [
      { id: 10, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' }
    ],
    '2023-09-13': [
      { id: 11, title: 'Gymnastics', time: '15:00-16:00', color: '#4CAF50', type: 'sport' }
    ],
    '2023-09-17': [
      { id: 12, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' }
    ],
    '2023-09-19': [
      { id: 13, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' },
      { id: 14, title: 'Gymnastics', time: '15:00-16:00', color: '#FF9800', type: 'sport' },
      { id: 15, title: 'Reel', time: '20:00-21:00', color: '#F44336', type: 'social' }
    ],
    '2023-09-23': [
      { id: 16, title: 'Cycling', time: '08:00-09:00', color: '#4CAF50', type: 'sport' }
    ],
    '2023-09-25': [
      { id: 17, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' },
      { id: 18, title: 'Giveaway', time: '12:00-13:00', color: '#FF9800', type: 'social' },
      { id: 19, title: 'Gymnastics', time: '15:00-16:00', color: '#F44336', type: 'sport' }
    ],
    '2023-09-27': [
      { id: 20, title: 'Quotes', time: '09:00-10:00', color: '#81C784', type: 'work' },
      { id: 21, title: 'Giveaway', time: '12:00-13:00', color: '#FF9800', type: 'social' },
      { id: 22, title: 'Cycling', time: '17:00-18:00', color: '#F44336', type: 'sport' }
    ],
    '2023-10-01': [
      { id: 23, title: 'Cycling', time: '08:00-09:00', color: '#4CAF50', type: 'sport' }
    ]
  };

  // Upcoming events for the list below calendar
  const upcomingEvents = [
    {
      id: 1,
      title: 'Football Training',
      time: '10:00-13:00',
      subtitle: 'Start from screen 16',
      color: '#4CAF50',
      type: 'sport',
    },
    {
      id: 2,
      title: 'Gymnastics',
      time: '14:00-15:00',
      subtitle: 'Define the problem or question that...view more',
      color: '#F44336',
      type: 'sport',
    },
    {
      id: 3,
      title: 'Horse riding',
      time: '19:00-20:00',
      subtitle: 'we will do the legs and back workout',
      color: '#2196F3',
      type: 'sport',
    },
  ];

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

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

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

  // Use useMemo to ensure events list updates when selectedDate changes
  const allEvents = useMemo(() => {
    // Only show selected day events, not upcoming events
    return selectedDayEvents.map((event, index) => ({
      ...event,
      id: event.id + 1000, // Ensure unique IDs
      subtitle: `Event for ${selectedDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      })}`,
    }));
  }, [selectedDate, selectedDayEvents]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>8:00</Text>
          <View style={styles.statusIcons}>
            <Ionicons name="cellular" size={12} color="#000" />
            <Ionicons name="wifi" size={12} color="#000" />
            <Ionicons name="battery-full" size={12} color="#000" />
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
                  onPress={() => setSelectedDate(date)}
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
                      <Text style={styles.eventText}>{event.title}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Events List */}
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>
            Events for {selectedDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <View style={styles.upcomingEventsList}>
            {allEvents.length > 0 ? (
              allEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={[styles.eventColorDot, { backgroundColor: event.color }]} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTime}>{event.time}</Text>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventSubtitle} numberOfLines={2}>
                      {event.subtitle}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.eventAction}>
                    <Ionicons name="ellipsis-vertical" size={16} color="#666" />
                  </TouchableOpacity>
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
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  selectedDayCell: {
    backgroundColor: '#FFE4E6',
    borderColor: '#EF4444',
  },
  otherMonthDay: {
    backgroundColor: '#FAFAFA',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  selectedDayNumber: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  otherMonthDayNumber: {
    color: '#CCC',
  },
  eventIndicator: {
    width: '100%',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    marginBottom: 1,
  },
  eventText: {
    fontSize: 8,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  upcomingSection: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  upcomingEventsList: {
    gap: 15,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    padding: 15,
    borderRadius: 12,
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
}); 