import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

export default function ThemeToggle({ style }) {
  const { theme, themeMode, setThemeMode, isDark } = useApp();

  const toggleTheme = () => {
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
    return 'phone-portrait-outline'; // system
  };

  const getLabel = () => {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'Auto';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surfaceVariant }, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons name={getIcon()} size={18} color={theme.accent} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});

