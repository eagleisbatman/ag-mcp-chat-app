/**
 * WeatherForecastCard - Visually appealing weather display
 *
 * Design inspired by ChatKit:
 * - Gradient background
 * - Large temperature with icon
 * - Location name
 * - Conditions description
 * - 5-day forecast strip at bottom
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Weather icon mapping for AccuWeather codes
const getWeatherIcon = (iconCode, conditions) => {
  if (typeof iconCode === 'number') {
    const iconMap = {
      1: 'sunny', 2: 'sunny', 3: 'partly-sunny', 4: 'partly-sunny',
      5: 'cloudy', 6: 'cloudy', 7: 'cloudy', 8: 'cloudy',
      11: 'cloud', 12: 'rainy', 13: 'rainy', 14: 'rainy',
      15: 'thunderstorm', 16: 'thunderstorm', 17: 'thunderstorm',
      18: 'rainy', 19: 'snow', 20: 'snow', 21: 'snow',
      22: 'snow', 23: 'snow', 24: 'snow', 25: 'snow',
      26: 'rainy', 29: 'rainy', 30: 'sunny', 31: 'cloudy',
      32: 'cloudy', 33: 'moon', 34: 'moon', 35: 'partly-sunny',
      36: 'partly-sunny', 37: 'cloudy', 38: 'cloudy',
      39: 'rainy', 40: 'rainy', 41: 'thunderstorm', 42: 'thunderstorm',
      43: 'snow', 44: 'snow',
    };
    return iconMap[iconCode] || 'partly-sunny';
  }
  // Fallback to conditions text
  const cond = (conditions || '').toLowerCase();
  if (cond.includes('sun') || cond.includes('clear')) return 'sunny';
  if (cond.includes('cloud') || cond.includes('overcast')) return 'cloudy';
  if (cond.includes('rain') || cond.includes('shower')) return 'rainy';
  if (cond.includes('thunder') || cond.includes('storm')) return 'thunderstorm';
  if (cond.includes('snow')) return 'snow';
  return 'partly-sunny';
};

// Get gradient colors based on conditions
const getGradientColors = (conditions) => {
  const cond = (conditions || '').toLowerCase();
  if (cond.includes('sun') || cond.includes('clear')) {
    return ['#4A90E2', '#5CA0F2', '#74B0FF'];
  }
  if (cond.includes('cloud') || cond.includes('overcast')) {
    return ['#6B7C93', '#8494A7', '#9DAABB'];
  }
  if (cond.includes('rain') || cond.includes('shower')) {
    return ['#4A6FA5', '#5A7FB5', '#6A8FC5'];
  }
  if (cond.includes('thunder') || cond.includes('storm')) {
    return ['#3D4F6F', '#4D5F7F', '#5D6F8F'];
  }
  return ['#4A90E2', '#5CA0F2', '#74B0FF']; // Default sunny blue
};

// Format day name
const getDayName = (dateStr, index) => {
  if (index === 0) return 'Today';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export default function WeatherForecastCard({ data = {} }) {
  const { theme } = useApp();

  // Handle different data formats from API
  const current = data.current || {};
  const forecast = data.forecast || data.daily || [];
  const location = data.location || {};

  // Extract current weather info
  const temperature = current.temperature ?? current.temp ?? forecast[0]?.max_temp ?? '--';
  const conditions = current.conditions ?? current.weatherText ?? forecast[0]?.day_conditions ?? 'Weather';
  const humidity = current.humidity ?? '--';
  const windSpeed = current.wind_speed ?? current.windSpeed ?? '--';

  // Get high/low from first forecast day (handle empty forecast gracefully)
  const todayHigh = forecast[0]?.max_temp ?? forecast[0]?.temperatureMax ?? temperature;
  const todayLow = forecast.length > 0
    ? (forecast[0]?.min_temp ?? forecast[0]?.temperatureMin ?? '--')
    : null; // Don't show low temp if no forecast data

  // Location name - prefer display name over coordinates
  const locationName = location.name || location.displayName || location.city ||
    data.locationName || 'Your Location';

  const gradientColors = getGradientColors(conditions);
  const weatherIcon = getWeatherIcon(current.icon, conditions);

  if (!forecast.length && !current.temperature) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="cloud-offline" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Weather data unavailable
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      {/* Main Weather Display */}
      <View style={styles.mainSection}>
        <AppIcon name={weatherIcon} size={56} color="#FFFFFF" />
        <View style={styles.tempContainer}>
          <Text style={styles.tempLarge}>{Math.round(todayHigh)}°</Text>
          {todayLow !== null && (
            <Text style={styles.tempSmall}>{Math.round(todayLow)}°</Text>
          )}
        </View>
      </View>

      {/* Location */}
      <Text style={styles.locationText}>{locationName}</Text>

      {/* Conditions */}
      <Text style={styles.conditionsText}>{conditions}</Text>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppIcon name="water-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{humidity}%</Text>
        </View>
        <View style={styles.statItem}>
          <AppIcon name="speedometer-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{windSpeed} km/h</Text>
        </View>
      </View>

      {/* Forecast Strip */}
      {forecast.length > 1 && (
        <View style={styles.forecastStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastScroll}>
            {forecast.slice(0, 5).map((day, index) => {
              const dayIcon = getWeatherIcon(
                day.icon || day.Day?.Icon,
                day.day_conditions || day.Day?.IconPhrase
              );
              const high = day.max_temp ?? day.temperatureMax ?? day.Temperature?.Maximum?.Value;
              return (
                <View key={index} style={styles.forecastDay}>
                  <Text style={styles.forecastDayName}>
                    {getDayName(day.date || day.Date, index)}
                  </Text>
                  <AppIcon name={dayIcon} size={24} color="#FFFFFF" />
                  <Text style={styles.forecastTemp}>{Math.round(high)}°</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Source Attribution */}
      <Text style={styles.attribution}>AccuWeather</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  tempLarge: {
    fontSize: 56,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 64,
  },
  tempSmall: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  conditionsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  forecastStrip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  forecastScroll: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  forecastDay: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    minWidth: 56,
  },
  forecastDayName: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  forecastTemp: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
    marginTop: 4,
  },
  attribution: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  errorContainer: {
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
