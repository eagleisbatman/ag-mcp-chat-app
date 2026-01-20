import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser } from '../../services/db';
import { log } from '../../utils/logger';

const SERVICE_PREFS_KEY = '@service_preferences';

interface UserContextValue {
  userId: string | null;
  isDbSynced: boolean;
  lastSyncError: string | null;
  clearSyncError: () => void;
  isLoadingUser: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isDbSynced, setIsDbSynced] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const register = async () => {
    try {
      const result = await registerUser();
      if (result.success && result.userId) {
        setUserId(result.userId);
        setIsDbSynced(true);

        // Sync servicePreferences from backend to AsyncStorage
        // This ensures new users get country-based defaults from the server
        const servicePreferences = result.user?.preferences?.servicePreferences;
        if (servicePreferences && typeof servicePreferences === 'object') {
          try {
            // Only sync if we have valid preferences from the server
            const existingPrefs = await AsyncStorage.getItem(SERVICE_PREFS_KEY);
            if (!existingPrefs) {
              // No local preferences, use server defaults
              log('[UserContext] Syncing servicePreferences from server:', servicePreferences);
              await AsyncStorage.setItem(SERVICE_PREFS_KEY, JSON.stringify(servicePreferences));
            }
          } catch (prefError) {
            log('[UserContext] Failed to sync servicePreferences:', prefError);
          }
        }
      }
    } catch (e) {
      setLastSyncError('Could not connect to server. Some features may be limited.');
      log('User sync failed:', e);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    register();
  }, []);

  return (
    <UserContext.Provider value={{ 
      userId, 
      isDbSynced, 
      lastSyncError, 
      clearSyncError: () => setLastSyncError(null),
      isLoadingUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
