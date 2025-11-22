import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface SnackbarContextType {
  snackbar: {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  };
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  hideSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });
  const [fadeAnim] = useState(new Animated.Value(0));

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
    setSnackbar({ visible: true, message, type });
    
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto hide after 3 seconds
    setTimeout(() => {
      hideSnackbar();
    }, 3000);
  };

  const hideSnackbar = () => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setSnackbar({ visible: false, message: '', type: 'info' });
    });
  };

  const showSuccess = (message: string) => showSnackbar(message, 'success');
  const showError = (message: string) => showSnackbar(message, 'error');
  const showInfo = (message: string) => showSnackbar(message, 'info');

  const getBackgroundColor = () => {
    switch (snackbar.type) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'info':
        return '#3B82F6';
      default:
        return '#3B82F6';
    }
  };

  return (
    <SnackbarContext.Provider
      value={{
        snackbar,
        showSuccess,
        showError,
        showInfo,
        hideSnackbar,
      }}
    >
      {children}
      {snackbar.visible && (
        <Animated.View
          style={[
            styles.snackbar,
            {
              backgroundColor: getBackgroundColor(),
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </Animated.View>
      )}
    </SnackbarContext.Provider>
  );
};

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
  },
  snackbarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
