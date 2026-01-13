import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import IconButton from './ui/IconButton';
import { t } from '../constants/strings';

interface ThemeToggleProps {
  style?: StyleProp<ViewStyle>;
}

export default function ThemeToggle({ style }: ThemeToggleProps): JSX.Element {
  const { theme, themeMode, setThemeMode } = useApp();

  const toggleTheme = (): void => {
    Haptics.selectionAsync();
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  const getIcon = (): string => {
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
      accessibilityLabel={t('a11y.themeMode', { mode: themeMode })}
    />
  );
}
