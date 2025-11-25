import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '../../components/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { apiService, User } from '../../services/api';

export default function CreateEventScreen() {
  const { token, user } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // Date restrictions - current year only
  const now = new Date();
  const minimumDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
  const maximumDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // December 31st of current year

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000)); // 1 hour later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // User selection
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (showUserSelection) {
      loadUsers();
    }
  }, [showUserSelection, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiService.getAllUsers(token || '', {
        userType: 'customer',
        search: searchQuery || undefined,
        limit: 50,
      });
      setUsers(response.users);
    } catch (error: any) {
      showError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAllUsers = () => {
    const allUserIds = new Set(users.map(u => u._id));
    setSelectedUsers(allUserIds);
  };

  const deselectAllUsers = () => {
    setSelectedUsers(new Set());
  };

  const handleSubmit = async () => {
    if (!title || !description || !location || !capacity || !price) {
      showError('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      const eventData = {
        title,
        description,
        location,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        capacity: parseInt(capacity),
        priceCents: Math.round(parseFloat(price) * 100),
        visibility: 'public' as const,
        status: 'published' as const,
        tags: [],
        assignedUsers: Array.from(selectedUsers),
      };

      await apiService.createEventWithAssignment(token || '', eventData);
      showSuccess('Event created and users assigned successfully!');
      router.back();
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://quackplan2.ahmed-abd-elmohsen.tech${imagePath}`;
  };

  if (showUserSelection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowUserSelection(false)}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Users</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.selectionActions}>
          <TouchableOpacity onPress={selectAllUsers} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deselectAllUsers} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Deselect All</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selectedUsers.size} selected</Text>
        </View>

        {loadingUsers ? (
          <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
              const isSelected = selectedUsers.has(item._id);
              return (
                <TouchableOpacity
                  style={[styles.userItem, isSelected && styles.userItemSelected]}
                  onPress={() => toggleUserSelection(item._id)}
                >
                  {getImageUrl(item.profile.profilePicture) ? (
                    <Image
                      source={{ uri: getImageUrl(item.profile.profilePicture)! }}
                      style={styles.userAvatar}
                    />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <Ionicons name="person" size={24} color="#666" />
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.profile.fullName}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#EF4444" />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users found</Text>
            }
          />
        )}

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShowUserSelection(false)}
        >
          <Text style={[styles.doneButtonText, { color: 'white' }]}>Done ({selectedUsers.size} selected)</Text>
        </TouchableOpacity>

        <Snackbar
          visible={snackbar.visible}
          message={snackbar.message}
          type={snackbar.type}
          onHide={hideSnackbar}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Event title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Event description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Event location"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                placeholder="20"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Price ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="50.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start Date & Time *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateText}>{startDate.toLocaleString()}</Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Date & Time *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateText}>{endDate.toLocaleString()}</Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Assign Users</Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => setShowUserSelection(true)}
            >
              <Ionicons name="people-outline" size={20} color="#EF4444" />
              <Text style={styles.assignButtonText}>
                {selectedUsers.size > 0
                  ? `${selectedUsers.size} users selected`
                  : 'Select users to assign'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Start Date/Time Picker Modal */}
      {showStartPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showStartPicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Start Date & Time</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={[styles.doneButtonText, { color: '#EF4444' }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                textColor="#2563EB"
                onChange={(event, date) => {
                  if (date) setStartDate(date);
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {showStartPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={startDate}
          mode="datetime"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {/* End Date/Time Picker Modal */}
      {showEndPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showEndPicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select End Date & Time</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={[styles.doneButtonText, { color: '#EF4444' }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate}
                mode="datetime"
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                textColor="#2563EB"
                onChange={(event, date) => {
                  if (date) setEndDate(date);
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {showEndPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={endDate}
          mode="datetime"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
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
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
  },
  assignButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCount: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userItemSelected: {
    backgroundColor: '#FEF2F2',
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
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  doneButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    alignItems: 'center',
    margin: 20,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
