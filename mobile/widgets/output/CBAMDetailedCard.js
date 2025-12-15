/**
 * CBAMDetailedCard - Detailed Agricultural Weather Metrics
 *
 * Design: Teal gradient (agricultural theme)
 * - Key metrics grid (ET, Solar, Wind, Rain)
 * - Irrigation balance indicator
 * - Clean data presentation
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Get water balance status
const getWaterBalance = (rainfall, et) => {
  const balance = rainfall - et;
  if (balance >= 2) return { status: 'surplus', color: '#4CAF50', text: 'Water Surplus', icon: 'water' };
  if (balance >= -2) return { status: 'balanced', color: '#FF9800', text: 'Balanced', icon: 'water-outline' };
  return { status: 'deficit', color: '#F44336', text: 'Irrigation Needed', icon: 'alert-circle' };
};

export default function CBAMDetailedCard({ data = {} }) {
  const { theme } = useApp();

  const daily = data.daily || data.forecast || [];
  const location = data.location || {};

  if (!daily.length) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="analytics" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Detailed weather data unavailable
        </Text>
      </View>
    );
  }

  // Calculate totals
  const totalRain = daily.reduce((sum, d) => sum + (d.total_rainfall || d.rainfall || 0), 0);
  const totalET = daily.reduce((sum, d) => sum + (d.total_et || d.total_evapotranspiration_flux || 0), 0);
  const avgSolar = daily.reduce((sum, d) => sum + (d.solar_radiation || 0), 0) / daily.length;
  const maxGust = Math.max(...daily.map(d => d.wind_gusts_max || d.windGust || 0));
  const avgTemp = daily.reduce((sum, d) =>
    sum + ((d.temp_max || d.max_temperature || 25) + (d.temp_min || d.min_temperature || 15)) / 2, 0) / daily.length;

  const waterBalance = getWaterBalance(totalRain, totalET);
  const locationName = location.name || 'Kenya';

  return (
    <LinearGradient colors={['#00796B', '#009688', '#26A69A']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AppIcon name="analytics" size={22} color="#FFFFFF" />
        <View>
          <Text style={styles.title}>Agricultural Metrics</Text>
          <Text style={styles.subtitle}>{locationName} • {daily.length} days</Text>
        </View>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <AppIcon name="thermometer" size={18} color="#FFFFFF" />
          <Text style={styles.metricValue}>{Math.round(avgTemp)}°</Text>
          <Text style={styles.metricLabel}>Avg Temp</Text>
        </View>
        <View style={styles.metricItem}>
          <AppIcon name="rainy" size={18} color="#FFFFFF" />
          <Text style={styles.metricValue}>{totalRain.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>Rain mm</Text>
        </View>
        <View style={styles.metricItem}>
          <AppIcon name="leaf" size={18} color="#FFFFFF" />
          <Text style={styles.metricValue}>{totalET.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>ET mm</Text>
        </View>
        <View style={styles.metricItem}>
          <AppIcon name="sunny" size={18} color="#FFFFFF" />
          <Text style={styles.metricValue}>{avgSolar.toFixed(0)}</Text>
          <Text style={styles.metricLabel}>Solar W/m²</Text>
        </View>
      </View>

      {/* Water Balance Indicator */}
      <View style={[styles.balanceCard, { backgroundColor: waterBalance.color + '30' }]}>
        <AppIcon name={waterBalance.icon} size={20} color={waterBalance.color} />
        <View style={styles.balanceContent}>
          <Text style={[styles.balanceText, { color: waterBalance.color }]}>{waterBalance.text}</Text>
          <Text style={styles.balanceValue}>
            {Math.abs(totalRain - totalET).toFixed(1)} mm {waterBalance.status === 'deficit' ? 'needed' : 'balance'}
          </Text>
        </View>
      </View>

      {/* Daily Summary Strip */}
      <View style={styles.dailyStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dailyScroll}>
          {daily.slice(0, 7).map((day, index) => {
            const date = new Date(day.date);
            const rain = day.total_rainfall || day.rainfall || 0;
            const et = day.total_et || day.total_evapotranspiration_flux || 0;
            return (
              <View key={index} style={styles.dayItem}>
                <Text style={styles.dayName}>
                  {index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={styles.dayRain}>🌧 {rain.toFixed(1)}</Text>
                <Text style={styles.dayET}>🌿 {et.toFixed(1)}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Wind Gust Alert */}
      {maxGust > 30 && (
        <View style={styles.alertRow}>
          <AppIcon name="flash" size={14} color="#FFD54F" />
          <Text style={styles.alertText}>Max wind gust: {maxGust.toFixed(0)} km/h</Text>
        </View>
      )}

      {/* Attribution */}
      <Text style={styles.attribution}>CBAM via TomorrowNow GAP</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
    textAlign: 'center',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  balanceContent: {
    flex: 1,
  },
  balanceText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  balanceValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  dailyStrip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  dailyScroll: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  dayItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    minWidth: 52,
  },
  dayName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
  },
  dayRain: {
    fontSize: 11,
    color: '#81D4FA',
  },
  dayET: {
    fontSize: 11,
    color: '#A5D6A7',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  alertText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#FFD54F',
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
