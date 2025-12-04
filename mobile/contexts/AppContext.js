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
    console.log('📱 [AppContext] Loading preferences from AsyncStorage...');
    try {
      const [savedTheme, savedLanguage, savedOnboarding, savedLocation, savedLocationDetails] = await Promise.all([
        AsyncStorage.getItem('themeMode'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('onboardingComplete'),
        AsyncStorage.getItem('location'),
        AsyncStorage.getItem('locationDetails'),
      ]);

      console.log('📱 [AppContext] Loaded from AsyncStorage:', {
        themeMode: savedTheme,
        language: savedLanguage ? 'set' : 'not set',
        onboardingComplete: savedOnboarding,
        location: savedLocation ? 'set' : 'not set',
        locationDetails: savedLocationDetails ? 'set' : 'not set',
      });

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
      console.log('❌ [AppContext] Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Register user with backend (runs in background)
  const registerUserInBackground = async () => {
    console.log('📱 [AppContext] Starting user registration...');
    try {
      const result = await registerUser();
      console.log('📱 [AppContext] Registration result:', JSON.stringify(result, null, 2));
      if (result.success && result.userId) {
        setUserId(result.userId);
        setIsDbSynced(true);
        console.log('✅ [AppContext] User registered successfully, userId:', result.userId);
        
        // Check for pending location sync
        await syncPendingLocation();
      } else {
        console.log('⚠️ [AppContext] Registration returned but no userId:', result);
      }
    } catch (error) {
      console.log('❌ [AppContext] Background user registration failed:', error.message);
      // App continues to work offline
    }
  };

  // Sync any pending location that was captured before registration completed
  const syncPendingLocation = async () => {
    try {
      const pendingStr = await AsyncStorage.getItem('pendingLocationSync');
      if (!pendingStr) return;
      
      const pending = JSON.parse(pendingStr);
      const ageMs = Date.now() - pending.timestamp;
      
      // Only sync if less than 5 minutes old
      if (ageMs < 5 * 60 * 1000) {
        console.log('🔄 [AppContext] Found pending location sync, processing...');
        await syncLocationToDb(pending.locationResult, pending.latitude, pending.longitude);
        await AsyncStorage.removeItem('pendingLocationSync');
        console.log('✅ [AppContext] Pending location synced and cleared');
      } else {
        console.log('⏰ [AppContext] Pending location too old, discarding');
        await AsyncStorage.removeItem('pendingLocationSync');
      }
    } catch (error) {
      console.log('❌ [AppContext] Error processing pending location:', error);
    }
  };

  const saveThemeMode = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (e) {
      console.log('AsyncStorage write error (theme):', e);
    }
    
    // Sync to DB (non-blocking)
    if (isDbSynced) {
      updatePreferences({ themeMode: mode }).catch(e => console.log('DB sync error:', e));
    }
  };

  const saveLanguage = async (lang) => {
    console.log('🌐 [AppContext] Saving language:', lang.name, `(${lang.code})`);
    setLanguage(lang);
    try {
      await AsyncStorage.setItem('language', JSON.stringify(lang));
      console.log('✅ [AppContext] Language saved to AsyncStorage');
    } catch (e) {
      console.log('❌ [AppContext] AsyncStorage write error (language):', e);
    }
    
    // Sync to DB with retry if not yet synced
    syncLanguageToDb(lang);
  };

  // Helper to sync language to DB with retry
  const syncLanguageToDb = async (lang, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    if (!userId && retryCount < maxRetries) {
      console.log(`⏳ [AppContext] Waiting for user registration for language sync... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return syncLanguageToDb(lang, retryCount + 1);
    }
    
    if (!userId) {
      console.log('⚠️ [AppContext] Could not sync language - user not registered');
      return;
    }
    
    console.log('💾 [AppContext] Syncing language to database...');
    try {
      const result = await updatePreferences({
        languageCode: lang.code,
        languageName: lang.name,
        languageNativeName: lang.nativeName,
      });
      console.log('💾 [AppContext] Language DB sync:', result.success ? 'Success' : result.error);
    } catch (e) {
      console.log('❌ [AppContext] Language DB sync error:', e);
    }
  };

  const saveLocation = async (loc, status) => {
    console.log('📍 [AppContext] Saving location:', { loc, status });
    setLocation(loc);
    setLocationStatus(status);
    if (status === 'granted' && loc?.latitude && loc?.longitude) {
      try {
        await AsyncStorage.setItem('location', JSON.stringify(loc));
        console.log('✅ [AppContext] Location saved to AsyncStorage');
      } catch (e) {
        console.log('❌ [AppContext] AsyncStorage write error (location):', e);
      }
      
      // Lookup detailed location in background
      console.log('🔍 [AppContext] Starting location lookup...');
      lookupLocationDetails(loc.latitude, loc.longitude);
    }
  };

  // Fetch L1-L6 location details from n8n workflow
  const lookupLocationDetails = async (latitude, longitude) => {
    console.log('🌍 [AppContext] Looking up location details for:', { latitude, longitude });
    try {
      const result = await lookupLocation(latitude, longitude);
      console.log('🌍 [AppContext] Location lookup result:', {
        success: result.success,
        source: result.source,
        country: result.level1Country,
        city: result.level5City,
        displayName: result.displayName,
      });
      
      if (result.success) {
        setLocationDetails(result);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(result));
        console.log('✅ [AppContext] Location details saved to AsyncStorage');
        
        // Sync to DB - with retry if not yet synced
        await syncLocationToDb(result, latitude, longitude);
      } else {
        console.log('⚠️ [AppContext] Location lookup failed:', result.error);
      }
    } catch (error) {
      console.log('❌ [AppContext] Location lookup failed:', error.message);
    }
  };

  // Helper to sync location to DB with retry
  const syncLocationToDb = async (locationResult, latitude, longitude, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    // Check if we have a userId (from registration)
    const currentUserId = userId;
    
    if (!currentUserId && retryCount < maxRetries) {
      console.log(`⏳ [AppContext] Waiting for user registration... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Retry with incremented count - will pick up userId from state
      return syncLocationToDb(locationResult, latitude, longitude, retryCount + 1);
    }
    
    if (!currentUserId) {
      console.log('⚠️ [AppContext] Could not sync location - user not registered after retries');
      // Store pending location for later sync
      try {
        await AsyncStorage.setItem('pendingLocationSync', JSON.stringify({ 
          locationResult, latitude, longitude, timestamp: Date.now() 
        }));
        console.log('💾 [AppContext] Saved pending location for later sync');
      } catch (e) {
        console.log('❌ [AppContext] Failed to save pending location:', e);
      }
      return;
    }
    
    console.log('💾 [AppContext] Syncing location to database...');
    try {
      const dbResult = await saveLocationToDB({
        source: locationResult.source,
        latitude, longitude,
        level1Country: locationResult.level1Country,
        level1CountryCode: locationResult.level1CountryCode,
        level2State: locationResult.level2State,
        level3District: locationResult.level3District,
        level4SubDistrict: locationResult.level4SubDistrict,
        level5City: locationResult.level5City,
        level6Locality: locationResult.level6Locality,
        displayName: locationResult.displayName,
        formattedAddress: locationResult.formattedAddress,
        isPrimary: true,
      });
      console.log('💾 [AppContext] DB sync result:', dbResult.success ? 'Success' : dbResult.error);
    } catch (error) {
      console.log('❌ [AppContext] DB location sync error:', error.message);
    }
  };

  const completeOnboarding = async () => {
    console.log('🎉 [AppContext] Completing onboarding...');
    setOnboardingComplete(true);
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      console.log('✅ [AppContext] Onboarding status saved');
    } catch (e) {
      console.log('❌ [AppContext] AsyncStorage write error (onboarding):', e);
    }
  };

  const resetOnboarding = async () => {
    setOnboardingComplete(false);
    try {
      await AsyncStorage.removeItem('onboardingComplete');
    } catch (e) {
      console.log('AsyncStorage remove error (onboarding):', e);
    }
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

