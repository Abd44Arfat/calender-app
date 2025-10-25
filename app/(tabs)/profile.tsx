import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Snackbar } from '../../components/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { apiService } from '../../services/api';

export default function ProfileScreen() {
  let user, token, logout, refreshProfile, uploadProfileImage;
  try {
    const auth = useAuth();
    user = auth.user;
    token = auth.token;
    logout = auth.logout;
    refreshProfile = auth.refreshProfile;
    uploadProfileImage = auth.uploadProfileImage;
  } catch (error) {
    console.log('Auth context not available in ProfileScreen');
    user = null;
    token = null;
    logout = () => {};
    refreshProfile = async () => {};
    uploadProfileImage = async () => {};
  }

  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Profile edit form state
  const [editLocation, setEditLocation] = useState('');
  const [editRating, setEditRating] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAcademyName, setEditAcademyName] = useState('');

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Helper: Construct full image URL
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://quackplan2.ahmed-abd-elmohsen.tech${imagePath}`;
  };

  useEffect(() => {
    refreshProfile().catch(console.error);
  }, []);

  useEffect(() => {
    console.log('User data updated:', {
      hasUser: !!user,
      profilePicture: user?.profile?.profilePicture,
      fullName: user?.profile?.fullName,
      email: user?.email,
    });
  }, [user]);

  // FIXED: Image Picker for Real Devices
const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo access in Settings to update your profile picture.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // CORRECT
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      await uploadProfilePicture(result.assets[0].uri);
    }
  } catch (error: any) {
    console.error('Image picker error:', error);
    showError('Failed to select image. Please try again.');
  }
};
  // FIXED: Upload with FormData + Timeout
  const uploadProfilePicture = async (imageUri: string) => {
  if (!imageUri) return;

  try {
    setIsUploadingImage(true);
    console.log('Uploading image:', imageUri);

    const formData = new FormData();
    formData.append('picture', {  // ← CHANGED FROM 'image' TO 'picture'
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    const result = await uploadProfileImage(formData);
    console.log('Upload successful:', result);

    await refreshProfile();
    showSuccess('Profile picture updated successfully!');
  } catch (error: any) {
    console.error('Upload failed:', error);
    showError('Upload failed. Please try again.');
  } finally {
    setIsUploadingImage(false);
  }
};

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            showSuccess('Logged out successfully');
            router.replace('/login');
          } catch (error) {
            showError('Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const openEditModal = () => {
    setEditLocation(user?.profile?.location || '');
    setEditRating(user?.profile?.rating?.toString() || '');
    setEditFullName(user?.profile?.fullName || '');
    setEditPhone(user?.profile?.phone || '');
    setEditAcademyName(user?.profile?.academyName || '');
    setIsEditModalVisible(true);
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const updateData = {
        profile: {
          location: editLocation.trim() || undefined,
          rating: editRating ? parseFloat(editRating) : undefined,
          fullName: editFullName.trim() || undefined,
          phone: editPhone.trim() || undefined,
          academyName: editAcademyName.trim() || undefined,
        },
      };

      await apiService.updateProfile(token || '', updateData);
      showSuccess('Profile updated successfully!');
      setIsEditModalVisible(false);
      await refreshProfile();
    } catch (err: any) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.changePassword(token || '', {
        currentPassword,
        newPassword,
      });
      showSuccess('Password changed successfully!');
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuAction = (action: string) => {
    const actions: Record<string, () => void> = {
      edit: openEditModal,
      changePassword: () => setIsPasswordModalVisible(true),
      privacy: () => router.push('/privacy'),
      help: () => router.push('/help'),
      about: () => router.push('/about'),
      logout: handleLogout,
    };
    actions[action]?.();
  };

  const menuItems = [
    { title: 'Edit Profile', icon: 'person-outline', action: 'edit' },
    { title: 'Change Password', icon: 'lock-closed-outline', action: 'changePassword' },
    { title: 'Privacy', icon: 'shield-outline', action: 'privacy' },
    { title: 'Help & Support', icon: 'help-circle-outline', action: 'help' },
    { title: 'About', icon: 'information-circle-outline', action: 'about' },
    { title: 'Logout', icon: 'log-out-outline', action: 'logout', color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={pickImage}
            disabled={isUploadingImage}
          >
            {getImageUrl(user?.profile?.profilePicture) ? (
              <Image
                source={{ uri: getImageUrl(user!.profile.profilePicture)! }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImage}>
                <Ionicons name="person" size={40} color="#2196F3" />
              </View>
            )}
            {isUploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{user?.profile?.fullName || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@email.com'}</Text>
          <Text style={styles.profileBio}>
            {user?.userType === 'vendor'
              ? `Fitness Academy Owner - ${user?.profile?.academyName || 'Academy'}`
              : ''}
          </Text>
          {user?.profile?.rating && user.profile.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{user.profile.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuAction(item.action)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={24} color={item.color || '#666'} />
                <Text style={[styles.menuItemText, item.color && { color: item.color }]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Calendar App v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              placeholder="Full Name"
              value={editFullName}
              onChangeText={setEditFullName}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Phone"
              value={editPhone}
              onChangeText={setEditPhone}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Location"
              value={editLocation}
              onChangeText={setEditLocation}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            {user?.userType === 'vendor' && (
              <TextInput
                placeholder="Academy Name"
                value={editAcademyName}
                onChangeText={setEditAcademyName}
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={updateProfile}
                style={[styles.modalButton, styles.saveButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              placeholder="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsPasswordModalVisible(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={changePassword}
                style={[styles.modalButton, styles.saveButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Change</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  content: { flex: 1 },
  profileSection: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  profileImageContainer: { position: 'relative', marginBottom: 16 },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ratingText: { marginLeft: 4, fontSize: 14, fontWeight: '600', color: '#FFD700' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  profileEmail: { fontSize: 16, color: '#666', marginBottom: 8 },
  profileBio: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  menuSection: { paddingVertical: 20 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 16, color: '#000', marginLeft: 12 },
  versionSection: { alignItems: 'center', paddingVertical: 30 },
  versionText: { fontSize: 14, color: '#999' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
    textAlign: 'center',
  },
  input: StyleSheet.flatten([
    {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      color: '#111827',
      fontSize: 16,
    },
    { placeholderTextColor: '#9CA3AF' } as TextInputProps['style'],
  ]),
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  saveButton: { backgroundColor: '#EF4444' },
  cancelButtonText: { color: '#374151', fontWeight: '600', fontSize: 16 },
  saveButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});