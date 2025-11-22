import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Snackbar } from '../../components/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { apiService } from '../../services/api';

interface VendorEvent {
  _id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  priceCents: number;
  status: string;
}

export default function MyEventsScreen() {
  const { token, user } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (token && user?.userType === 'vendor') {
      loadEvents();
    }
  }, [token, user]);

  const loadEvents = async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.listEvents({
        limit: 100,
      });

      const vendorEvents = (response.events || []).filter(
        (event: any) => event.vendorId?._id === user?._id || event.vendorId === user?._id
      );

      setEvents(vendorEvents);
    } catch (error: any) {
      showError('Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: { item: VendorEvent }) => {
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push(`/vendor/event-details?eventId=${item._id}`)}
      >
        <View style={styles.eventHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={24} color="#EF4444" />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventLocation} numberOfLines={1}>
              <Ionicons name="location-outline" size={14} color="#666" />
              {' '}{item.location}
            </Text>
          </View>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{formatDate(item.startsAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Capacity: {item.capacity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>${(item.priceCents / 100).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.eventFooter}>
          <View style={[styles.statusBadge, item.status === 'published' && styles.statusPublished]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  if (!user || user.userType !== 'vendor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Events</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Vendor Only</Text>
          <Text style={styles.emptyMessage}>This feature is only available for vendors</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        <TouchableOpacity onPress={() => loadEvents()}>
          <Ionicons name="refresh" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Events Yet</Text>
          <Text style={styles.emptyMessage}>Create your first event to get started</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/events/create')}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadEvents(true)}
              colors={['#EF4444']}
            />
          }
        />
      )}

      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        onHide={hideSnackbar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyStateContainer: {
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusPublished: {
    backgroundColor: '#ECFDF5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'capitalize',
  },
});
