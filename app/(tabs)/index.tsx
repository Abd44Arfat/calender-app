import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../contexts/AuthContext';

interface Event {
  id: number;
  title: string;
  time: string;
  color: string;
  type: string;
  startTime: string;
}

interface EventsData {
  [key: number]: Event[];
}

const HomeScreen = () => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(13);

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    // Otherwise, construct the full URL
    return `http://localhost:3000${imagePath}`;
  };

  // Dummy data for different days
  const dayEvents: EventsData = {
    11: [
      {
        id: 1,
        title: 'Morning Meeting',
        time: '09:00 Am - 10:00 Am',
        color: '#4CAF50',
        startTime: '09:00',
        type: 'work',
      },
      {
        id: 2,
        title: 'Lunch Break',
        time: '12:00 Pm - 01:00 Pm',
        color: '#FF9800',
        startTime: '12:00',
        type: 'personal',
      },
    ],
    12: [
      {
        id: 3,
        title: 'Client Call',
        time: '10:00 Am - 11:00 Am',
        color: '#2196F3',
        startTime: '10:00',
        type: 'work',
      },
      {
        id: 4,
        title: 'Team Standup',
        time: '02:00 Pm - 03:00 Pm',
        color: '#9C27B0',
        startTime: '14:00',
        type: 'work',
      },
    ],
    13: [
      {
        id: 5,
        title: 'Football Training',
        time: '09:00 Am - 10:00 Am',
        color: '#4CAF50',
        startTime: '09:00',
        type: 'sport',
      },
      {
        id: 6,
        title: 'Gymnastics',
        time: '11:00 Am - 12:00 Pm',
        color: '#2196F3',
        startTime: '11:00',
        type: 'sport',
      },
      {
        id: 7,
        title: 'High-fidelity design',
        time: '12:00 Pm - 01:00 Pm',
        color: '#FF9800',
        startTime: '12:00',
        type: 'work',
      },
      {
        id: 8,
        title: 'Usability Testing Prep.',
        time: '01:00 Pm - 02:00 Pm',
        color: '#9C27B0',
        startTime: '13:00',
        type: 'work',
      },
      {
        id: 9,
        title: 'Team Meeting',
        time: '02:00 Pm - 03:00 Pm',
        color: '#607D8B',
        startTime: '14:00',
        type: 'work',
      },
      {
        id: 10,
        title: 'Client Call',
        time: '03:00 Pm - 04:00 Pm',
        color: '#E91E63',
        startTime: '15:00',
        type: 'work',
      },
      {
        id: 11,
        title: 'Evening Workout',
        time: '06:00 Pm - 07:00 Pm',
        color: '#4CAF50',
        startTime: '18:00',
        type: 'sport',
      },
      {
        id: 12,
        title: 'Dinner',
        time: '07:00 Pm - 08:00 Pm',
        color: '#FF9800',
        startTime: '19:00',
        type: 'personal',
      },
    ],
    14: [
      {
        id: 9,
        title: 'Weekend Planning',
        time: '10:00 Am - 11:00 Am',
        color: '#E91E63',
        startTime: '10:00',
        type: 'personal',
      },
      {
        id: 10,
        title: 'Movie Night',
        time: '08:00 Pm - 10:00 Pm',
        color: '#607D8B',
        startTime: '20:00',
        type: 'entertainment',
      },
    ],
    15: [
      {
        id: 11,
        title: 'Family Dinner',
        time: '06:00 Pm - 08:00 Pm',
        color: '#FF9800',
        startTime: '18:00',
        type: 'personal',
      },
    ],
    16: [
      {
        id: 12,
        title: 'Monday Review',
        time: '09:00 Am - 10:00 Am',
        color: '#4CAF50',
        startTime: '09:00',
        type: 'work',
      },
      {
        id: 13,
        title: 'Project Planning',
        time: '02:00 Pm - 04:00 Pm',
        color: '#2196F3',
        startTime: '14:00',
        type: 'work',
      },
    ],
  };

  const timeSlots = [
    '08:00 am', '09:00 am', '10:00 am', '11:00 am', '12:00 pm',
    '01:00 pm', '02:00 pm', '03:00 pm', '04:00 pm', '05:00 pm',
    '06:00 pm', '07:00 pm', '08:00 pm', '09:00 pm', '10:00 pm'
  ];

  const days = [
    { day: 11, label: 'Wed' },
    { day: 12, label: 'Thu' },
    { day: 13, label: 'Fri' },
    { day: 14, label: 'Sat' },
    { day: 15, label: 'Sun' },
    { day: 16, label: 'Mon' },
  ];

  const getEventForTime = (time: string) => {
    const currentDayEvents = dayEvents[selectedDay] || [];
    return currentDayEvents.find(event => event.startTime === time.split(':')[0].padStart(2, '0'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusIcons}>
            <View style={styles.dynamicIsland} />
            <View style={styles.signalIcons}>
              <Ionicons name="cellular" size={12} color="#000" />
              <Ionicons name="wifi" size={12} color="#000" />
              <Ionicons name="battery-full" size={12} color="#000" />
            </View>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            {getImageUrl(user?.profile?.profilePicture) ? (
              <Image 
                source={{ uri: getImageUrl(user.profile.profilePicture)! }} 
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePic}>
                <Ionicons name="person" size={24} color="#2196F3" />
              </View>
            )}
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
          <View style={styles.dateHeader}>
            <Text style={styles.yearText}>2024</Text>
            <View style={styles.monthSelector}>
              <Text style={styles.monthText}>August</Text>
              <Ionicons name="chevron-down" size={16} color="#000" />
            </View>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
            {days.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  item.day === selectedDay && styles.selectedDay
                ]}
                onPress={() => setSelectedDay(item.day)}
              >
                <Text style={[
                  styles.dayNumber,
                  item.day === selectedDay && styles.selectedDayText
                ]}>
                  {item.day}
                </Text>
                <Text style={[
                  styles.dayLabel,
                  item.day === selectedDay && styles.selectedDayText
                ]}>
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
                  {event ? (
                    <EventCard event={event} />
                  ) : (
                    <View style={styles.emptySlot} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

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
    alignItems: 'center',
  },
  dynamicIsland: {
    width: 120,
    height: 30,
    backgroundColor: '#000',
    borderRadius: 15,
    marginRight: 10,
  },
  signalIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    color: '#000',
  },
  notificationIcon: {
    padding: 8,
  },
  dateSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  yearText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 10,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthText: {
    fontSize: 18,
    color: '#000',
  },
  daysContainer: {
    flexDirection: 'row',
  },
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
  selectedDay: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dayLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedDayText: {
    color: 'white',
  },
  scheduleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for FAB
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timeColumn: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: 15,
  },
  timeText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  timelineLine: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
  },
  eventColumn: {
    flex: 1,
    paddingLeft: 15,
  },
  emptySlot: {
    height: 60,
  },
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});

export default HomeScreen;