import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Event {
  id: number;
  title: string;
  time: string;
  color: string;
  type: string;
}

const HomeScreen = () => {
  const [selectedDay, setSelectedDay] = useState(13);

  const events = [
    {
      id: 1,
      title: 'Football Training',
      time: '10:00 Am - 09:00 Am',
      color: '#4CAF50',
      startTime: '09:00',
    },
    {
      id: 2,
      title: 'Gymnastics',
      time: '11:00 Am - 12:00 Pm',
      color: '#2196F3',
      startTime: '11:00',
    },
    {
      id: 3,
      title: 'High-fidelity design',
      time: '12:00 Pm - 01:00 Pm',
      color: '#FF9800',
      startTime: '12:00',
    },
    {
      id: 4,
      title: 'Usability Testing Prep.',
      time: '01:00 Pm - 02:00 Pm',
      color: '#9C27B0',
      startTime: '13:00',
    },
  ];

  const timeSlots = [
    '08:00 am', '09:00 am', '10:00 am', '11:00 am', '12:00 pm',
    '01:00 pm', '02:00 pm', '03:00 pm', '04:00 pm', '05:00 pm'
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
    return events.find(event => event.startTime === time.split(':')[0].padStart(2, '0'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
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
          <View style={styles.profilePic}>
            <Ionicons name="person" size={24} color="#2196F3" />
          </View>
          <Text style={styles.greetingText}>Hi, James!</Text>
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
      <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
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
                  <TouchableOpacity style={[styles.eventCard, { backgroundColor: event.color }]}>
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>{event.time}</Text>
                    </View>
                    <TouchableOpacity style={styles.eventIcon}>
                      <Ionicons name="open-outline" size={16} color="white" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.emptySlot} />
                )}
              </View>
            </View>
          );
        })}
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
    flex: 1,
    paddingHorizontal: 20,
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
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  eventIcon: {
    padding: 4,
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