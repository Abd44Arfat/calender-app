import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Snackbar } from '../../components/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { apiService, EventAssignment } from '../../services/api';

export default function NotificationsScreen() {
  const { token, user } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [vendorNotifications, setVendorNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      if (user?.userType === 'customer') {
        loadAssignments();
      } else if (user?.userType === 'vendor') {
        loadVendorNotifications();
      }
    }
  }, [token, user]);

  const loadAssignments = async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.getMyAssignments(token, {
        status: 'pending',
        limit: 50,
      });

      setAssignments(response.assignments || []);
    } catch (error: any) {
      showError('Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadVendorNotifications = async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Fetch all notifications first
      const response = await apiService.getNotifications(token, {
        limit: 100,
      });

      console.log('All notifications:', response.notifications);

      // Filter for event assignment responses
      const filteredNotifications = (response.notifications || []).filter((notif: any) => {
        const type = notif.payload?.type || notif.type;
        return type === 'event_assignment_accepted' || type === 'event_assignment_rejected';
      });

      console.log('Filtered notifications:', filteredNotifications);

      setVendorNotifications(filteredNotifications);
    } catch (error: any) {
      console.error('Failed to load vendor notifications:', error);
      showError('Failed to load notifications');
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

  const renderAssignment = ({ item }: { item: EventAssignment }) => {
    const isProcessing = processingIds.has(item._id);
    const eventData = item.eventId;
    const vendorName = eventData.vendorId?.profile?.fullName || 'Unknown Vendor';

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        onPress={() => {
          router.push({
            pathname: '/event-details',
            params: {
              eventId: eventData._id,
              assignmentId: item._id,
            },
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={24} color="#EF4444" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.eventTitle}>{eventData.title}</Text>
            <Text style={styles.vendorName}>by {vendorName}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDate(eventData.startsAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="arrow-forward-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDate(eventData.endsAt)}</Text>
          </View>
        </View>

        <View style={styles.viewDetailsButton}>
          <Ionicons name="arrow-forward" size={16} color="#EF4444" />
          <Text style={styles.viewDetailsText}>View Details</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:3000${imagePath}`;
  };

  const renderVendorNotification = ({ item }: { item: any }) => {
    const payload = item.payload || {};
    const isAccepted = payload.type === 'event_assignment_accepted';
    const isRejected = payload.type === 'event_assignment_rejected';
    
    // Extract user info from nested acceptedBy or rejectedBy object
    const userObject = payload.acceptedBy || payload.rejectedBy;
    
    const userName = userObject?.name || 
                     payload.userName || 
                     payload.userFullName || 
                     'Unknown User';
    
    const userImage = userObject?.image || 
                      payload.userProfilePicture || 
                      payload.profilePicture;
    
    const userEmail = userObject?.email || payload.userEmail;
    
   

    // Debug logging - only log once per notification
    if (!item._logged) {
      console.log('📧 Vendor Notification:', {
        notificationId: item._id,
        type: payload.type,
        userName,
        userEmail,
        hasUserImage: !!userImage,
        userImagePath: userImage,
        message: payload.message,
        userObject,
        allPayloadKeys: Object.keys(payload),
      });
      item._logged = true;
    }

    return (
      <View style={styles.assignmentCard}>
        <View style={styles.cardHeader}>
          {/* User Profile Image */}
          {getImageUrl(userImage) ? (
            <Image
              source={{ uri: getImageUrl(userImage)! }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
          
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.userName}>{userName}</Text>
              <Ionicons
                name={isAccepted ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={isAccepted ? '#059669' : '#EF4444'}
              />
            </View>
            {userEmail && (
              <Text style={styles.userEmail}>{userEmail}</Text>
            )}
       
            <Text style={styles.actionText}>
              {isAccepted ? 'Accepted your event' : 'Rejected your event'}
            </Text>
            {/* Date at the end of the column */}
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={14} color="#999" />
              <Text style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="notifications-off" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyMessage}>Please log in to see notifications</Text>
        </View>
      </SafeAreaView>
    );
  }

  // For vendors, show response notifications
  if (user?.userType === 'vendor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={() => loadVendorNotifications()}>
            <Ionicons name="refresh" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : vendorNotifications.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="notifications-off" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyMessage}>You're all caught up!</Text>
          </View>
        ) : (
          <FlatList
            data={vendorNotifications}
            keyExtractor={(item) => item._id}
            renderItem={renderVendorNotification}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadVendorNotifications(true)}
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

  // For customers, show event assignments
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Assignments</Text>
        <TouchableOpacity onPress={() => loadAssignments()}>
          <Ionicons name="refresh" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="notifications-off" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Pending Assignments</Text>
          <Text style={styles.emptyMessage}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderAssignment}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadAssignments(true)}
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
    fontSize: 24,
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
  },
  listContainer: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  headerInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
    marginBottom: 2,
  },
  vendorName: {
    fontSize: 14,
    color: '#666',
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginTop: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
