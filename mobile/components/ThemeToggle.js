import React from 'react';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import IconButton from './ui/IconButton';

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
    <IconButton
      icon={getIcon()}
      onPress={toggleTheme}
      size={36}
      borderRadius={0}
      backgroundColor="transparent"
      color={theme.accent}
      style={style}
      accessibilityLabel={`Theme: ${themeMode}`}
    />
  );
}
