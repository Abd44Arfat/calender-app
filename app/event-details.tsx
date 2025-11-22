import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiService } from '../services/api';

export default function EventDetailsScreen() {
  const { eventId, assignmentId } = useLocalSearchParams<{ eventId: string; assignmentId?: string }>();
  const { token, user } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const [event, setEvent] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventDetails();
    }
    if (assignmentId && token) {
      loadAssignment();
    }
  }, [eventId, assignmentId, token]);

  const loadEventDetails = async () => {
    try {
      setIsLoading(true);
      const eventData = await apiService.getEventById(eventId);
      setEvent(eventData);
    } catch (error: any) {
      showError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignment = async () => {
    if (!token || !assignmentId) return;
    
    try {
      const response = await apiService.getMyAssignments(token, {
        limit: 100,
      });
      const foundAssignment = response.assignments?.find((a: any) => a._id === assignmentId);
      if (foundAssignment) {
        setAssignment(foundAssignment);
      }
    } catch (error: any) {
      console.error('Failed to load assignment:', error);
    }
  };

  const handleAccept = async () => {
    if (!token || !assignmentId) return;

    Alert.alert(
      'Accept Event',
      'Do you want to accept this event assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await apiService.acceptEventAssignment(token, assignmentId);
              showSuccess('Event accepted! It will appear in your calendar.');
              setTimeout(() => router.back(), 1500);
            } catch (error: any) {
              showError(error.response?.data?.error || 'Failed to accept event');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!token || !assignmentId) return;

    Alert.alert(
      'Reject Event',
      'Are you sure you want to reject this event assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await apiService.rejectEventAssignment(token, assignmentId);
              showSuccess('Event rejected');
              setTimeout(() => router.back(), 1500);
            } catch (error: any) {
              showError(error.response?.data?.error || 'Failed to reject event');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPendingAssignment = assignment && assignment.status === 'pending';
  const vendorName = event.vendorId?.profile?.fullName || 'Unknown Vendor';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Event Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Ionicons name="calendar" size={40} color="#EF4444" />
          </View>
        </View>

        {/* Event Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Vendor Name */}
        <Text style={styles.vendor}>by {vendorName}</Text>

        {/* Event Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{formatDate(event.startsAt)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.detailText}>
              {formatTime(event.startsAt)} - {formatTime(event.endsAt)}
            </Text>
          </View>

          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          )}

          {event.capacity && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Capacity: {event.capacity}</Text>
            </View>
          )}

          {event.priceCents != null && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={20} color="#666" />
              <Text style={styles.detailText}>${(event.priceCents / 100).toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Accept/Reject Buttons for Pending Assignments */}
        {isPendingAssignment && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
              onPress={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  content: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  vendor: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  descriptionCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: 'white',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
