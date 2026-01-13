import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, ThemeColors } from '../../constants/themes';
import { ThemeMode } from '../../types';
import { updatePreferences } from '../../services/db';
import { log } from '../../utils/logger';

interface ThemeContextValue {
  theme: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children, isDbSynced }: { children: ReactNode; isDbSynced: boolean }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  const theme: ThemeColors = themeMode === 'system' 
    ? THEMES[(systemColorScheme as 'light' | 'dark') || 'light']
    : THEMES[themeMode as 'light' | 'dark'];

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme) setThemeModeState(savedTheme as ThemeMode);
      } catch (e) {
        log('Error loading theme:', e);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (e) {
      log('AsyncStorage write error (theme):', e);
    }
    
    if (isDbSynced) {
      updatePreferences({ themeMode: mode }).catch(e => log('DB sync error:', e));
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark: theme.name === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
