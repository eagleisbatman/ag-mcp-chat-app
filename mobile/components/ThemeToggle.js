import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';

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
    return 'contrast-outline'; // system - better icon
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surfaceVariant }, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons name={getIcon()} size={22} color={theme.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});

