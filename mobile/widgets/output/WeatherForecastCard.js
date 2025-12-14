/**
 * WeatherForecastCard - Output widget for weather forecast display
 *
 * Features:
 * - Current conditions header (temp, humidity, icon)
 * - Daily forecast list (date, high/low, conditions, rain%)
 * - Wind & humidity details
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Weather icon mapping
const getWeatherIcon = (iconCode) => {
  // AccuWeather icon codes
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
  return iconMap[iconCode] || 'cloud';
};

function CurrentConditions({ current, theme }) {
  if (!current) return null;

  return (
    <View style={[styles.currentSection, { backgroundColor: theme.accentLight }]}>
      <View style={styles.currentMain}>
        <AppIcon
          name={getWeatherIcon(current.icon)}
          size={48}
          color={theme.accent}
        />
        <View style={styles.currentTemp}>
          <Text style={[styles.tempLarge, { color: theme.text }]}>
            {Math.round(current.temperature)}°
          </Text>
          <Text style={[styles.feelsLike, { color: theme.textMuted }]}>
            Feels like {Math.round(current.realFeelTemperature || current.temperature)}°
          </Text>
        </View>
      </View>
      <Text style={[styles.weatherText, { color: theme.text }]}>
        {current.weatherText || 'Current conditions'}
      </Text>
      <View style={styles.currentDetails}>
        <View style={styles.detailItem}>
          <AppIcon name="water" size={16} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.textMuted }]}>
            {current.humidity}%
          </Text>
        </View>
        <View style={styles.detailItem}>
          <AppIcon name="speedometer" size={16} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.textMuted }]}>
            {current.windSpeed} km/h
          </Text>
        </View>
        {current.uvIndex !== undefined && (
          <View style={styles.detailItem}>
            <AppIcon name="sunny" size={16} color={theme.textMuted} />
            <Text style={[styles.detailText, { color: theme.textMuted }]}>
              UV {current.uvIndex}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function DailyForecastItem({ day, theme }) {
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.dayRow, { borderBottomColor: theme.border }]}>
      <View style={styles.dayInfo}>
        <Text style={[styles.dayName, { color: theme.text }]}>{dayName}</Text>
        <Text style={[styles.dayDate, { color: theme.textMuted }]}>{dateStr}</Text>
      </View>
      <View style={styles.dayIcon}>
        <AppIcon name={getWeatherIcon(day.icon)} size={24} color={theme.accent} />
      </View>
      <View style={styles.dayTemps}>
        <Text style={[styles.tempHigh, { color: theme.text }]}>
          {Math.round(day.temperatureMax)}°
        </Text>
        <Text style={[styles.tempLow, { color: theme.textMuted }]}>
          {Math.round(day.temperatureMin)}°
        </Text>
      </View>
      <View style={styles.dayRain}>
        <AppIcon name="water" size={14} color={theme.info} />
        <Text style={[styles.rainText, { color: theme.textMuted }]}>
          {day.precipitationProbability || 0}%
        </Text>
      </View>
    </View>
  );
}

export default function WeatherForecastCard({ data = {} }) {
  const { theme } = useApp();

  const { current, daily, location } = data;

  if (!daily || daily.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          No weather data available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Location header */}
      {location && (
        <View style={styles.locationHeader}>
          <AppIcon name="location" size={16} color={theme.accent} />
          <Text style={[styles.locationText, { color: theme.text }]}>
            {location.displayName || `${location.latitude?.toFixed(2)}, ${location.longitude?.toFixed(2)}`}
          </Text>
        </View>
      )}

      {/* Current conditions */}
      <CurrentConditions current={current} theme={theme} />

      {/* Daily forecast */}
      <View style={styles.dailySection}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {daily.length}-Day Forecast
        </Text>
        <ScrollView style={styles.dailyList} showsVerticalScrollIndicator={false}>
          {daily.map((day, index) => (
            <DailyForecastItem key={index} day={day} theme={theme} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: SPACING.radiusMd,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  currentSection: {
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: SPACING.radiusMd,
  },
  currentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  currentTemp: {
    flex: 1,
  },
  tempLarge: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 56,
  },
  feelsLike: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  weatherText: {
    fontSize: TYPOGRAPHY.sizes.base,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  currentDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  dailySection: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  dailyList: {
    maxHeight: 300,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayInfo: {
    width: 60,
  },
  dayName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  dayDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  dayIcon: {
    width: 40,
    alignItems: 'center',
  },
  dayTemps: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tempHigh: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  tempLow: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
  dayRain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 50,
    justifyContent: 'flex-end',
  },
  rainText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  errorText: {
    padding: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
