/**
 * Location details management hook
 * Handles location lookup and caching
 */
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lookupLocation, saveLocation as saveLocationToDB } from '../services/db';
import { log, error as logError } from '../utils/logger';

const LOCATION_KEY = 'location';
const DETAILS_KEY = 'locationDetails';

export default function useLocationDetails(isDbSynced) {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationDetails, setLocationDetails] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [isLookingUp, setIsLookingUp] = useState(false);

  /**
   * Lookup location details from coordinates
   */
  const lookupLocationDetails = useCallback(async (latitude, longitude) => {
    if (!latitude || !longitude || isLookingUp) return null;
    
    setIsLookingUp(true);
    log('📍 [Location] Looking up details for:', { latitude, longitude });

    try {
      const result = await lookupLocation(latitude, longitude);
      
      if (result.success) {
        const details = {
          displayName: result.displayName,
          level1Country: result.level1Country,
          level2State: result.level2State,
          level3District: result.level3District,
          level4Block: result.level4Block,
          level5City: result.level5City,
          level6Locality: result.level6Locality,
          source: result.source,
        };
        
        setLocationDetails(details);
        await AsyncStorage.setItem(DETAILS_KEY, JSON.stringify(details));
        log('📍 [Location] Looked up:', details.displayName);
        
        return details;
      } else {
        log('📍 [Location] Lookup failed:', result.error);
        return null;
      }
    } catch (e) {
      logError('Location lookup error:', e);
      return null;
    } finally {
      setIsLookingUp(false);
    }
  }, [isLookingUp]);

  /**
   * Save location and optionally sync to DB
   */
  const saveLocation = useCallback(async (coords, details = null) => {
    const { latitude, longitude } = coords;
    
    setLocation({ latitude, longitude });
    setLocationStatus('granted');
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ latitude, longitude }));

    if (details) {
      setLocationDetails(details);
      await AsyncStorage.setItem(DETAILS_KEY, JSON.stringify(details));
    }

    // Sync to database if connected
    if (isDbSynced) {
      try {
        await saveLocationToDB({
          latitude,
          longitude,
          ...details,
        });
      } catch (e) {
        logError('Failed to sync location to DB:', e);
      }
    }
  }, [isDbSynced]);

  /**
   * Load cached location from storage
   */
  const loadCachedLocation = useCallback(async () => {
    try {
      const [savedLocation, savedDetails] = await Promise.all([
        AsyncStorage.getItem(LOCATION_KEY),
        AsyncStorage.getItem(DETAILS_KEY),
      ]);

      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setLocation(loc);
        setLocationStatus('granted');

        if (savedDetails) {
          const details = JSON.parse(savedDetails);
          if (details.displayName) {
            setLocationDetails(details);
            return { location: loc, details };
          }
        }

        // No cached details, need to lookup
        return { location: loc, details: null };
      }

      return { location: null, details: null };
    } catch (e) {
      return { location: null, details: null };
    }
  }, []);

  return {
    location,
    locationDetails,
    locationStatus,
    setLocationStatus,
    isLookingUp,
    lookupLocationDetails,
    saveLocation,
    loadCachedLocation,
  };
}
