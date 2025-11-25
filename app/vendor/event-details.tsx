import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Snackbar } from '../../components/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { apiService, EventAssignment } from '../../services/api';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { token, user } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'accepted' | 'rejected' | 'pending'>('accepted');

  useEffect(() => {
    if (token && eventId) {
      loadEventDetails();
      loadAssignments();
    }
  }, [token, eventId]);

  const loadEventDetails = async () => {
    if (!token || !eventId) return;

    try {
      const event = await apiService.getEventById(eventId);
      setEventDetails(event);
    } catch (error: any) {
      console.error('Failed to load event details:', error);
    }
  };

  const loadAssignments = async (isRefresh = false) => {
    if (!token || !eventId) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.getEventAssignments(token, eventId);
      setAssignments(response.assignments || []);
    } catch (error: any) {
      showError('Failed to load assignments');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://quackplan2.ahmed-abd-elmohsen.tech${imagePath}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredAssignments = assignments.filter(
    (assignment) => assignment.status === selectedTab
  );

  const acceptedCount = assignments.filter((a) => a.status === 'accepted').length;
  const rejectedCount = assignments.filter((a) => a.status === 'rejected').length;
  const pendingCount = assignments.filter((a) => a.status === 'pending').length;

  const renderAssignment = (assignment: EventAssignment) => {
    const userData = typeof assignment.userId === 'object' ? assignment.userId : null;
    if (!userData) return null;

    const userProfile = userData.profile as any;

    return (
      <View key={assignment._id} style={styles.assignmentCard}>
        <View style={styles.userRow}>
          {getImageUrl(userProfile?.profilePicture) ? (
            <Image
              source={{ uri: getImageUrl(userProfile.profilePicture)! }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile?.fullName || 'Unknown'}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            {assignment.respondedAt && (
              <Text style={styles.respondedDate}>
                {formatDate(assignment.respondedAt)}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              assignment.status === 'accepted' && styles.statusAccepted,
              assignment.status === 'rejected' && styles.statusRejected,
              assignment.status === 'pending' && styles.statusPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                assignment.status === 'accepted' && styles.statusTextAccepted,
                assignment.status === 'rejected' && styles.statusTextRejected,
                assignment.status === 'pending' && styles.statusTextPending,
              ]}
            >
              {assignment.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!user || user.userType !== 'vendor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyTitle}>Access Denied</Text>
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
        <Text style={styles.headerTitle}>Event Assignments</Text>
        <TouchableOpacity onPress={() => loadAssignments()}>
          <Ionicons name="refresh" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {eventDetails && (
        <View style={styles.eventInfoCard}>
          <Text style={styles.eventTitle}>{eventDetails.title}</Text>
          <View style={styles.eventInfoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.eventInfoText}>{eventDetails.location}</Text>
          </View>
          <View style={styles.eventInfoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.eventInfoText}>
              {formatDate(eventDetails.startsAt)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'accepted' && styles.tabActive]}
          onPress={() => setSelectedTab('accepted')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'accepted' && styles.tabTextActive]}
          >
            Accepted ({acceptedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'rejected' && styles.tabActive]}
          onPress={() => setSelectedTab('rejected')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'rejected' && styles.tabTextActive]}
          >
            Rejected ({rejectedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}
          >
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : filteredAssignments.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="people-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No {selectedTab} users</Text>
          <Text style={styles.emptyMessage}>
            No users have {selectedTab} this event yet
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadAssignments(true)}
              colors={['#EF4444']}
            />
          }
        >
          {filteredAssignments.map(renderAssignment)}
        </ScrollView>
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
  eventInfoCard: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#EF4444',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: 'white',
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
  },
  content: {
    flex: 1,
    padding: 16,
  },
  assignmentCard: {
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  respondedDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusAccepted: {
    backgroundColor: '#ECFDF5',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusTextAccepted: {
    color: '#059669',
  },
  statusTextRejected: {
    color: '#EF4444',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
});
