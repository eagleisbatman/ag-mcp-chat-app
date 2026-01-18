import React from 'react';
import { StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

/**
 * WeatherIcon - Maps weather condition codes to icons
 * Supports AccuWeather (Ionicons) and Tomorrow.io (V2 PNG icons)
 */

// AccuWeather icon codes to Ionicons mapping
const ACCUWEATHER_ICON_MAP: Record<number, keyof typeof Ionicons.glyphMap> = {
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

// Color map for AccuWeather icons
const WEATHER_COLOR_MAP: Record<string, string> = {
  sunny: '#FFB300',        // Amber for sunny
  'partly-sunny': '#FFA726', // Orange for partly sunny
  cloudy: '#78909C',       // Blue grey for cloudy
  'cloudy-night': '#546E7A', // Darker blue grey for cloudy night
  rainy: '#42A5F5',        // Blue for rain
  thunderstorm: '#7E57C2', // Purple for storms
  snow: '#90CAF9',         // Light blue for snow
  moon: '#FDD835',         // Yellow for clear night
};

interface TomorrowIoIconVariants {
  day: string;
  night: string;
}

// Tomorrow.io API code to V2 icon filename mapping
const TOMORROW_IO_ICON_MAP: Record<number, TomorrowIoIconVariants> = {
  // Clear & Cloudy (with day/night variants)
  1000: { day: '10000_clear_large', night: '10001_clear_large' },
  1100: { day: '11000_mostly_clear_large', night: '11001_mostly_clear_large' },
  1101: { day: '11010_partly_cloudy_large', night: '11011_partly_cloudy_large' },
  1102: { day: '11020_mostly_cloudy_large', night: '11021_mostly_cloudy_large' },
  1001: { day: '10010_cloudy_large', night: '10010_cloudy_large' },

  // Fog
  2000: { day: '20000_fog_large', night: '20000_fog_large' },
  2100: { day: '21000_fog_light_large', night: '21000_fog_light_large' },

  // Rain
  4000: { day: '40000_drizzle_large', night: '40000_drizzle_large' },
  4200: { day: '42000_rain_light_large', night: '42000_rain_light_large' },
  4001: { day: '40010_rain_large', night: '40010_rain_large' },
  4201: { day: '42010_rain_heavy_large', night: '42010_rain_heavy_large' },

  // Snow
  5001: { day: '50010_flurries_large', night: '50010_flurries_large' },
  5100: { day: '51000_snow_light_large', night: '51000_snow_light_large' },
  5000: { day: '50000_snow_large', night: '50000_snow_large' },
  5101: { day: '51010_snow_heavy_large', night: '51010_snow_heavy_large' },

  // Freezing precipitation
  6000: { day: '60000_freezing_rain_drizzle_large', night: '60000_freezing_rain_drizzle_large' },
  6200: { day: '62000_freezing_rain_light_large', night: '62000_freezing_rain_light_large' },
  6001: { day: '60010_freezing_rain_large', night: '60010_freezing_rain_large' },
  6201: { day: '62010_freezing_rain_heavy_large', night: '62010_freezing_rain_heavy_large' },

  // Ice pellets
  7102: { day: '71020_ice_pellets_light_large', night: '71020_ice_pellets_light_large' },
  7000: { day: '70000_ice_pellets_large', night: '70000_ice_pellets_large' },
  7101: { day: '71010_ice_pellets_heavy_large', night: '71010_ice_pellets_heavy_large' },

  // Thunderstorm
  8000: { day: '80000_tstorm_large', night: '80000_tstorm_large' },
};

// Tomorrow.io V2 icon require map (React Native needs static requires)
const TOMORROW_IO_ICONS: Record<string, ReturnType<typeof require>> = {
  '10000_clear_large': require('../../assets/weather-icons/tomorrow-io/10000_clear_large.png'),
  '10001_clear_large': require('../../assets/weather-icons/tomorrow-io/10001_clear_large.png'),
  '10010_cloudy_large': require('../../assets/weather-icons/tomorrow-io/10010_cloudy_large.png'),
  '11000_mostly_clear_large': require('../../assets/weather-icons/tomorrow-io/11000_mostly_clear_large.png'),
  '11001_mostly_clear_large': require('../../assets/weather-icons/tomorrow-io/11001_mostly_clear_large.png'),
  '11010_partly_cloudy_large': require('../../assets/weather-icons/tomorrow-io/11010_partly_cloudy_large.png'),
  '11011_partly_cloudy_large': require('../../assets/weather-icons/tomorrow-io/11011_partly_cloudy_large.png'),
  '11020_mostly_cloudy_large': require('../../assets/weather-icons/tomorrow-io/11020_mostly_cloudy_large.png'),
  '11021_mostly_cloudy_large': require('../../assets/weather-icons/tomorrow-io/11021_mostly_cloudy_large.png'),
  '20000_fog_large': require('../../assets/weather-icons/tomorrow-io/20000_fog_large.png'),
  '21000_fog_light_large': require('../../assets/weather-icons/tomorrow-io/21000_fog_light_large.png'),
  '40000_drizzle_large': require('../../assets/weather-icons/tomorrow-io/40000_drizzle_large.png'),
  '40010_rain_large': require('../../assets/weather-icons/tomorrow-io/40010_rain_large.png'),
  '42000_rain_light_large': require('../../assets/weather-icons/tomorrow-io/42000_rain_light_large.png'),
  '42010_rain_heavy_large': require('../../assets/weather-icons/tomorrow-io/42010_rain_heavy_large.png'),
  '50000_snow_large': require('../../assets/weather-icons/tomorrow-io/50000_snow_large.png'),
  '50010_flurries_large': require('../../assets/weather-icons/tomorrow-io/50010_flurries_large.png'),
  '51000_snow_light_large': require('../../assets/weather-icons/tomorrow-io/51000_snow_light_large.png'),
  '51010_snow_heavy_large': require('../../assets/weather-icons/tomorrow-io/51010_snow_heavy_large.png'),
  '60000_freezing_rain_drizzle_large': require('../../assets/weather-icons/tomorrow-io/60000_freezing_rain_drizzle_large.png'),
  '60010_freezing_rain_large': require('../../assets/weather-icons/tomorrow-io/60010_freezing_rain_large.png'),
  '62000_freezing_rain_light_large': require('../../assets/weather-icons/tomorrow-io/62000_freezing_rain_light_large.png'),
  '62010_freezing_rain_heavy_large': require('../../assets/weather-icons/tomorrow-io/62010_freezing_rain_heavy_large.png'),
  '70000_ice_pellets_large': require('../../assets/weather-icons/tomorrow-io/70000_ice_pellets_large.png'),
  '71010_ice_pellets_heavy_large': require('../../assets/weather-icons/tomorrow-io/71010_ice_pellets_heavy_large.png'),
  '71020_ice_pellets_light_large': require('../../assets/weather-icons/tomorrow-io/71020_ice_pellets_light_large.png'),
  '80000_tstorm_large': require('../../assets/weather-icons/tomorrow-io/80000_tstorm_large.png'),
};

// Default fallback icon for Tomorrow.io
const TOMORROW_IO_FALLBACK = '10010_cloudy_large';

/**
 * Get Tomorrow.io V2 icon source
 */
const getTomorrowIoIcon = (code: number, isNight = false): ReturnType<typeof require> => {
  const iconMapping = TOMORROW_IO_ICON_MAP[code];
  if (iconMapping) {
    const iconKey = isNight ? iconMapping.night : iconMapping.day;
    if (TOMORROW_IO_ICONS[iconKey]) {
      return TOMORROW_IO_ICONS[iconKey];
    }
  }
  // Fallback to cloudy
  return TOMORROW_IO_ICONS[TOMORROW_IO_FALLBACK];
};

// Google Weather icon URL to Ionicons fallback mapping
const GOOGLE_ICON_FALLBACK_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'sunny': 'sunny',
  'clear': 'sunny',
  'clear_day': 'sunny',
  'clear_night': 'moon',
  'partly_cloudy': 'partly-sunny',
  'partly_cloudy_day': 'partly-sunny',
  'partly_cloudy_night': 'cloudy-night',
  'mostly_cloudy': 'cloudy',
  'cloudy': 'cloudy',
  'overcast': 'cloudy',
  'fog': 'cloudy',
  'haze': 'cloudy',
  'drizzle': 'rainy',
  'rain': 'rainy',
  'light_rain': 'rainy',
  'heavy_rain': 'rainy',
  'showers': 'rainy',
  'thunderstorm': 'thunderstorm',
  'snow': 'snow',
  'light_snow': 'snow',
  'heavy_snow': 'snow',
  'sleet': 'snow',
  'hail': 'snow',
};

/**
 * Extract icon type from Google Weather icon URL
 * e.g., "https://maps.gstatic.com/weather/v1/sunny" -> "sunny"
 */
const extractGoogleIconType = (iconUrl: string): string => {
  if (!iconUrl) return 'cloudy';
  const parts = iconUrl.split('/');
  return parts[parts.length - 1] || 'cloudy';
};

interface WeatherIconProps {
  code?: number | string;
  size?: number;
  color?: string;
  provider?: 'accuweather' | 'tomorrow-io' | 'google-weather';
  isNight?: boolean;
  style?: StyleProp<ViewStyle | ImageStyle>;
}

/**
 * WeatherIcon component
 */
const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  size = 24,
  color,
  provider,
  isNight = false,
  style
}) => {
  // Use Tomorrow.io V2 icons if provider is tomorrow-io
  if (provider === 'tomorrow-io' && code !== undefined && typeof code === 'number') {
    const iconSource = getTomorrowIoIcon(code, isNight);
    return (
      <Image
        source={iconSource}
        style={[{ width: size, height: size }, style] as unknown as import('expo-image').ImageStyle}
        contentFit="contain"
      />
    );
  }

  // Google Weather uses URL-based icons
  if (provider === 'google-weather' && code !== undefined) {
    // If code is a URL string, use it directly
    if (typeof code === 'string' && code.startsWith('http')) {
      return (
        <Image
          source={{ uri: `${code}@2x.png` }}
          style={[{ width: size, height: size }, style] as unknown as import('expo-image').ImageStyle}
          contentFit="contain"
          placeholder={undefined}
        />
      );
    }
    // Fallback to Ionicons if URL is not available
    const iconType = typeof code === 'string' ? extractGoogleIconType(code) : 'cloudy';
    const iconName = GOOGLE_ICON_FALLBACK_MAP[iconType.toLowerCase()] || 'cloudy';
    const iconColor = color || WEATHER_COLOR_MAP[iconName] || '#78909C';
    return (
      <Ionicons
        name={iconName}
        size={size}
        color={iconColor}
        style={style as StyleProp<ViewStyle>}
      />
    );
  }

  // Default to AccuWeather with Ionicons
  const iconName = (code !== undefined && typeof code === 'number' && ACCUWEATHER_ICON_MAP[code]) || 'cloudy';
  const iconColor = color || WEATHER_COLOR_MAP[iconName] || '#78909C';

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={iconColor}
      style={style as StyleProp<ViewStyle>}
    />
  );
};

// Export icon name getter for AccuWeather
export const getWeatherIconName = (code: number): keyof typeof Ionicons.glyphMap => {
  return ACCUWEATHER_ICON_MAP[code] || 'cloudy';
};

// Export color getter for AccuWeather
export const getWeatherIconColor = (code: number): string => {
  const iconName = ACCUWEATHER_ICON_MAP[code] || 'cloudy';
  return WEATHER_COLOR_MAP[iconName] || '#78909C';
};

export default WeatherIcon;
