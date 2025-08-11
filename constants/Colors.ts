/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#EF4444';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Calendar App Specific Colors
export const CalendarColors = {
  primary: '#EF4444',
  secondary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  purple: '#9C27B0',
  pink: '#E91E63',
  gray: '#607D8B',
  
  // Event Colors
  eventColors: {
    football: '#4CAF50',
    gymnastics: '#2196F3',
    design: '#FF9800',
    testing: '#9C27B0',
    lunch: '#E91E63',
    meeting: '#607D8B',
  },
  
  // Background Colors
  background: '#FFFFFF',
  cardBackground: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#F0F0F0',
  
  // Text Colors
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Status Colors
  status: {
    upcoming: '#2196F3',
    completed: '#4CAF50',
    cancelled: '#F44336',
  },
};
