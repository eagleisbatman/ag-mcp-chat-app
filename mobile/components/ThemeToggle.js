import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING } from '../constants/themes';

export default function ThemeToggle({ style }) {
  const { theme, themeMode, setThemeMode } = useApp();

  const toggleTheme = () => {
    Haptics.selectionAsync();
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  const getIcon = () => {
    if (themeMode === 'light') return 'sunny';
    if (themeMode === 'dark') return 'moon';
    return 'contrast-outline'; // system
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surfaceVariant }, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons name={getIcon()} size={20} color={theme.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SPACING.iconButtonSize,
    height: SPACING.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SPACING.iconButtonSize / 2,
  },
});

