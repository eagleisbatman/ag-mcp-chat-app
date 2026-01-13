import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveLocation as saveLocationToDB, lookupLocation } from '../../services/db';
import { LocationDetails } from '../../types';
import { log } from '../../utils/logger';

interface LocationCoords {
  latitude: number | null;
  longitude: number | null;
}

type LocationStatus = 'pending' | 'granted' | 'denied';

interface LocationContextValue {
  location: LocationCoords;
  locationStatus: LocationStatus;
  locationDetails: LocationDetails | null;
  setLocation: (loc: LocationCoords, status: LocationStatus) => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export const LocationProvider = ({ children, userId }: { children: ReactNode; userId: string | null }) => {
  const [location, setLocationState] = useState<LocationCoords>({ latitude: null, longitude: null });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const [savedLocation, savedLocationDetails] = await Promise.all([
          AsyncStorage.getItem('location'),
          AsyncStorage.getItem('locationDetails'),
        ]);

        if (savedLocation) {
          const loc = JSON.parse(savedLocation) as LocationCoords;
          setLocationState(loc);
          setLocationStatus('granted');

          if (savedLocationDetails) {
            setLocationDetails(JSON.parse(savedLocationDetails) as LocationDetails);
          } else if (loc.latitude && loc.longitude) {
            lookupLocationDetails(loc.latitude, loc.longitude);
          }
        } else if (savedLocationDetails) {
          setLocationDetails(JSON.parse(savedLocationDetails) as LocationDetails);
        }
      } catch (e) {
        log('Error loading location:', e);
      }
    };
    loadLocation();
  }, []);

  const syncLocationToDb = async (
    locationResult: any, 
    latitude: number, 
    longitude: number, 
    retryCount = 0
  ): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    if (!userId && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return syncLocationToDb(locationResult, latitude, longitude, retryCount + 1);
    }
    
    if (!userId) {
      try {
        await AsyncStorage.setItem('pendingLocationSync', JSON.stringify({ 
          locationResult, latitude, longitude, timestamp: Date.now() 
        }));
      } catch (e) {
        log('Error saving pending location:', e);
      }
      return;
    }
    
    try {
      await saveLocationToDB({
        ...locationResult,
        latitude,
        longitude,
        isPrimary: true,
      });
    } catch (e) {
      log('Error syncing location to DB:', e);
    }
  };

  const lookupLocationDetails = async (latitude: number, longitude: number) => {
    try {
      const result = await lookupLocation(latitude, longitude);
      if (result.success) {
        const normalized: LocationDetails = {
          ...result,
          latitude,
          longitude,
          displayName: result.displayName || result.level5City || result.level3District || result.level2State || result.level1Country || 'Location set',
          source: (result.source as LocationDetails['source']) || 'gps',
        };
        setLocationDetails(normalized);
        await AsyncStorage.setItem('locationDetails', JSON.stringify(normalized));
        await syncLocationToDb(normalized, latitude, longitude);
      }
    } catch (e) {
      log('Error looking up location details:', e);
    }
  };

  const setLocation = async (loc: LocationCoords, status: LocationStatus) => {
    setLocationState(loc);
    setLocationStatus(status);
    if (status === 'granted' && loc.latitude && loc.longitude) {
      try {
        await AsyncStorage.setItem('location', JSON.stringify(loc));
        await lookupLocationDetails(loc.latitude, loc.longitude);
      } catch (e) {
        log('Error saving location:', e);
      }
    }
  };

  return (
    <LocationContext.Provider value={{ location, locationStatus, locationDetails, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
};
