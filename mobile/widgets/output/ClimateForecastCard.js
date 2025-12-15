/**
 * ClimateForecastCard - Visually appealing seasonal forecast
 *
 * Design: Purple/indigo gradient (seasonal theme)
 * - Large dominant probability display
 * - Tri-color probability bars
 * - Monthly forecast cards
 * - Crop yield predictions
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Probability bar with three segments
function ProbabilityBar({ below = 0, normal = 0, above = 0 }) {
  return (
    <View style={styles.probBarContainer}>
      <View style={styles.probBar}>
        <View style={[styles.probSegment, { flex: below, backgroundColor: '#FF9800' }]} />
        <View style={[styles.probSegment, { flex: normal, backgroundColor: '#4CAF50' }]} />
        <View style={[styles.probSegment, { flex: above, backgroundColor: '#2196F3' }]} />
      </View>
      <View style={styles.probLabels}>
        <Text style={styles.probLabel}>{below}%</Text>
        <Text style={styles.probLabel}>{normal}%</Text>
        <Text style={styles.probLabel}>{above}%</Text>
      </View>
    </View>
  );
}

// Monthly forecast card
function MonthCard({ month, year, measure, below, normal, above }) {
  const monthName = MONTH_NAMES[month - 1] || `M${month}`;
  const dominant = Math.max(below, normal, above);
  const dominantType = dominant === above ? 'above' : dominant === normal ? 'normal' : 'below';
  const dominantColor = dominant === above ? '#2196F3' : dominant === normal ? '#4CAF50' : '#FF9800';

  return (
    <View style={styles.monthCard}>
      <Text style={styles.monthName}>{monthName}</Text>
      <Text style={styles.monthYear}>{year}</Text>
      <View style={[styles.dominantBadge, { backgroundColor: dominantColor }]}>
        <Text style={styles.dominantText}>{dominant}%</Text>
      </View>
      <Text style={styles.dominantLabel}>{dominantType}</Text>
      {measure && <Text style={styles.measureText}>{measure}</Text>}
    </View>
  );
}

// Crop yield prediction card
function YieldCard({ cultivar, soil, predictions = [] }) {
  return (
    <View style={styles.yieldCard}>
      <Text style={styles.cultivarName}>{cultivar}</Text>
      {soil && <Text style={styles.soilText}>Soil: {soil}</Text>}
      {predictions.map((pred, index) => (
        <View key={index} style={styles.predRow}>
          <Text style={styles.predLabel}>{pred.measure}</Text>
          <View style={styles.predValues}>
            <Text style={styles.predMedian}>{pred.median?.toFixed(0) || '?'}</Text>
            {pred.range && (
              <Text style={styles.predRange}>
                ({pred.range.min?.toFixed(0)}-{pred.range.max?.toFixed(0)})
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ClimateForecastCard({ data = {} }) {
  const { theme } = useApp();

  const {
    station,
    confidence,
    climate_forecasts = [],
    crop_forecasts = [],
    message,
  } = data;

  // Flatten climate forecasts
  const allForecasts = climate_forecasts.flatMap(cf => cf.forecasts || []);

  // Handle no data case
  if (message || (allForecasts.length === 0 && crop_forecasts.length === 0)) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="calendar" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          {message || 'Forecast data unavailable'}
        </Text>
      </View>
    );
  }

  // Calculate dominant outlook from first forecast
  const firstForecast = allForecasts[0]?.probabilities?.[0] || {};
  const dominantValue = Math.max(
    firstForecast.below_normal || 0,
    firstForecast.normal || 0,
    firstForecast.above_normal || 0
  );
  const dominantType = dominantValue === (firstForecast.above_normal || 0)
    ? 'Above Normal'
    : dominantValue === (firstForecast.normal || 0)
      ? 'Normal'
      : 'Below Normal';

  return (
    <LinearGradient colors={['#512DA8', '#673AB7', '#7E57C2']} style={styles.container}>
      {/* Main Display */}
      <View style={styles.mainSection}>
        <AppIcon name="calendar" size={48} color="#FFFFFF" />
        <View style={styles.outlookContainer}>
          <Text style={styles.outlookLarge}>{dominantValue || '?'}%</Text>
          <View style={styles.outlookInfo}>
            <Text style={styles.outlookType}>{dominantType}</Text>
            {confidence !== undefined && (
              <Text style={styles.confidenceText}>{(confidence * 100).toFixed(0)}% conf.</Text>
            )}
          </View>
        </View>
      </View>

      {/* Station Badge */}
      {station && (
        <View style={styles.stationRow}>
          <AppIcon name="location" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.stationText}>{station}</Text>
          <Text style={styles.seasonBadge}>Seasonal Outlook</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Below</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>Above</Text>
        </View>
      </View>

      {/* Monthly Forecasts */}
      {allForecasts.length > 0 && (
        <View style={styles.monthsSection}>
          <Text style={styles.sectionLabel}>Monthly Outlook</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsScroll}>
            {allForecasts.map((forecast, index) => {
              const prob = forecast.probabilities?.[0] || {};
              return (
                <MonthCard
                  key={index}
                  month={forecast.month}
                  year={forecast.year}
                  measure={prob.measure}
                  below={prob.below_normal || 0}
                  normal={prob.normal || 0}
                  above={prob.above_normal || 0}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Crop Yield Forecasts */}
      {crop_forecasts.length > 0 && (
        <View style={styles.cropsSection}>
          <Text style={styles.sectionLabel}>Crop Yield Predictions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropsScroll}>
            {crop_forecasts.map((yieldData, index) => (
              <YieldCard
                key={index}
                cultivar={yieldData.cultivar}
                soil={yieldData.soil}
                predictions={yieldData.predictions}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Attribution */}
      <Text style={styles.attribution}>EDACaP / Aclimate Ethiopia</Text>
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
  outlookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  outlookLarge: {
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  outlookInfo: {
    alignItems: 'flex-start',
  },
  outlookType: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  confidenceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  stationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    textAlign: 'center',
  },
  seasonBadge: {
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  monthsSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  monthsScroll: {
    gap: SPACING.sm,
  },
  monthCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    minWidth: 80,
    alignItems: 'center',
  },
  monthName: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  monthYear: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: SPACING.xs,
  },
  dominantBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 2,
  },
  dominantText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  dominantLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  measureText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  cropsSection: {
    marginBottom: SPACING.sm,
  },
  cropsScroll: {
    gap: SPACING.sm,
  },
  yieldCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    minWidth: 140,
  },
  cultivarName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  soilText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: SPACING.sm,
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  predLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  predValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  predMedian: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  predRange: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
  },
  probBarContainer: {
    marginTop: SPACING.xs,
  },
  probBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  probSegment: {
    height: '100%',
  },
  probLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  probLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
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
