import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { registerUser, updatePreferences, saveLocation as saveLocationToDB, lookupLocation } from '../services/db';
import { THEMES, ThemeColors } from '../constants/themes';
import { setLocale, loadTranslations, t } from '../constants/strings';
import { isRTLLanguage, Language } from '../constants/languages';
import { log, error as logError, warn } from '../utils/logger';
import { LocationDetails, ThemeMode } from '../types';

// Re-export THEMES for backward compatibility
export { THEMES };

// Types
interface LocationCoords {
  latitude: number | null;
  longitude: number | null;
}

type LocationStatus = 'pending' | 'granted' | 'denied';

interface AppContextValue {
  // Theme
  theme: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  
  // Language
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  
  // Location
  location: LocationCoords;
  locationStatus: LocationStatus;
  locationDetails: LocationDetails | null;
  setLocation: (loc: LocationCoords, status: LocationStatus) => Promise<void>;
  
  // Onboarding
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  // User & Session
  userId: string | null;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  isDbSynced: boolean;
  
  // Sync status
  lastSyncError: string | null;
  clearSyncError: () => void;
  
  // Loading
  isLoading: boolean;
}

interface AppProviderProps {
  children: ReactNode;
}

interface LocationLookupResult {
  success: boolean;
  source?: 'gps' | 'ip' | 'manual';
  displayName?: string;
  level1Country?: string;
  level1CountryCode?: string;
  level2State?: string;
  level3District?: string;
  level4SubDistrict?: string;
  level5City?: string;
  level6Locality?: string;
  formattedAddress?: string;
  city?: string;
  district?: string;
  state?: string;
  regionName?: string;
  country?: string;
  error?: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: AppProviderProps): JSX.Element => {
  const systemColorScheme = useColorScheme();
  
  // State
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<Language>({ code: 'en', name: 'English', nativeName: 'English', region: 'Europe' });
  const [location, setLocationState] = useState<LocationCoords>({ latitude: null, longitude: null });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isDbSynced, setIsDbSynced] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Computed theme
  const theme: ThemeColors = themeMode === 'system' 
    ? THEMES[(systemColorScheme as 'light' | 'dark') || 'light']
    : THEMES[themeMode as 'light' | 'dark'];

  // Sync user with backend (runs in background)
  const registerUserInBackground = async (): Promise<void> => {
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
      log('❌ [AppContext] Background user sync failed:', (error as Error).message);
      setLastSyncError('Could not connect to server. Some features may be limited.');
    }
  };

  // Helper to sync location to DB with retry
  const syncLocationToDb = async (
    locationResult: LocationLookupResult | LocationDetails, 
    latitude: number, 
    longitude: number, 
    retryCount = 0
  ): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    if (!userId && retryCount < maxRetries) {
      log(`⏳ [AppContext] Waiting for user registration... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return syncLocationToDb(locationResult, latitude, longitude, retryCount + 1);
    }
    
    if (!userId) {
      log('⚠️ [AppContext] Could not sync location - user not registered after retries');
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
      log('❌ [AppContext] DB location sync error:', (error as Error).message);
    }
  };

  // Sync any pending location that was captured before registration completed
  const syncPendingLocation = async (): Promise<void> => {
    try {
      const pendingStr = await AsyncStorage.getItem('pendingLocationSync');
      if (!pendingStr) return;
      
      const pending = JSON.parse(pendingStr);
      const ageMs = Date.now() - pending.timestamp;
      
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

  // Fetch L1-L6 location details from API Gateway
  const lookupLocationDetails = async (latitude: number, longitude: number): Promise<void> => {
    log('🌍 [AppContext] Looking up location details for:', { latitude, longitude });

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      log('❌ [AppContext] Invalid coordinates, skipping lookup');
      return;
    }

    try {
      log('🌍 [AppContext] Calling lookupLocation API...');
      const result = await lookupLocation(latitude, longitude) as LocationLookupResult;
      log('🌍 [AppContext] Location lookup result:', {
        success: result.success,
        displayName: result.displayName,
        country: result.level1Country,
        city: result.level5City,
        error: result.error
      });

      if (result.success && (result.displayName || result.level1Country)) {
        const normalizedResult: LocationDetails = {
          ...result,
          latitude,
          longitude,
          displayName: result.displayName || result.level5City || result.level3District || result.level2State || result.level1Country || 'Location set',
          level5City: result.level5City || result.city,
          level3District: result.level3District || result.district,
          level2State: result.level2State || result.state || result.regionName,
          level1Country: result.level1Country || result.country,
          source: (result.source as LocationDetails['source']) || 'gps',
        };

        log('✅ [AppContext] Location found via', result.source, ':', normalizedResult.displayName);
        setLocationDetails(normalizedResult);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(normalizedResult));
        log('✅ [AppContext] Location details saved to storage');

        await syncLocationToDb(normalizedResult, latitude, longitude);
      } else {
        log('⚠️ [AppContext] Location lookup returned no useful data:', result.error || 'no displayName');
        const basicLocation: LocationDetails = {
          latitude,
          longitude,
          displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          source: 'gps',
        };
        setLocationDetails(basicLocation);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(basicLocation));
      }
    } catch (error) {
      log('❌ [AppContext] Location lookup exception:', (error as Error).message);
      const basicLocation: LocationDetails = {
        latitude,
        longitude,
        displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        source: 'gps',
      };
      setLocationDetails(basicLocation);
      await AsyncStorage.setItem('locationDetails', JSON.stringify(basicLocation));
    }
  };

  // Load saved preferences on mount
  const loadPreferences = async (): Promise<void> => {
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

      if (savedTheme) setThemeModeState(savedTheme as ThemeMode);
      if (savedLanguage) {
        const lang = JSON.parse(savedLanguage) as Language;
        setLanguageState(lang);
        setLocale(lang.code);
        await loadTranslations(lang.code);

        const needsRTL = isRTLLanguage(lang.code);
        if (I18nManager.isRTL !== needsRTL) {
          log(`🔄 [AppContext] Correcting RTL setting on startup: ${I18nManager.isRTL} → ${needsRTL}`);
          I18nManager.allowRTL(needsRTL);
          I18nManager.forceRTL(needsRTL);
        }
      }
      if (savedOnboarding === 'true') setOnboardingComplete(true);
      if (savedLocation) {
        const loc = JSON.parse(savedLocation) as LocationCoords;
        setLocationState(loc);
        setLocationStatus('granted');

        const parsedDetails = savedLocationDetails ? JSON.parse(savedLocationDetails) as LocationDetails : null;
        if (parsedDetails?.displayName) {
          setLocationDetails(parsedDetails);
          log('📱 [AppContext] Loaded cached location details:', parsedDetails.displayName);
        } else if (loc.latitude && loc.longitude) {
          log('📱 [AppContext] No cached location details, triggering lookup...');
          lookupLocationDetails(loc.latitude, loc.longitude);
        }
      } else if (savedLocationDetails) {
        setLocationDetails(JSON.parse(savedLocationDetails) as LocationDetails);
      }

      registerUserInBackground();
    } catch (error) {
      log('❌ [AppContext] Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const saveThemeMode = async (mode: ThemeMode): Promise<void> => {
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

  // Helper to sync language to DB with retry
  const syncLanguageToDb = async (lang: Language, retryCount = 0): Promise<void> => {
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

  const saveLanguage = async (lang: Language): Promise<void> => {
    log('🌐 [AppContext] Saving language:', lang.name, `(${lang.code})`);
    setLanguageState(lang);

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

    const needsRTL = isRTLLanguage(lang.code);
    const currentlyRTL = I18nManager.isRTL;

    if (needsRTL !== currentlyRTL) {
      log(`🔄 [AppContext] RTL change needed: ${currentlyRTL} → ${needsRTL}`);

      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);

      try {
        await AsyncStorage.setItem('isRTL', JSON.stringify(needsRTL));
      } catch (e) {
        log('❌ [AppContext] Could not save RTL preference:', e);
      }

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
                Alert.alert(t('system.pleaseRestart'), t('system.pleaseRestartMessage'));
              }
            },
          },
        ],
        { cancelable: false }
      );
    }

    syncLanguageToDb(lang);
  };

  const saveLocation = async (loc: LocationCoords, status: LocationStatus): Promise<void> => {
    log('📍 [AppContext] Saving location:', { loc, status });
    setLocationState(loc);
    setLocationStatus(status);
    if (status === 'granted' && loc?.latitude && loc?.longitude) {
      try {
        await AsyncStorage.setItem('location', JSON.stringify(loc));
        log('✅ [AppContext] Location saved to AsyncStorage');
      } catch (e) {
        log('❌ [AppContext] AsyncStorage write error (location):', e);
      }
      
      log('🔍 [AppContext] Starting location lookup...');
      lookupLocationDetails(loc.latitude, loc.longitude);
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    log('🎉 [AppContext] Completing onboarding...');
    setOnboardingComplete(true);
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      log('✅ [AppContext] Onboarding status saved');
    } catch (e) {
      log('❌ [AppContext] AsyncStorage write error (onboarding):', e);
    }
  };

  const resetOnboarding = async (): Promise<void> => {
    setOnboardingComplete(false);
    try {
      await AsyncStorage.removeItem('onboardingComplete');
    } catch (e) {
      log('AsyncStorage remove error (onboarding):', e);
    }
  };

  const clearSyncError = (): void => setLastSyncError(null);

  const value: AppContextValue = {
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

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;
