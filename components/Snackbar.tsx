import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SnackbarProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  onHide: () => void;
  duration?: number;
}

const { width } = Dimensions.get('window');

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  type,
  onHide,
  duration = 6000,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = new Animated.Value(-200);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: Math.max(insets.top + 10, 60), // Ensure minimum 60px from top
        useNativeDriver: false, // Changed to false to allow top positioning
        tension: 100,
        friction: 8,
      }).start();

      const timer = setTimeout(() => {
        hideSnackbar();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideSnackbar();
    }
  }, [visible, duration, insets.top]);

  const hideSnackbar = () => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 300,
      useNativeDriver: false, // Changed to false to allow top positioning
    }).start(() => {
      onHide();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'info':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: translateY,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={getIcon()}
          size={20}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideSnackbar} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});


