// Weather API service - calls API Gateway for weather data
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { log, error as logError } from '../utils/logger';

const DEFAULT_TIMEOUT_MS = TIMEOUTS.WEATHER;

// Type definitions
export interface WeatherLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  displayName?: string;
  name?: string;
}

export interface CurrentWeatherData {
  temperature?: number;
  weatherText?: string;
  weatherIcon?: number;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
}

export interface ForecastDay {
  date: string;
  tempMax?: number;
  tempMin?: number;
  dayIcon?: number;
  precipitationProbability?: number;
  conditions?: string;
}

export interface ForecastData {
  daily: ForecastDay[];
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
}

export interface CurrentWeatherResult {
  success: boolean;
  data: CurrentWeatherData | null;
  location: WeatherLocation | null;
  provider?: string;
  error?: string;
}

export interface ForecastResult {
  success: boolean;
  data: ForecastData | null;
  location?: WeatherLocation;
  error?: string;
}

export interface CombinedWeatherResult {
  current: CurrentWeatherData | null;
  forecast: ForecastData | null;
  location: WeatherLocation | null;
  provider: string;
}

export interface HourlyForecastResult {
  success: boolean;
  data: Array<Record<string, unknown>>;
  error?: string;
}

/**
 * Weather Service
 * Provides weather data from AccuWeather via the API Gateway
 */
export const weatherService = {
  /**
   * Get current conditions and forecast in a single call
   */
  async getCurrentAndForecast(
    latitude: number,
    longitude: number,
    language: string = 'en',
    provider: string = 'google-weather'
  ): Promise<CombinedWeatherResult> {
    try {
      // Different providers support different forecast days
      // AccuWeather: 5 days, Tomorrow.io: 7 days, Google Weather: 10 days
      const forecastDays = provider === 'google-weather' ? 10 : provider === 'tomorrow-io' ? 7 : 5;

      const [current, forecast] = await Promise.all([
        this.getCurrent(latitude, longitude, language, provider),
        this.getForecast(latitude, longitude, forecastDays, language, provider),
      ]);

      // Use location from forecast if current doesn't have city name
      const location = current.location?.city
        ? current.location
        : forecast.location || current.location;

      return {
        current: current.data,
        forecast: forecast.data,
        location,
        provider: current.provider || provider,
      };
    } catch (error) {
      logError('Error fetching weather data:', error);
      throw error;
    }
  },

  /**
   * Get current weather conditions
   */
  async getCurrent(
    latitude: number,
    longitude: number,
    language: string = 'en',
    provider: string = 'google-weather'
  ): Promise<CurrentWeatherResult> {
    try {
      const url = `${API_BASE_URL}/api/weather/current`;

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          language,
          provider, // Pass preferred provider to API
        }),
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();

      // Map API response to widget-expected format
      // Handle both normalized (Tomorrow.io) and raw (AccuWeather) field names
      const currentData = result.data?.current || {};
      const locationData = result.data?.location || {};

      // Extract values with fallbacks for different field naming conventions
      const temperature = currentData.temperature ?? currentData.temperature_c;
      const humidity = currentData.humidity ?? currentData.humidity_percent;
      const windSpeed = currentData.wind_speed ?? currentData.wind_speed_kmh;

      log('[Weather] Current conditions fetched:', {
        temp: temperature,
        conditions: currentData.conditions,
      });

      return {
        success: true,
        data: {
          temperature,
          weatherText: currentData.conditions,
          weatherIcon: currentData.weather_icon || 1, // Default sunny
          humidity,
          windSpeed,
          precipitation: currentData.has_precipitation ? 1 : 0,
        },
        location: {
          city: locationData.city || locationData.displayName,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        provider: result.data?.provider || provider,
      };
    } catch (error) {
      logError('Current weather error:', error);
      return {
        success: false,
        error: parseErrorMessage(error),
        data: null,
        location: null,
      };
    }
  },

  /**
   * Get weather forecast
   */
  async getForecast(
    latitude: number,
    longitude: number,
    days: number = 7,
    language: string = 'en',
    provider: string = 'google-weather'
  ): Promise<ForecastResult> {
    try {
      const url = `${API_BASE_URL}/api/weather/forecast`;

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          days,
          language,
          provider, // Pass preferred provider to API
        }),
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();

      // Map API response to widget-expected format
      // Handle both normalized (Tomorrow.io) and raw (AccuWeather) field names
      const forecastArray = result.data?.forecast || [];
      const daily: ForecastDay[] = forecastArray.map((day: Record<string, unknown>) => ({
        date: day.date as string,
        tempMax: (day.max_temp ?? day.max_temp_c) as number | undefined,
        tempMin: (day.min_temp ?? day.min_temp_c) as number | undefined,
        dayIcon: (day.weather_icon || 1) as number, // Weather code from API
        precipitationProbability: (day.day_precipitation_probability ?? day.day_precipitation_probability_percent ?? 0) as number,
        conditions: day.day_conditions as string | undefined,
      }));

      // Get location from forecast response
      const locationData = result.data?.location || {};

      log('[Weather] Forecast fetched:', {
        days: daily.length,
        city: locationData.name,
      });

      return {
        success: true,
        data: { daily },
        location: {
          city: locationData.name,
          region: locationData.region,
          country: locationData.country,
        },
      };
    } catch (error) {
      logError('Weather forecast error:', error);
      return {
        success: false,
        error: parseErrorMessage(error),
        data: null,
      };
    }
  },

  /**
   * Get active weather alerts for a region
   */
  async getAlerts(latitude: number, longitude: number): Promise<WeatherAlert[]> {
    try {
      const url = `${API_BASE_URL}/api/weather/alerts?latitude=${latitude}&longitude=${longitude}`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        // Alerts are optional, don't throw on error
        log('Weather alerts unavailable:', response.status);
        return [];
      }

      const result = await response.json();
      const alerts = result.alerts || [];

      if (alerts.length > 0) {
        log('[Weather] Alerts fetched:', alerts.length);
      }

      return alerts;
    } catch (error) {
      log('Failed to fetch weather alerts:', error);
      return [];
    }
  },

  /**
   * Get hourly forecast (next 12 hours)
   */
  async getHourlyForecast(
    latitude: number,
    longitude: number,
    language: string = 'en'
  ): Promise<HourlyForecastResult> {
    try {
      const url = `${API_BASE_URL}/api/weather/hourly`;

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          hours: 12,
          language,
        }),
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data || [],
      };
    } catch (error) {
      logError('Hourly forecast error:', error);
      return {
        success: false,
        error: parseErrorMessage(error),
        data: [],
      };
    }
  },
};

export default weatherService;
