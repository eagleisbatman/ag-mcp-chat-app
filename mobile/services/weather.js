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
   * Get current conditions and 7-day forecast in a single call
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {string} language - Language code (e.g., 'en', 'hi')
   * @returns {Promise<{current: object, forecast: object, location: object}>}
   */
  async getCurrentAndForecast(latitude, longitude, language = 'en') {
    try {
      const [current, forecast] = await Promise.all([
        this.getCurrent(latitude, longitude, language),
        this.getForecast(latitude, longitude, 5, language), // AccuWeather free tier max is 5 days
      ]);

      // Use location from forecast if current doesn't have city name
      const location = current.location?.city
        ? current.location
        : forecast.location || current.location;

      return {
        current: current.data,
        forecast: forecast.data,
        location,
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
   * @returns {Promise<{success: boolean, data: object, location: object}>}
   */
  async getCurrent(latitude, longitude, language = 'en') {
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
        }),
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();

      // Map API response to widget-expected format
      const currentData = result.data?.current || {};
      const locationData = result.data?.location || {};

      console.log('[Weather] Current conditions fetched:', {
        temp: currentData.temperature,
        conditions: currentData.conditions,
      });

      return {
        success: true,
        data: {
          temperature: currentData.temperature,
          weatherText: currentData.conditions,
          weatherIcon: currentData.weather_icon || 1, // Default sunny
          humidity: currentData.humidity,
          windSpeed: currentData.wind_speed,
          precipitation: currentData.has_precipitation ? 1 : 0,
        },
        location: {
          city: locationData.city || locationData.displayName,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
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
  async getForecast(latitude, longitude, days = 5, language = 'en') {
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
        }),
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();

      // Map API response to widget-expected format
      const forecastArray = result.data?.forecast || [];
      const daily = forecastArray.map(day => ({
        date: day.date,
        tempMax: day.max_temp,
        tempMin: day.min_temp,
        dayIcon: 1, // AccuWeather doesn't return icon codes in this format
        precipitationProbability: day.day_precipitation_probability || 0,
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
