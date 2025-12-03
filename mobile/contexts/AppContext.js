import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme colors
export const THEMES = {
  light: {
    name: 'light',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#666666',
    textMuted: '#999999',
    accent: '#2E7D32',
    accentLight: '#E8F5E9',
    border: '#E0E0E0',
    userMessage: '#F0F0F0',
    botMessage: '#FFFFFF',
    inputBackground: '#F5F5F5',
    statusBar: 'dark',
  },
  dark: {
    name: 'dark',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2A2A2A',
    text: '#E0E0E0',
    textSecondary: '#AAAAAA',
    textMuted: '#777777',
    accent: '#81C784',
    accentLight: '#1B3D1C',
    border: '#333333',
    userMessage: '#2A2A2A',
    botMessage: '#1E1E1E',
    inputBackground: '#2A2A2A',
    statusBar: 'light',
  },
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  // State
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [language, setLanguage] = useState({ code: 'en', name: 'English', nativeName: 'English' });
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationStatus, setLocationStatus] = useState('pending'); // 'pending', 'granted', 'denied'
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Computed theme
  const theme = themeMode === 'system' 
    ? THEMES[systemColorScheme || 'light']
    : THEMES[themeMode];

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [savedTheme, savedLanguage, savedOnboarding, savedLocation] = await Promise.all([
        AsyncStorage.getItem('themeMode'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('onboardingComplete'),
        AsyncStorage.getItem('location'),
      ]);

      if (savedTheme) setThemeMode(savedTheme);
      if (savedLanguage) setLanguage(JSON.parse(savedLanguage));
      if (savedOnboarding === 'true') setOnboardingComplete(true);
      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setLocation(loc);
        setLocationStatus('granted');
      }
    } catch (error) {
      console.log('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemeMode = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  const saveLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', JSON.stringify(lang));
  };

  const saveLocation = async (loc, status) => {
    setLocation(loc);
    setLocationStatus(status);
    if (status === 'granted') {
      await AsyncStorage.setItem('location', JSON.stringify(loc));
    }
  };

  const completeOnboarding = async () => {
    setOnboardingComplete(true);
    await AsyncStorage.setItem('onboardingComplete', 'true');
  };

  const resetOnboarding = async () => {
    setOnboardingComplete(false);
    await AsyncStorage.removeItem('onboardingComplete');
  };

  const value = {
    // Theme
    theme,
    themeMode,
    setThemeMode: saveThemeMode,
    isDark: theme.name === 'dark',
    
    // Language
    language,
    setLanguage: saveLanguage,
    
    // Location
    location,
    locationStatus,
    setLocation: saveLocation,
    
    // Onboarding
    onboardingComplete,
    completeOnboarding,
    resetOnboarding,
    
    // Loading
    isLoading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;

