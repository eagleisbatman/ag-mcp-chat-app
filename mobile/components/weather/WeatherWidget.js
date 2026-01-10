import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import WeatherIcon from './WeatherIcon';

// Tomorrow.io "Powered by" logo
const TOMORROW_IO_LOGO = require('../../assets/logos/Powered_by_Tomorrow-Black.png');

/**
 * Skeleton placeholder with pulse animation
 */
const SkeletonBox = ({ width, height, style }) => {
  const { theme } = useApp();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.textMuted,
          borderRadius: height / 2,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * WeatherWidget - Compact weather card with current conditions and forecast strip
 * Location is shown in header, so not duplicated here
 */
// Provider display names
const PROVIDER_NAMES = {
  'accuweather': 'AccuWeather',
  'tomorrow-io': 'Tomorrow.io',
  'gap-weather': 'GAP Weather',
  'weatherapi': 'WeatherAPI',
};

const WeatherWidget = ({ data, loading, error, provider }) => {
  const { theme } = useApp();
  const providerName = PROVIDER_NAMES[provider] || provider;

  // Don't render if there's an error - let welcome message show instead
  if (error) {
    return null;
  }

  // Skeleton loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        {/* Skeleton for current weather */}
        <View style={styles.currentRow}>
          <View style={styles.tempSection}>
            <SkeletonBox width={48} height={48} style={{ borderRadius: 24 }} />
            <SkeletonBox width={60} height={36} />
          </View>
          <View style={styles.infoSection}>
            <SkeletonBox width={100} height={18} />
            <View style={styles.statsRow}>
              <SkeletonBox width={55} height={24} />
              <SkeletonBox width={75} height={24} />
            </View>
          </View>
        </View>
        {/* Skeleton for forecast */}
        <View style={[styles.forecastStrip, { borderTopColor: theme.surfaceVariant }]}>
          <View style={styles.forecastContent}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.forecastDay}>
                <SkeletonBox width={32} height={12} />
                <SkeletonBox width={32} height={32} style={{ borderRadius: 16, marginVertical: 6 }} />
                <SkeletonBox width={24} height={14} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // No data state - don't render
  if (!data || !data.current) {
    return null;
  }

  const { current, forecast } = data;

  // Check if we have valid temperature
  const hasTemperature = current?.temperature !== null && current?.temperature !== undefined;
  if (!hasTemperature) {
    return null; // Don't show widget if no temperature data
  }

  // Check which stats are available
  const hasHumidity = current?.humidity !== null && current?.humidity !== undefined && current?.humidity > 0;
  const hasWind = current?.windSpeed !== null && current?.windSpeed !== undefined && current?.windSpeed > 0;
  const hasAnyStats = hasHumidity || hasWind;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Current Weather Row */}
      <View style={styles.currentRow}>
        {/* Left: Icon + Temperature */}
        <View style={styles.tempSection}>
          <WeatherIcon code={current?.weatherIcon} size={48} provider={provider} />
          <Text style={[styles.temperature, { color: theme.text }]}>
            {Math.round(current.temperature)}°
          </Text>
        </View>

        {/* Right: Conditions + Stats stacked */}
        <View style={styles.infoSection}>
          {current?.weatherText && (
            <Text style={[styles.conditions, { color: theme.text }]} numberOfLines={1}>
              {getTranslatedWeatherText(current.weatherText)}
            </Text>
          )}

          {hasAnyStats && (
            <View style={styles.statsRow}>
              {hasHumidity && (
                <View style={[styles.statBadge, { backgroundColor: theme.info + '20' }]}>
                  <Ionicons name="thermometer-outline" size={14} color={theme.info} />
                  <Text style={[styles.statText, { color: theme.info }]}>
                    {Math.round(current.humidity)}%
                  </Text>
                </View>
              )}
              {hasWind && (
                <View style={[styles.statBadge, { backgroundColor: theme.accent + '20' }]}>
                  <Ionicons name="flag-outline" size={14} color={theme.accent} />
                  <Text style={[styles.statText, { color: theme.accent }]}>
                    {Math.round(current.windSpeed)} {t('weather.windUnit') || 'km/h'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Forecast Strip - only show if we have forecast data */}
      {forecast?.daily && forecast.daily.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.forecastStrip, { borderTopColor: theme.surfaceVariant }]}
          contentContainerStyle={styles.forecastContent}
        >
          {forecast.daily.slice(0, 5).map((day, index) => {
            // Skip days without valid temperature
            if (day.tempMax === null || day.tempMax === undefined) {
              return null;
            }

            const hasRain = day.precipitationProbability > 0;

            return (
              <View key={index} style={styles.forecastDay}>
                <Text style={[styles.forecastDayName, { color: theme.textMuted }]}>
                  {index === 0
                    ? (t('weather.today') || 'Today')
                    : getDayName(day.date)}
                </Text>
                <WeatherIcon code={day.dayIcon} size={32} provider={provider} />
                <Text style={[styles.forecastTemp, { color: theme.text }]}>
                  {Math.round(day.tempMax)}°
                </Text>
                {hasRain && (
                  <View style={styles.rainChance}>
                    <Ionicons name="rainy-outline" size={11} color={theme.info} />
                    <Text style={[styles.rainText, { color: theme.info }]}>
                      {day.precipitationProbability}%
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Provider attribution */}
      {providerName && (
        <View style={[styles.providerRow, { borderTopColor: theme.surfaceVariant }]}>
          {provider === 'tomorrow-io' ? (
            <Image
              source={TOMORROW_IO_LOGO}
              style={styles.poweredByLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={[styles.providerText, { color: theme.textMuted }]}>
              {t('weather.dataFrom') || 'Data from'} {providerName}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Day name translation keys mapped to day index (0 = Sunday)
 */
const DAY_KEYS = [
  'weather.daySun',
  'weather.dayMon',
  'weather.dayTue',
  'weather.dayWed',
  'weather.dayThu',
  'weather.dayFri',
  'weather.daySat',
];

/**
 * Map API weather text to translation key
 * Handles common variations from AccuWeather/Tomorrow.io
 */
const WEATHER_TEXT_MAP = {
  // Clear conditions
  'clear': 'clear',
  'sunny': 'clear',
  'clear sky': 'clear',
  'mostly clear': 'mostlyClear',
  'fair': 'mostlyClear',

  // Cloudy conditions
  'cloudy': 'cloudy',
  'overcast': 'cloudy',
  'partly cloudy': 'partlyCloudy',
  'partly sunny': 'partlyCloudy',
  'intermittent clouds': 'partlyCloudy',
  'mostly cloudy': 'mostlyCloudy',
  'dreary': 'mostlyCloudy',

  // Fog
  'fog': 'fog',
  'foggy': 'fog',
  'haze': 'lightFog',
  'mist': 'lightFog',
  'light fog': 'lightFog',

  // Rain
  'rain': 'rain',
  'rainy': 'rain',
  'showers': 'rain',
  'drizzle': 'drizzle',
  'light rain': 'lightRain',
  'light drizzle': 'drizzle',
  'heavy rain': 'heavyRain',
  'rain heavy': 'heavyRain',

  // Snow
  'snow': 'snow',
  'snowy': 'snow',
  'flurries': 'flurries',
  'light snow': 'lightSnow',
  'heavy snow': 'heavySnow',

  // Freezing conditions
  'freezing rain': 'freezingRain',
  'freezing drizzle': 'freezingDrizzle',
  'light freezing rain': 'lightFreezingRain',
  'heavy freezing rain': 'heavyFreezingRain',
  'ice pellets': 'icePellets',
  'sleet': 'icePellets',
  'light ice pellets': 'lightIcePellets',
  'heavy ice pellets': 'heavyIcePellets',

  // Storms
  'thunderstorm': 'thunderstorm',
  'thunderstorms': 'thunderstorm',
  't-storms': 'thunderstorm',
  'thunder': 'thunderstorm',
};

/**
 * Get translated weather condition text
 * @param {string} weatherText - Original weather text from API
 * @returns {string} - Translated weather condition
 */
const getTranslatedWeatherText = (weatherText) => {
  if (!weatherText) return '';

  const normalizedText = weatherText.toLowerCase().trim();
  const translationKey = WEATHER_TEXT_MAP[normalizedText];

  if (translationKey) {
    const translated = t(`weather.conditions.${translationKey}`);
    // If translation exists and is different from the key, use it
    if (translated && !translated.startsWith('weather.conditions.')) {
      return translated;
    }
  }

  // Fallback: return original text
  return weatherText;
};

/**
 * Get translated day name from date string
 * @param {string} dateString - ISO date string
 */
const getDayName = (dateString) => {
  try {
    const date = new Date(dateString);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return t(DAY_KEYS[dayIndex]) || DAY_KEYS[dayIndex];
  } catch {
    return '';
  }
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: SPACING.radiusMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  tempSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  temperature: {
    fontSize: 40,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  infoSection: {
    flex: 1,
    gap: SPACING.sm,
  },
  conditions: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  forecastStrip: {
    borderTopWidth: 1,
  },
  forecastContent: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xl,
  },
  forecastDay: {
    alignItems: 'center',
    minWidth: 58,
  },
  forecastDayName: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 6,
  },
  forecastTemp: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: 6,
  },
  rainChance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rainText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginLeft: 2,
  },
  providerRow: {
    borderTopWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignItems: 'flex-end',
  },
  providerText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  poweredByLogo: {
    height: 16,
    width: 100,
  },
});

export default WeatherWidget;
