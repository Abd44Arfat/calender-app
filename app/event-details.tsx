import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../components/Snackbar';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiService, BASE_URL } from '../services/api';
import { scheduleEventNotification } from '../services/notificationservice';

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
      console.log('📦 Event Data:', JSON.stringify(eventData, null, 2));
      console.log('👤 Vendor ID:', eventData.vendorId);
      console.log('👤 Vendor ID Type:', typeof eventData.vendorId);
      console.log('👤 Is Vendor Populated?:', eventData.vendorId && typeof eventData.vendorId === 'object');

      // If vendorId is just a string (not populated), we need to fetch vendor details
      if (eventData.vendorId && typeof eventData.vendorId === 'string') {
        console.log('⚠️ Vendor not populated, fetching vendor details...');
        try {
          // Try to get vendor info from the user profile endpoint
          // For now, we'll just set the event and show what we have
          console.log('ℹ️ Vendor ID is not populated. Backend should populate vendor data.');
        } catch (err) {
          console.warn('Could not fetch vendor details:', err);
        }
      }

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
        console.log('📋 Assignment Data:', JSON.stringify(foundAssignment, null, 2));
        console.log('👤 Assigned By:', foundAssignment.assignedBy);
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

              // Schedule notification
              if (event && event.startsAt) {
                try {
                  const REMINDER_MINUTES = 10;
                  await scheduleEventNotification({
                    id: event._id,
                    title: 'Event Reminder',
                    body: `Your event "${event.title}" starts in ${REMINDER_MINUTES} minutes!`,
                    eventDateISO: event.startsAt,
                    type: 'event_assignment',
                  });
                } catch (e) {
                  console.error('Failed to schedule notification', e);
                }
              }

              showSuccess('Event accepted! It will appear in your calendar.');

              // Navigate back after showing success message
              // The screens will auto-refresh when they come into focus
              setTimeout(() => {
                router.back();
              }, 1500);
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

              // Navigate back after showing success message
              // The screens will auto-refresh when they come into focus
              setTimeout(() => {
                router.back();
              }, 1500);
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

  // Get vendor data from assignment.assignedBy if available, otherwise from event.vendorId
  const vendorData = assignment?.assignedBy || event.vendorId;

  // Check if vendor data is populated (object) or just an ID (string)
  const isVendorPopulated = vendorData && typeof vendorData === 'object';
  const vendor = isVendorPopulated ? vendorData : null;

  const vendorName = vendor?.profile?.fullName || (isVendorPopulated ? 'Unknown Vendor' : 'Vendor');
  const academyName = vendor?.profile?.academyName;
  const vendorEmail = vendor?.email;
  const vendorPhone = vendor?.profile?.businessPhone;
  const vendorImage = vendor?.profile?.profilePicture;

  // Check if current user is the vendor who created this event
  const isEventOwner = user?.userType === 'vendor' &&
    (event.vendorId === user._id ||
      (typeof event.vendorId === 'object' && event.vendorId?._id === user._id));

  console.log('🔍 Using vendor from:', assignment?.assignedBy ? 'assignment.assignedBy' : 'event.vendorId');
  console.log('👤 Vendor Data Type:', typeof vendorData);
  console.log('👤 Is Vendor Populated?:', isVendorPopulated);
  console.log('👤 Vendor object:', vendor);
  console.log('🖼️ Vendor Image:', vendorImage);

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    // If it already starts with http, return as is
    if (imagePath.startsWith('http')) return imagePath;
    // Otherwise, prepend the base URL
    return `${BASE_URL}${imagePath}`;
  };

  const handleCallVendor = () => {
    if (vendorPhone) {
      Linking.openURL(`tel:${vendorPhone}`);
    }
  };

  const handleEmailVendor = () => {
    if (vendorEmail) {
      Linking.openURL(`mailto:${vendorEmail}`);
    }
  };

  const handleEditEvent = () => {
    // Navigate to explore tab with edit params
    // This will automatically open the create/edit modal with all event data pre-filled
    router.replace({
      pathname: '/(tabs)/explore',
      params: {
        editEventId: eventId,
        editMode: 'true',
      },
    });
  };

  const handleDeleteEvent = async () => {
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
              setIsProcessing(true);
              if (!token) {
                showError('You must be logged in');
                return;
              }
              await apiService.deleteEvent(token, eventId);
              showSuccess('Event deleted successfully');
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error: any) {
              showError(error.response?.data?.error || 'Failed to delete event');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const sendManualReminder = async () => {
    if (!token || user?.userType !== 'vendor' || !isEventOwner) return;

    Alert.alert(
      'Send Event Reminder',
      `Are you sure you want to send a reminder to all attendees for "${event.title}"?\n\nThis will notify everyone who has accepted this event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await apiService.sendEventReminder(token, eventId);
              showSuccess('Reminder sent successfully to all attendees!');
            } catch (err: any) {
              showError(err.message || 'Failed to send reminder');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  // Debug logging
  console.log('🖼️ Vendor Image Path:', vendorImage);
  console.log('🖼️ Full Image URL:', getImageUrl(vendorImage));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Ionicons name="calendar" size={40} color="#EF4444" />
          </View>
        </View>

        {/* Event Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Vendor Name */}
        <Text style={styles.subtitle}>by {vendorName}</Text>

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
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Vendor Information Card */}
        {vendor && (
          <View style={styles.vendorCard}>
            <Text style={styles.vendorCardTitle}>Organized By</Text>

            <View style={styles.vendorInfo}>
              {/* Vendor Avatar */}
              <View style={styles.vendorAvatar}>
                {vendorImage ? (
                  <Image
                    source={{ uri: getImageUrl(vendorImage) || undefined }}
                    style={styles.vendorAvatarImage}
                    onError={(error) => {
                      console.log('❌ Image load error:', error.nativeEvent.error);
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully');
                    }}
                  />
                ) : (
                  <View style={styles.vendorAvatarPlaceholder}>
                    <Ionicons name="person" size={32} color="#EF4444" />
                  </View>
                )}
              </View>

              {/* Vendor Details */}
              <View style={styles.vendorDetails}>
                <Text style={styles.vendorFullName}>{vendorName}</Text>
                {academyName && (
                  <View style={styles.vendorMetaRow}>
                    <Ionicons name="business-outline" size={16} color="#666" />
                    <Text style={styles.vendorMetaText}>{academyName}</Text>
                  </View>
                )}
              </View>
            </View>



            {/* Vendor Contact Info */}
            <View style={styles.vendorContactInfo}>
              {vendorEmail && (
                <View style={styles.vendorContactRow}>
                  <Ionicons name="mail" size={16} color="#999" />
                  <Text style={styles.vendorContactText}>{vendorEmail}</Text>
                </View>
              )}
              {vendorPhone && (
                <View style={styles.vendorContactRow}>
                  <Ionicons name="call" size={16} color="#999" />
                  <Text style={styles.vendorContactText}>{vendorPhone}</Text>
                </View>
              )}
            </View>
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

        {/* Actions for Event Owner (Vendor) */}
        {isEventOwner && !isPendingAssignment && (
          <View style={styles.actionButtonsSingle}>
            <TouchableOpacity
              style={[styles.remindButton, isProcessing && styles.buttonDisabled]}
              onPress={sendManualReminder}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <>
                  <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
                  <Text style={styles.remindButtonText}>Remind All</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, isProcessing && styles.buttonDisabled]}
              onPress={handleDeleteEvent}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Delete Event</Text>
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
  subtitle: {
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
  actionButtonsSingle: {
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#EF4444',
    width: '100%',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  vendorCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vendorCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vendorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    overflow: 'hidden',
  },
  vendorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  vendorAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorDetails: {
    flex: 1,
  },
  vendorFullName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  vendorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  vendorMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  vendorContactInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  vendorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vendorContactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB', // Light amber background
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginBottom: 12, // Space between buttons
  },
  remindButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
