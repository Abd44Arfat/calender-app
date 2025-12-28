import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiService } from '../services/api';

export default function DayEventsScreen() {
  const { date, eventsData } = useLocalSearchParams<{ date: string; eventsData: string }>();
  const { user, token } = useAuth();
  const { snackbar, showSuccess, showError } = useSnackbar();
  const [loadingMap, setLoadingMap] = React.useState<{ [key: string]: boolean }>({});

  const events = eventsData ? JSON.parse(eventsData) : [];
  const selectedDate = date ? new Date(date) : new Date();

  const formatDate = () => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sendManualReminder = async (event: any) => {
    if (!token || user?.userType !== 'vendor') return;

    Alert.alert(
      'Send Event Reminder',
      `Are you sure you want to send a reminder to all attendees for "${event.title}"?\n\nThis will notify everyone who has accepted this event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: async () => {
            try {
              setLoadingMap(prev => ({ ...prev, [event._id || event.id]: true }));
              const eventId = String(event._id || event.id);
              await apiService.sendEventReminder(token, eventId);
              showSuccess('Reminder sent successfully to all attendees!');
            } catch (err: any) {
              showError(err.message || 'Failed to send reminder');
            } finally {
              setLoadingMap(prev => ({ ...prev, [event._id || event.id]: false }));
            }
          }
        }
      ]
    );
  };

  const handleEventPress = (event: any) => {
    router.push({
      pathname: '/event-details',
      params: {
        eventId: event._id || event.id,
        assignmentId: event.assignmentId,
      },
    });
  };

  const renderEvent = ({ item }: { item: any }) => {
    const isPersonal = item.isPersonal || item.type === 'personal';

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
      >
        <View style={[styles.eventAccent, { backgroundColor: isPersonal ? '#60A5FA' : '#EF4444' }]} />

        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.eventDetailText}>
                {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
              </Text>
            </View>

            {item.location && (
              <View style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.eventDetailText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}

            {item.description && (
              <View style={styles.eventDetailRow}>
                <Ionicons name="information-circle-outline" size={16} color="#666" />
                <Text style={styles.eventDetailText} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.eventFooter}>
            <View style={[styles.typeBadge, { backgroundColor: isPersonal ? '#EFF6FF' : '#FEF2F2' }]}>
              <Text style={[styles.typeBadgeText, { color: isPersonal ? '#60A5FA' : '#EF4444' }]}>
                {isPersonal ? 'Personal' : 'Public'}
              </Text>
            </View>


          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.dateHeader}>
        <Ionicons name="calendar" size={24} color="#EF4444" />
        <Text style={styles.dateText}>{formatDate()}</Text>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Events</Text>
          <Text style={styles.emptyMessage}>No events scheduled for this day</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContainer}
        />
      )}
      {/* Snackbar */}
      {snackbar.visible && (
        <View
          style={{
            position: 'absolute',
            top: 50,
            left: 16,
            right: 16,
            backgroundColor: snackbar.type === 'error' ? '#EF4444' : '#10B981',
            padding: 12,
            borderRadius: 8,
            zIndex: 100,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  listContainer: {
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventAccent: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  remindButton: {
    padding: 8,
    marginLeft: 12,
  },
});
