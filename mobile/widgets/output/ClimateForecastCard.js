/**
 * ClimateForecastCard - Output widget for EDACaP climate forecasts
 *
 * Features:
 * - Seasonal outlook header
 * - Probability bars (Below Normal | Normal | Above Normal)
 * - Crop yield predictions
 * - Confidence level indicator
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';
import ProbabilityBar from '../shared/ProbabilityBar';

function MonthForecast({ forecast, theme }) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[forecast.month - 1] || `M${forecast.month}`;

  return (
    <View style={[styles.monthCard, { backgroundColor: theme.surfaceVariant }]}>
      <Text style={[styles.monthName, { color: theme.text }]}>
        {monthName} {forecast.year}
      </Text>
      {forecast.probabilities?.map((prob, index) => (
        <View key={index} style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: theme.textMuted }]}>
            {prob.measure}
          </Text>
          <ProbabilityBar
            probabilities={{
              below: prob.below_normal || 0,
              normal: prob.normal || 0,
              above: prob.above_normal || 0,
            }}
            height={16}
            showLabels={false}
          />
        </View>
      ))}
    </View>
  );
}

function CropYieldCard({ yield_data, theme }) {
  return (
    <View style={[styles.yieldCard, { backgroundColor: theme.surfaceVariant }]}>
      <Text style={[styles.cultivarName, { color: theme.text }]}>
        {yield_data.cultivar}
      </Text>
      <Text style={[styles.soilType, { color: theme.textMuted }]}>
        Soil: {yield_data.soil}
      </Text>
      {yield_data.predictions?.map((pred, index) => (
        <View key={index} style={styles.predictionRow}>
          <Text style={[styles.predLabel, { color: theme.textMuted }]}>{pred.measure}</Text>
          <View style={styles.predValues}>
            <Text style={[styles.predValue, { color: theme.accent }]}>
              {pred.median?.toFixed(0)}
            </Text>
            <Text style={[styles.predRange, { color: theme.textMuted }]}>
              ({pred.range?.min?.toFixed(0)} - {pred.range?.max?.toFixed(0)})
            </Text>
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

  // Handle no data case
  if (message || (climate_forecasts.length === 0 && crop_forecasts.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <AppIcon name="calendar" size={24} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>Seasonal Forecast</Text>
        </View>
        <Text style={[styles.noDataText, { color: theme.textMuted }]}>
          {message || 'No forecast data available for this location at this time.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppIcon name="calendar" size={24} color={theme.accent} />
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: theme.text }]}>Seasonal Forecast</Text>
          {station && (
            <Text style={[styles.stationName, { color: theme.textMuted }]}>
              Station: {station}
            </Text>
          )}
        </View>
        {confidence !== undefined && (
          <View style={[styles.confidenceBadge, { backgroundColor: theme.accentLight }]}>
            <Text style={[styles.confidenceText, { color: theme.accent }]}>
              {(confidence * 100).toFixed(0)}% conf.
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Probability Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>Below Normal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>Normal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.info }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>Above Normal</Text>
          </View>
        </View>

        {/* Climate Forecasts */}
        {climate_forecasts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Monthly Outlook
            </Text>
            {climate_forecasts.map((forecast, index) =>
              forecast.forecasts?.map((f, fIndex) => (
                <MonthForecast key={`${index}-${fIndex}`} forecast={f} theme={theme} />
              ))
            )}
          </View>
        )}

        {/* Crop Yield Forecasts */}
        {crop_forecasts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Crop Yield Predictions
            </Text>
            {crop_forecasts.map((yield_data, index) => (
              <CropYieldCard key={index} yield_data={yield_data} theme={theme} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Source */}
      <Text style={[styles.sourceText, { color: theme.textMuted }]}>
        Source: EDACaP / Aclimate
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: SPACING.radiusMd,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  stationName: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  confidenceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SPACING.radiusFull,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  content: {
    maxHeight: 400,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  monthCard: {
    padding: SPACING.md,
    borderRadius: SPACING.radiusSm,
    marginBottom: SPACING.sm,
  },
  monthName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
  },
  measureRow: {
    marginBottom: SPACING.xs,
  },
  measureLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: 4,
  },
  yieldCard: {
    padding: SPACING.md,
    borderRadius: SPACING.radiusSm,
    marginBottom: SPACING.sm,
  },
  cultivarName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  soilType: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.sm,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  predLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  predValues: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  predValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  predRange: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  sourceText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    padding: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  noDataText: {
    padding: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
