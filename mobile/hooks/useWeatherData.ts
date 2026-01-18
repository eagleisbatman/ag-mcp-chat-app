/**
 * Weather data hook - handles fetching and caching weather data
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { weatherService } from '../services/weather';
import { log, error as logError } from '../utils/logger';
import { LocationDetails, WeatherData } from '../types';

const SERVICE_PREFS_KEY = '@service_preferences';

interface Location {
  latitude: number;
  longitude: number;
}

interface ServicePreferences {
  weather?: string;
  [key: string]: string | undefined;
}

interface UseWeatherDataReturn {
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: boolean;
  weatherProvider: string | null;
  refreshWeather: () => Promise<void>;
}

/**
 * Hook for fetching and managing weather data
 */
export default function useWeatherData(
  location: Location | null,
  locationDetails: LocationDetails | null,
  language: string
): UseWeatherDataReturn {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherProvider, setWeatherProvider] = useState<string | null>(null);
  
  const isFetchingRef = useRef(false);

  const fetchWeather = useCallback(async () => {
    // Need location (either GPS or IP-based)
    if (!location?.latitude || !location?.longitude) {
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setWeatherLoading(true);
    setWeatherError(false);

    try {
      // Load service preferences
      let prefs: ServicePreferences = {};
      try {
        const stored = await AsyncStorage.getItem(SERVICE_PREFS_KEY);
        if (stored) prefs = JSON.parse(stored);
      } catch (e) {
        log('[Weather] Failed to load service prefs:', e);
      }

      const weatherPref = prefs.weather || 'google-weather';

      const data = await weatherService.getCurrentAndForecast(
        location.latitude,
        location.longitude,
        language || 'en',
        weatherPref
      );

      // Use app's location name instead of provider's
      if (locationDetails?.displayName) {
        data.location = {
          ...data.location,
          city: locationDetails.displayName,
        };
      }

      setWeatherProvider(data.provider || weatherPref);
      setWeatherData(data);
    } catch (error) {
      logError('[Weather] Failed to fetch weather:', error);
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
      isFetchingRef.current = false;
    }
  }, [location?.latitude, location?.longitude, language, locationDetails?.displayName]);

  // Fetch weather when location/language changes
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Also fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchWeather();
    }, [fetchWeather])
  );

  return {
    weatherData,
    weatherLoading,
    weatherError,
    weatherProvider,
    refreshWeather: fetchWeather,
  };
}
