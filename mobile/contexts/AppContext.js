import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser, updatePreferences, saveLocation as saveLocationToDB, lookupLocation } from '../services/db';
import { THEMES } from '../constants/themes';

// Re-export THEMES for backward compatibility
export { THEMES };

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  // State
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [language, setLanguage] = useState({ code: 'en', name: 'English', nativeName: 'English' });
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationStatus, setLocationStatus] = useState('pending'); // 'pending', 'granted', 'denied'
  const [locationDetails, setLocationDetails] = useState(null); // L1-L6 location data
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isDbSynced, setIsDbSynced] = useState(false);

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
      const [savedTheme, savedLanguage, savedOnboarding, savedLocation, savedLocationDetails] = await Promise.all([
        AsyncStorage.getItem('themeMode'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('onboardingComplete'),
        AsyncStorage.getItem('location'),
        AsyncStorage.getItem('locationDetails'),
      ]);

      if (savedTheme) setThemeMode(savedTheme);
      if (savedLanguage) setLanguage(JSON.parse(savedLanguage));
      if (savedOnboarding === 'true') setOnboardingComplete(true);
      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setLocation(loc);
        setLocationStatus('granted');
      }
      if (savedLocationDetails) setLocationDetails(JSON.parse(savedLocationDetails));

      // Register user with backend (non-blocking)
      registerUserInBackground();
    } catch (error) {
      console.log('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Register user with backend (runs in background)
  const registerUserInBackground = async () => {
    try {
      const result = await registerUser();
      if (result.success && result.userId) {
        setUserId(result.userId);
        setIsDbSynced(true);
      }
    } catch (error) {
      console.log('Background user registration failed:', error);
      // App continues to work offline
    }
  };

  const saveThemeMode = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('themeMode', mode);
    
    // Sync to DB
    if (isDbSynced) {
      updatePreferences({ themeMode: mode }).catch(e => console.log('DB sync error:', e));
    }
  };

  const saveLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', JSON.stringify(lang));
    
    // Sync to DB
    if (isDbSynced) {
      updatePreferences({
        languageCode: lang.code,
        languageName: lang.name,
        languageNativeName: lang.nativeName,
      }).catch(e => console.log('DB sync error:', e));
    }
  };

  const saveLocation = async (loc, status) => {
    setLocation(loc);
    setLocationStatus(status);
    if (status === 'granted') {
      await AsyncStorage.setItem('location', JSON.stringify(loc));
      
      // Lookup detailed location in background
      lookupLocationDetails(loc.latitude, loc.longitude);
    }
  };

  // Fetch L1-L6 location details from n8n workflow
  const lookupLocationDetails = async (latitude, longitude) => {
    try {
      const result = await lookupLocation(latitude, longitude);
      if (result.success) {
        setLocationDetails(result);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(result));
        
        // Sync to DB
        if (isDbSynced) {
          await saveLocationToDB({
            source: result.source,
            latitude, longitude,
            level1Country: result.level1Country,
            level1CountryCode: result.level1CountryCode,
            level2State: result.level2State,
            level3District: result.level3District,
            level4SubDistrict: result.level4SubDistrict,
            level5City: result.level5City,
            level6Locality: result.level6Locality,
            displayName: result.displayName,
            formattedAddress: result.formattedAddress,
            isPrimary: true,
          });
        }
      }
    } catch (error) {
      console.log('Location lookup failed:', error);
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
    theme, themeMode, setThemeMode: saveThemeMode, isDark: theme.name === 'dark',
    language, setLanguage: saveLanguage,
    location, locationStatus, locationDetails, setLocation: saveLocation,
    onboardingComplete, completeOnboarding, resetOnboarding,
    userId, currentSessionId, setCurrentSessionId, isDbSynced,
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

