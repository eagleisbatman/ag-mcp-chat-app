/**
 * Hook for syncing location data with the backend database
 * Handles pending syncs when offline and retries when online
 */
import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveLocation as saveLocationToDB, updatePreferences } from '../services/db';
import { log, error as logError } from '../utils/logger';

const PENDING_SYNC_KEY = 'pendingLocationSync';

/**
 * useLocationSync hook
 * Provides methods for syncing location data with backend
 * 
 * @param {Object} options
 * @param {boolean} options.isDbSynced - Whether user is synced with DB
 * @param {string} options.userId - Current user ID
 * @param {string} options.languageCode - Current language code
 * @returns {Object} Location sync methods
 */
export default function useLocationSync({ isDbSynced, userId, languageCode }) {
  const isSyncingRef = useRef(false);

  /**
   * Sync location to database
   * @param {Object} locationResult - Result from location lookup
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   */
  const syncLocationToDb = useCallback(async (locationResult, latitude, longitude) => {
    if (!isDbSynced || !userId) {
      // Queue for later sync
      await queuePendingSync(locationResult, latitude, longitude);
      return { success: false, reason: 'not_synced' };
    }

    if (isSyncingRef.current) {
      log('🔄 [useLocationSync] Sync already in progress');
      return { success: false, reason: 'in_progress' };
    }

    isSyncingRef.current = true;

    try {
      const locationData = {
        latitude,
        longitude,
        displayName: locationResult?.displayName,
        level1Country: locationResult?.level1Country,
        level2State: locationResult?.level2State,
        level3District: locationResult?.level3District,
        level4SubDistrict: locationResult?.level4SubDistrict,
        level5City: locationResult?.level5City,
        level6Village: locationResult?.level6Village,
        source: locationResult?.source || 'gps',
      };

      const result = await saveLocationToDB(locationData);

      if (result.success) {
        log('✅ [useLocationSync] Location synced to DB');
        // Clear any pending sync
        await AsyncStorage.removeItem(PENDING_SYNC_KEY);
        return { success: true };
      } else {
        logError('❌ [useLocationSync] Location sync failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      logError('❌ [useLocationSync] Location sync error:', error);
      return { success: false, error: error.message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [isDbSynced, userId]);

  /**
   * Queue location sync for later (when offline)
   */
  const queuePendingSync = useCallback(async (locationResult, latitude, longitude) => {
    try {
      const pendingData = {
        locationResult,
        latitude,
        longitude,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingData));
      log('📝 [useLocationSync] Queued location for later sync');
    } catch (error) {
      logError('❌ [useLocationSync] Failed to queue sync:', error);
    }
  }, []);

  /**
   * Process any pending location sync
   * Call this when user becomes synced
   */
  const processPendingSync = useCallback(async () => {
    try {
      const pendingStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (!pendingStr) return null;

      const pending = JSON.parse(pendingStr);
      const ageMs = Date.now() - pending.timestamp;

      // Only sync if less than 5 minutes old
      if (ageMs < 5 * 60 * 1000) {
        log('🔄 [useLocationSync] Processing pending sync...');
        const result = await syncLocationToDb(
          pending.locationResult,
          pending.latitude,
          pending.longitude
        );
        
        if (result.success) {
          await AsyncStorage.removeItem(PENDING_SYNC_KEY);
        }
        
        return result;
      } else {
        log('⏰ [useLocationSync] Pending sync too old, discarding');
        await AsyncStorage.removeItem(PENDING_SYNC_KEY);
        return null;
      }
    } catch (error) {
      logError('❌ [useLocationSync] Error processing pending sync:', error);
      return null;
    }
  }, [syncLocationToDb]);

  /**
   * Update user preferences in database
   */
  const syncPreferences = useCallback(async (preferences) => {
    if (!isDbSynced || !userId) {
      return { success: false, reason: 'not_synced' };
    }

    try {
      const result = await updatePreferences({
        languageCode: preferences.languageCode || languageCode,
        themeMode: preferences.themeMode,
      });

      if (result.success) {
        log('✅ [useLocationSync] Preferences synced');
      }

      return result;
    } catch (error) {
      logError('❌ [useLocationSync] Preferences sync error:', error);
      return { success: false, error: error.message };
    }
  }, [isDbSynced, userId, languageCode]);

  return {
    syncLocationToDb,
    queuePendingSync,
    processPendingSync,
    syncPreferences,
    isSyncing: isSyncingRef.current,
  };
}
