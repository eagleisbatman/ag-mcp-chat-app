/**
 * Theme mode management hook
 * Handles theme persistence and system theme detection
 */
import { useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES } from '../constants/themes';

const STORAGE_KEY = 'themeMode';

export default function useThemeMode() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system');
  const [isLoading, setIsLoading] = useState(true);

  // Computed theme based on mode and system preference
  const theme = themeMode === 'system' 
    ? THEMES[systemColorScheme || 'light']
    : THEMES[themeMode];

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeModeState(saved);
      }
    } catch (e) {
      // Ignore load errors, use default
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = useCallback(async (mode) => {
    if (!['light', 'dark', 'system'].includes(mode)) return;
    
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      // Ignore save errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
  }, [themeMode, setThemeMode]);

  return {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    isLoading,
  };
}
