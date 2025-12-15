/**
 * SalientForecastCard - GAP Seasonal Weather Forecast
 *
 * Design: Green gradient theme (TomorrowNow Kenya)
 * - Large current temp display
 * - Horizontal forecast strip
 * - Period summary
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Weather icon based on conditions
const getWeatherIcon = (rainChance, temp) => {
  if (rainChance >= 70) return 'rainy';
  if (rainChance >= 40) return 'partly-sunny';
  if (temp >= 30) return 'sunny';
  return 'partly-sunny';
};

// Get gradient colors - green theme for TomorrowNow
const getGradientColors = (avgRainChance) => {
  if (avgRainChance >= 60) return ['#2E7D32', '#43A047', '#66BB6A']; // Rainy - darker green
  if (avgRainChance >= 30) return ['#388E3C', '#4CAF50', '#81C784']; // Mixed
  return ['#43A047', '#66BB6A', '#A5D6A7']; // Clear - lighter green
};

// Format day name
const getDayName = (dateStr, index) => {
  if (index === 0) return 'Today';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export default function SalientForecastCard({ data = {} }) {
  const { theme } = useApp();

  const forecastDays = data.daily || data.forecast || [];
  const summary = data.summary || {};
  const location = data.location || {};

  if (!forecastDays.length) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="cloud-offline" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Weather data unavailable
        </Text>
      </View>
    );
  }

  // Calculate averages
  const avgRainChance = forecastDays.reduce((sum, d) =>
    sum + (d.rain_chance || d.precipitationProbability || 0), 0) / forecastDays.length;
  const avgTempHigh = forecastDays.reduce((sum, d) =>
    sum + (d.temp_max || d.temperatureMax || 25), 0) / forecastDays.length;
  const avgTempLow = forecastDays.reduce((sum, d) =>
    sum + (d.temp_min || d.temperatureMin || 15), 0) / forecastDays.length;
  const totalRain = forecastDays.reduce((sum, d) =>
    sum + (d.rainfall || d.precipitation || 0), 0);

  const locationName = location.name || location.displayName || 'Kenya';
  const gradientColors = getGradientColors(avgRainChance);
  const weatherIcon = getWeatherIcon(avgRainChance, avgTempHigh);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      {/* Main Display */}
      <View style={styles.mainSection}>
        <AppIcon name={weatherIcon} size={52} color="#FFFFFF" />
        <View style={styles.tempContainer}>
          <Text style={styles.tempLarge}>{Math.round(avgTempHigh)}°</Text>
          <Text style={styles.tempSmall}>{Math.round(avgTempLow)}°</Text>
        </View>
      </View>

      {/* Location */}
      <Text style={styles.locationText}>{locationName}</Text>

      {/* Period Info */}
      <Text style={styles.periodText}>
        {forecastDays.length}-day forecast
      </Text>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppIcon name="rainy" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{totalRain.toFixed(1)} mm</Text>
        </View>
        <View style={styles.statItem}>
          <AppIcon name="water-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{Math.round(avgRainChance)}% avg</Text>
        </View>
      </View>

      {/* Forecast Strip */}
      <View style={styles.forecastStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastScroll}>
          {forecastDays.slice(0, 7).map((day, index) => {
            const rainChance = day.rain_chance || day.precipitationProbability || 0;
            const tempHigh = day.temp_max || day.temperatureMax || 25;
            const dayIcon = getWeatherIcon(rainChance, tempHigh);
            return (
              <View key={index} style={styles.forecastDay}>
                <Text style={styles.forecastDayName}>
                  {getDayName(day.date, index)}
                </Text>
                <AppIcon name={dayIcon} size={22} color="#FFFFFF" />
                <Text style={styles.forecastTemp}>{Math.round(tempHigh)}°</Text>
                <View style={styles.rainIndicator}>
                  <Text style={styles.rainPercent}>{Math.round(rainChance)}%</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Attribution */}
      <Text style={styles.attribution}>TomorrowNow GAP Platform</Text>
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
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  tempSmall: {
    fontSize: 26,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  periodText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
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
    color: 'rgba(255,255,255,0.85)',
  },
  forecastStrip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  forecastScroll: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  forecastDay: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    minWidth: 50,
  },
  forecastDayName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3,
  },
  forecastTemp: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
    marginTop: 3,
  },
  rainIndicator: {
    marginTop: 2,
  },
  rainPercent: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
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
