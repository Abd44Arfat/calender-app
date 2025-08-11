import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EventCardProps {
  event: {
    id: number;
    title: string;
    time: string;
    color: string;
    type: string;
  };
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <TouchableOpacity style={[styles.eventCard, { backgroundColor: event.color }]}>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventTime}>{event.time}</Text>
      </View>
      <TouchableOpacity style={styles.eventIcon}>
        <Ionicons name="open-outline" size={16} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});

export default EventCard; 