import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { registerUser, updatePreferences, saveLocation as saveLocationToDB, lookupLocation } from '../services/db';
import { THEMES } from '../constants/themes';
import { setLocale, loadTranslations, t } from '../constants/strings';
import { isRTLLanguage } from '../constants/languages';
import { log, error as logError, warn } from '../utils/logger';

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
  const [lastSyncError, setLastSyncError] = useState(null); // Track sync errors for UI display

  // Computed theme
  const theme = themeMode === 'system' 
    ? THEMES[systemColorScheme || 'light']
    : THEMES[themeMode];

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    log('📱 [AppContext] Loading preferences from AsyncStorage...');
    try {
      const [savedTheme, savedLanguage, savedOnboarding, savedLocation, savedLocationDetails] = await Promise.all([
        AsyncStorage.getItem('themeMode'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('onboardingComplete'),
        AsyncStorage.getItem('location'),
        AsyncStorage.getItem('locationDetails'),
      ]);

      log('📱 [AppContext] Loaded from AsyncStorage:', {
        themeMode: savedTheme,
        language: savedLanguage ? 'set' : 'not set',
        onboardingComplete: savedOnboarding,
        location: savedLocation ? 'set' : 'not set',
        locationDetails: savedLocationDetails ? 'set' : 'not set',
      });

      if (savedTheme) setThemeMode(savedTheme);
      if (savedLanguage) {
        const lang = JSON.parse(savedLanguage);
        setLanguage(lang);
        // Load translations for saved language
        setLocale(lang.code);
        await loadTranslations(lang.code);

        // Ensure RTL setting is correct for saved language
        const needsRTL = isRTLLanguage(lang.code);
        if (I18nManager.isRTL !== needsRTL) {
          log(`🔄 [AppContext] Correcting RTL setting on startup: ${I18nManager.isRTL} → ${needsRTL}`);
          I18nManager.allowRTL(needsRTL);
          I18nManager.forceRTL(needsRTL);
        }
      }
      if (savedOnboarding === 'true') setOnboardingComplete(true);
      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setLocation(loc);
        setLocationStatus('granted');

        // Check if we have valid location details, if not trigger a lookup
        const parsedDetails = savedLocationDetails ? JSON.parse(savedLocationDetails) : null;
        if (parsedDetails && parsedDetails.displayName) {
          setLocationDetails(parsedDetails);
          log('📱 [AppContext] Loaded cached location details:', parsedDetails.displayName);
        } else if (loc.latitude && loc.longitude) {
          // No valid cached details, trigger a fresh lookup
          log('📱 [AppContext] No cached location details, triggering lookup...');
          lookupLocationDetails(loc.latitude, loc.longitude);
        }
      } else if (savedLocationDetails) {
        // Legacy case: have details but no location (shouldn't happen)
        setLocationDetails(JSON.parse(savedLocationDetails));
      }

      // Register user with backend (non-blocking)
      registerUserInBackground();
    } catch (error) {
      log('❌ [AppContext] Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync user with backend (runs in background)
  const registerUserInBackground = async () => {
    log('📱 [AppContext] Syncing user with backend...');
    try {
      const result = await registerUser();
      if (result.success && result.userId) {
        setUserId(result.userId);
        setIsDbSynced(true);
        log('✅ [AppContext] User synced, userId:', result.userId);
        
        // Check for pending location sync
        await syncPendingLocation();
      } else {
        log('⚠️ [AppContext] Sync returned but no userId:', result);
      }
    } catch (error) {
      log('❌ [AppContext] Background user sync failed:', error.message);
      setLastSyncError('Could not connect to server. Some features may be limited.');
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
        log('🔄 [AppContext] Found pending location sync, processing...');
        await syncLocationToDb(pending.locationResult, pending.latitude, pending.longitude);
        await AsyncStorage.removeItem('pendingLocationSync');
        log('✅ [AppContext] Pending location synced and cleared');
      } else {
        log('⏰ [AppContext] Pending location too old, discarding');
        await AsyncStorage.removeItem('pendingLocationSync');
      }
    } catch (error) {
      log('❌ [AppContext] Error processing pending location:', error);
    }
  };

  const saveThemeMode = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (e) {
      log('AsyncStorage write error (theme):', e);
    }
    
    // Sync to DB (non-blocking)
    if (isDbSynced) {
      updatePreferences({ themeMode: mode }).catch(e => log('DB sync error:', e));
    }
  };

  const saveLanguage = async (lang) => {
    log('🌐 [AppContext] Saving language:', lang.name, `(${lang.code})`);
    setLanguage(lang);

    // Load translations for the selected language
    try {
      setLocale(lang.code);
      await loadTranslations(lang.code);
      log('✅ [AppContext] Translations loaded for:', lang.code);
    } catch (e) {
      log('⚠️ [AppContext] Could not load translations for:', lang.code, e);
    }

    try {
      await AsyncStorage.setItem('language', JSON.stringify(lang));
      log('✅ [AppContext] Language saved to AsyncStorage');
    } catch (e) {
      log('❌ [AppContext] AsyncStorage write error (language):', e);
    }

    // Handle RTL layout changes
    const needsRTL = isRTLLanguage(lang.code);
    const currentlyRTL = I18nManager.isRTL;

    if (needsRTL !== currentlyRTL) {
      log(`🔄 [AppContext] RTL change needed: ${currentlyRTL} → ${needsRTL}`);

      // Apply RTL setting
      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);

      // Store RTL preference for next app launch
      try {
        await AsyncStorage.setItem('isRTL', JSON.stringify(needsRTL));
      } catch (e) {
        log('❌ [AppContext] Could not save RTL preference:', e);
      }

      // App needs to reload for RTL changes to take effect
      // Show alert and reload
      Alert.alert(
        t('system.restartRequired'),
        t('system.restartRequiredMessage', { language: lang.name }),
        [
          {
            text: t('system.restartNow'),
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (e) {
                log('⚠️ [AppContext] Could not reload app:', e);
                // Fallback message if reload fails (dev mode)
                Alert.alert(t('system.pleaseRestart'), t('system.pleaseRestartMessage'));
              }
            },
          },
        ],
        { cancelable: false }
      );
    }

    // Sync to DB with retry if not yet synced
    syncLanguageToDb(lang);
  };

  // Helper to sync language to DB with retry
  const syncLanguageToDb = async (lang, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    if (!userId && retryCount < maxRetries) {
      log(`⏳ [AppContext] Waiting for user registration for language sync... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return syncLanguageToDb(lang, retryCount + 1);
    }
    
    if (!userId) {
      log('⚠️ [AppContext] Could not sync language - user not registered');
      return;
    }
    
    log('💾 [AppContext] Syncing language to database...');
    try {
      const result = await updatePreferences({
        languageCode: lang.code,
        languageName: lang.name,
        languageNativeName: lang.nativeName,
      });
      log('💾 [AppContext] Language DB sync:', result.success ? 'Success' : result.error);
    } catch (e) {
      log('❌ [AppContext] Language DB sync error:', e);
    }
  };

  const saveLocation = async (loc, status) => {
    log('📍 [AppContext] Saving location:', { loc, status });
    setLocation(loc);
    setLocationStatus(status);
    if (status === 'granted' && loc?.latitude && loc?.longitude) {
      try {
        await AsyncStorage.setItem('location', JSON.stringify(loc));
        log('✅ [AppContext] Location saved to AsyncStorage');
      } catch (e) {
        log('❌ [AppContext] AsyncStorage write error (location):', e);
      }
      
      // Lookup detailed location in background
      log('🔍 [AppContext] Starting location lookup...');
      lookupLocationDetails(loc.latitude, loc.longitude);
    }
  };

  // Fetch L1-L6 location details from API Gateway (Nominatim/IP-API)
  const lookupLocationDetails = async (latitude, longitude) => {
    log('🌍 [AppContext] Looking up location details for:', { latitude, longitude });

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      log('❌ [AppContext] Invalid coordinates, skipping lookup');
      return;
    }

    try {
      log('🌍 [AppContext] Calling lookupLocation API...');
      const result = await lookupLocation(latitude, longitude);
      log('🌍 [AppContext] Location lookup result:', {
        success: result.success,
        displayName: result.displayName,
        country: result.level1Country,
        city: result.level5City,
        error: result.error
      });

      if (result.success && (result.displayName || result.level1Country)) {
        // Create a normalized result with fallbacks
        const normalizedResult = {
          ...result,
          displayName: result.displayName || result.level5City || result.level3District || result.level2State || result.level1Country || 'Location set',
          level5City: result.level5City || result.city || null,
          level3District: result.level3District || result.district || null,
          level2State: result.level2State || result.state || result.regionName || null,
          level1Country: result.level1Country || result.country || null,
        };

        log('✅ [AppContext] Location found via', result.source, ':', normalizedResult.displayName);
        setLocationDetails(normalizedResult);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(normalizedResult));
        log('✅ [AppContext] Location details saved to storage');

        // Sync to DB - with retry if not yet synced
        await syncLocationToDb(normalizedResult, latitude, longitude);
      } else {
        // Lookup returned but no useful data
        log('⚠️ [AppContext] Location lookup returned no useful data:', result.error || 'no displayName');
        const basicLocation = {
          success: true,
          source: 'gps',
          latitude,
          longitude,
          displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          level5City: null,
          level3District: null,
          level2State: null,
          level1Country: null,
        };
        setLocationDetails(basicLocation);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(basicLocation));
      }
    } catch (error) {
      log('❌ [AppContext] Location lookup exception:', error.message);
      // Still set basic coords on error so UI has something to show
      const basicLocation = {
        success: true,
        source: 'gps',
        latitude,
        longitude,
        displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      };
      setLocationDetails(basicLocation);
      await AsyncStorage.setItem('locationDetails', JSON.stringify(basicLocation));
    }
  };

  // Helper to sync location to DB with retry
  const syncLocationToDb = async (locationResult, latitude, longitude, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    // Check if we have a userId (from registration)
    const currentUserId = userId;
    
    if (!currentUserId && retryCount < maxRetries) {
      log(`⏳ [AppContext] Waiting for user registration... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Retry with incremented count - will pick up userId from state
      return syncLocationToDb(locationResult, latitude, longitude, retryCount + 1);
    }
    
    if (!currentUserId) {
      log('⚠️ [AppContext] Could not sync location - user not registered after retries');
      // Store pending location for later sync
      try {
        await AsyncStorage.setItem('pendingLocationSync', JSON.stringify({ 
          locationResult, latitude, longitude, timestamp: Date.now() 
        }));
        log('💾 [AppContext] Saved pending location for later sync');
      } catch (e) {
        log('❌ [AppContext] Failed to save pending location:', e);
      }
      return;
    }
    
    log('💾 [AppContext] Syncing location to database...');
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
      log('💾 [AppContext] DB sync result:', dbResult.success ? 'Success' : dbResult.error);
    } catch (error) {
      log('❌ [AppContext] DB location sync error:', error.message);
    }
  };

  const completeOnboarding = async () => {
    log('🎉 [AppContext] Completing onboarding...');
    setOnboardingComplete(true);
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      log('✅ [AppContext] Onboarding status saved');
    } catch (e) {
      log('❌ [AppContext] AsyncStorage write error (onboarding):', e);
    }
  };

  const resetOnboarding = async () => {
    setOnboardingComplete(false);
    try {
      await AsyncStorage.removeItem('onboardingComplete');
    } catch (e) {
      log('AsyncStorage remove error (onboarding):', e);
    }
  };

  const clearSyncError = () => setLastSyncError(null);

  const value = {
    theme, themeMode, setThemeMode: saveThemeMode, isDark: theme.name === 'dark',
    language, setLanguage: saveLanguage,
    location, locationStatus, locationDetails, setLocation: saveLocation,
    onboardingComplete, completeOnboarding, resetOnboarding,
    userId, currentSessionId, setCurrentSessionId, isDbSynced,
    lastSyncError, clearSyncError,
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

