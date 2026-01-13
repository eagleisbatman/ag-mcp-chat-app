/**
 * Location Context
 * Manages user location state, permissions, and location details
 * Can be used independently or composed into AppContext
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PropTypes from 'prop-types';
import { lookupLocation } from '../services/db';

const LocationContext = createContext(null);

/**
 * Location Provider Component
 * Handles location persistence, lookup, and state management
 */
export function LocationProvider({ children }) {
  // Location coordinates
  const [location, setLocationState] = useState({ latitude: null, longitude: null });
  
  // Permission status: 'pending', 'granted', 'denied'
  const [locationStatus, setLocationStatus] = useState('pending');
  
  // Detailed location info (city, country, etc.)
  const [locationDetails, setLocationDetails] = useState(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Load saved location on mount
  useEffect(() => {
    loadSavedLocation();
  }, []);

  const loadSavedLocation = async () => {
    try {
      const [savedLocation, savedLocationDetails] = await Promise.all([
        AsyncStorage.getItem('location'),
        AsyncStorage.getItem('locationDetails'),
      ]);

      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setLocationState(loc);
        setLocationStatus('granted');

        // Load cached details if available
        if (savedLocationDetails) {
          const details = JSON.parse(savedLocationDetails);
          if (details && details.displayName) {
            setLocationDetails(details);
          }
        }
      }
    } catch (error) {
      // Silently fail - use default state
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set location and persist to storage
   * @param {{ latitude: number, longitude: number }} coords - Location coordinates
   * @param {'granted' | 'denied'} status - Permission status
   */
  const setLocation = useCallback(async (coords, status = 'granted') => {
    try {
      setLocationState(coords);
      setLocationStatus(status);
      
      if (coords.latitude && coords.longitude) {
        await AsyncStorage.setItem('location', JSON.stringify(coords));
        
        // Trigger location lookup for details
        lookupLocationDetails(coords.latitude, coords.longitude);
      }
    } catch (error) {
      // Silently fail
    }
  }, []);

  /**
   * Lookup location details from coordinates
   */
  const lookupLocationDetails = useCallback(async (lat, lon) => {
    if (isLookingUp) return;
    
    setIsLookingUp(true);
    try {
      const result = await lookupLocation(lat, lon, null);
      
      if (result.success && result.displayName) {
        const details = {
          displayName: result.displayName,
          level1Country: result.level1Country,
          level2State: result.level2State,
          level3District: result.level3District,
          level4SubDistrict: result.level4SubDistrict,
          level5City: result.level5City,
          level6Village: result.level6Village,
          source: result.source || 'gps',
        };
        
        setLocationDetails(details);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(details));
      }
    } catch (error) {
      // Silently fail - keep existing details
    } finally {
      setIsLookingUp(false);
    }
  }, [isLookingUp]);

  /**
   * Clear location data
   */
  const clearLocation = useCallback(async () => {
    try {
      setLocationState({ latitude: null, longitude: null });
      setLocationStatus('pending');
      setLocationDetails(null);
      await AsyncStorage.multiRemove(['location', 'locationDetails']);
    } catch (error) {
      // Silently fail
    }
  }, []);

  const value = useMemo(() => ({
    location,
    locationStatus,
    locationDetails,
    setLocation,
    clearLocation,
    lookupLocationDetails,
    isLoading,
    isLookingUp,
  }), [
    location, 
    locationStatus, 
    locationDetails, 
    setLocation, 
    clearLocation,
    lookupLocationDetails,
    isLoading, 
    isLookingUp
  ]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

LocationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to access location context
 * @returns Location context value
 */
export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export default LocationContext;
