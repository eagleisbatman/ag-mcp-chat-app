import React from 'react';
import { Ionicons } from '@expo/vector-icons';

/**
 * WeatherIcon - Maps weather condition codes to Ionicons
 *
 * AccuWeather icon codes:
 * 1-5: Sunny/Clear
 * 6-11: Cloudy
 * 12-14: Rain showers
 * 15-17: Thunderstorms
 * 18: Rain
 * 19-21: Snow flurries
 * 22-23: Snow
 * 24-29: Ice/Sleet
 * 30: Hot
 * 31: Cold
 * 32: Windy
 * 33-38: Night variants
 */

// Map AccuWeather icon codes to Ionicons
const WEATHER_ICON_MAP = {
  // Sunny/Clear (Day)
  1: 'sunny',          // Sunny
  2: 'sunny',          // Mostly Sunny
  3: 'partly-sunny',   // Partly Sunny
  4: 'partly-sunny',   // Intermittent Clouds
  5: 'partly-sunny',   // Hazy Sunshine

  // Cloudy
  6: 'cloudy',         // Mostly Cloudy
  7: 'cloudy',         // Cloudy
  8: 'cloudy',         // Dreary (Overcast)

  // Fog/Haze
  11: 'cloudy',        // Fog

  // Rain
  12: 'rainy',         // Showers
  13: 'rainy',         // Mostly Cloudy w/ Showers
  14: 'rainy',         // Partly Sunny w/ Showers
  18: 'rainy',         // Rain

  // Thunderstorms
  15: 'thunderstorm',  // T-Storms
  16: 'thunderstorm',  // Mostly Cloudy w/ T-Storms
  17: 'thunderstorm',  // Partly Sunny w/ T-Storms

  // Snow
  19: 'snow',          // Flurries
  20: 'snow',          // Mostly Cloudy w/ Flurries
  21: 'snow',          // Partly Sunny w/ Flurries
  22: 'snow',          // Snow
  23: 'snow',          // Mostly Cloudy w/ Snow

  // Ice/Sleet
  24: 'snow',          // Ice
  25: 'rainy',         // Sleet
  26: 'rainy',         // Freezing Rain
  29: 'rainy',         // Rain and Snow

  // Extreme
  30: 'sunny',         // Hot
  31: 'snow',          // Cold
  32: 'cloudy',        // Windy

  // Night variants
  33: 'moon',          // Clear (Night)
  34: 'moon',          // Mostly Clear (Night)
  35: 'cloudy-night',  // Partly Cloudy (Night)
  36: 'cloudy-night',  // Intermittent Clouds (Night)
  37: 'cloudy-night',  // Hazy Moonlight
  38: 'cloudy-night',  // Mostly Cloudy (Night)

  // Night weather variants
  39: 'rainy',         // Partly Cloudy w/ Showers (Night)
  40: 'rainy',         // Mostly Cloudy w/ Showers (Night)
  41: 'thunderstorm',  // Partly Cloudy w/ T-Storms (Night)
  42: 'thunderstorm',  // Mostly Cloudy w/ T-Storms (Night)
  43: 'snow',          // Mostly Cloudy w/ Flurries (Night)
  44: 'snow',          // Mostly Cloudy w/ Snow (Night)
};

// Color map for weather conditions
const WEATHER_COLOR_MAP = {
  sunny: '#FFB300',        // Amber for sunny
  'partly-sunny': '#FFA726', // Orange for partly sunny
  cloudy: '#78909C',       // Blue grey for cloudy
  'cloudy-night': '#546E7A', // Darker blue grey for cloudy night
  rainy: '#42A5F5',        // Blue for rain
  thunderstorm: '#7E57C2', // Purple for storms
  snow: '#90CAF9',         // Light blue for snow
  moon: '#FDD835',         // Yellow for clear night
};

/**
 * WeatherIcon component
 * @param {object} props
 * @param {number} props.code - AccuWeather icon code
 * @param {number} props.size - Icon size (default: 24)
 * @param {string} props.color - Override color (optional)
 * @param {object} props.style - Additional style (optional)
 */
const WeatherIcon = ({ code, size = 24, color, style }) => {
  // Get icon name from map, default to 'cloudy' if not found
  const iconName = WEATHER_ICON_MAP[code] || 'cloudy';

  // Get color from map or use provided color
  const iconColor = color || WEATHER_COLOR_MAP[iconName] || '#78909C';

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={iconColor}
      style={style}
    />
  );
};

// Export icon name getter for use in other components
export const getWeatherIconName = (code) => {
  return WEATHER_ICON_MAP[code] || 'cloudy';
};

// Export color getter for use in other components
export const getWeatherIconColor = (code) => {
  const iconName = WEATHER_ICON_MAP[code] || 'cloudy';
  return WEATHER_COLOR_MAP[iconName] || '#78909C';
};

export default WeatherIcon;
