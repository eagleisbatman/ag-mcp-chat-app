/**
 * Theme Context
 * Manages theme mode (light/dark/system) and provides computed theme object
 * Can be used independently or composed into AppContext
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PropTypes from 'prop-types';
import { THEMES } from '../constants/themes';

const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 * Handles theme persistence and system preference tracking
 */
export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [isLoading, setIsLoading] = useState(true);

  // Computed theme based on mode and system preference
  const theme = useMemo(() => {
    if (themeMode === 'system') {
      return THEMES[systemColorScheme || 'light'];
    }
    return THEMES[themeMode];
  }, [themeMode, systemColorScheme]);

  // Is dark mode active?
  const isDark = theme.name === 'dark';

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      // Silently fail - use default
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update theme mode and persist to storage
   * @param {'light' | 'dark' | 'system'} mode - New theme mode
   */
  const saveThemeMode = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      // Silently fail - theme still works for current session
    }
  };

  const value = useMemo(() => ({
    theme,
    themeMode,
    isDark,
    saveThemeMode,
    isLoading,
  }), [theme, themeMode, isDark, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to access theme context
 * @returns Theme context value
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
