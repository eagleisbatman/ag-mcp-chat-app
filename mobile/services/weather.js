// Weather API service - calls API Gateway for weather data
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

const DEFAULT_TIMEOUT_MS = 30000; // 30s for weather endpoints

/**
 * Weather Service
 * Provides weather data from AccuWeather via the API Gateway
 */
export const weatherService = {
  /**
   * Get current conditions and forecast in a single call
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {string} language - Language code (e.g., 'en', 'hi')
   * @param {string} provider - Preferred weather provider (e.g., 'accuweather', 'tomorrow-io')
   * @returns {Promise<{current: object, forecast: object, location: object, provider: string}>}
   */
  async getCurrentAndForecast(latitude, longitude, language = 'en', provider = 'accuweather') {
    try {
      // Different providers support different forecast days
      // AccuWeather: 5 days, Tomorrow.io: 7 days
      const forecastDays = provider === 'tomorrow-io' ? 7 : 5;

      const [current, forecast] = await Promise.all([
        this.getCurrent(latitude, longitude, language, provider),
        this.getForecast(latitude, longitude, forecastDays, language, provider),
      ]);

      // Log any failures
      if (!current.success) {
        console.warn('[Weather] Current conditions failed:', current.error);
      }
      if (!forecast.success) {
        console.warn('[Weather] Forecast failed:', forecast.error);
      }

      // Use location from forecast if current doesn't have city name
      const location = current.location?.city
        ? current.location
        : forecast.location || current.location;

      // Log successful data retrieval
      console.log('[Weather] Data retrieved:', {
        hasCurrent: !!current.data,
        hasForecast: !!forecast.data,
        forecastDays: forecast.data?.daily?.length || 0,
        provider: current.provider || provider,
      });

      return {
        current: current.data,
        forecast: forecast.data,
        location,
        provider: current.provider || provider,
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  },

  /**
   * Get current weather conditions
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {string} language - Language code
   * @param {string} provider - Preferred weather provider
   * @returns {Promise<{success: boolean, data: object, location: object, provider: string}>}
   */
  async getCurrent(latitude, longitude, language = 'en', provider = 'accuweather') {
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

      console.log('[Weather] Current conditions fetched:', {
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
      console.error('Current weather error:', error);
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
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {number} days - Number of forecast days (default: 5)
   * @param {string} language - Language code
   * @returns {Promise<{success: boolean, data: object}>}
   */
  async getForecast(latitude, longitude, days = 5, language = 'en', provider = 'accuweather') {
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
      const daily = forecastArray.map(day => ({
        date: day.date,
        tempMax: day.max_temp ?? day.max_temp_c,
        tempMin: day.min_temp ?? day.min_temp_c,
        dayIcon: day.weather_icon || 1, // Weather code from API (AccuWeather/Tomorrow.io)
        precipitationProbability: day.day_precipitation_probability ?? day.day_precipitation_probability_percent ?? 0,
        conditions: day.day_conditions,
      }));

      // Get location from forecast response
      const locationData = result.data?.location || {};

      console.log('[Weather] Forecast fetched:', {
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
      console.error('Weather forecast error:', error);
      return {
        success: false,
        error: parseErrorMessage(error),
        data: null,
      };
    }
  },

  /**
   * Get active weather alerts for a region
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @returns {Promise<Array<{id: string, type: string, severity: string, title: string, description: string}>>}
   */
  async getAlerts(latitude, longitude) {
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
        console.warn('Weather alerts unavailable:', response.status);
        return [];
      }

      const result = await response.json();
      const alerts = result.alerts || [];

      if (alerts.length > 0) {
        console.log('[Weather] Alerts fetched:', alerts.length);
      }

      return alerts;
    } catch (error) {
      console.warn('Failed to fetch weather alerts:', error);
      return [];
    }
  },

  /**
   * Get hourly forecast (next 12 hours)
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {string} language - Language code
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getHourlyForecast(latitude, longitude, language = 'en') {
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
      console.error('Hourly forecast error:', error);
      return {
        success: false,
        error: parseErrorMessage(error),
        data: [],
      };
    }
  },
};

export default weatherService;
