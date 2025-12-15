/**
 * DietRecommendationCard - Visually appealing feed recommendation
 *
 * Design: Orange/amber gradient (nutrition theme)
 * - Large cost display
 * - Feed mix list
 * - Nutrient balance bars
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Nutrient status
const getNutrientStatus = (actual, required) => {
  if (!actual || !required) return { percent: 0, status: 'unknown' };
  const ratio = actual / required;
  const percent = Math.min(100, ratio * 100);
  if (ratio >= 0.9 && ratio <= 1.1) return { percent, status: 'optimal' };
  if (ratio < 0.9) return { percent, status: 'low' };
  return { percent: 100, status: 'high' };
};

function NutrientBar({ label, actual, required, unit }) {
  const { percent, status } = getNutrientStatus(actual, required);
  const barColor = status === 'optimal' ? '#4CAF50' : status === 'low' ? '#FF9800' : '#2196F3';

  return (
    <View style={styles.nutrientItem}>
      <View style={styles.nutrientHeader}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientValue}>
          {actual?.toFixed(1) || '0'} / {required?.toFixed(1) || '0'} {unit}
        </Text>
      </View>
      <View style={styles.nutrientBarBg}>
        <View style={[styles.nutrientBarFill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export default function DietRecommendationCard({ data = {} }) {
  const { theme } = useApp();

  const {
    feeds = [],
    total_cost,
    expected_milk,
    nutrients,
    warnings = [],
  } = data;

  if (!feeds || feeds.length === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="nutrition" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Diet recommendation unavailable
        </Text>
      </View>
    );
  }

  const totalQuantity = feeds.reduce((sum, f) => sum + (f.quantity || 0), 0);

  return (
    <LinearGradient colors={['#E65100', '#F57C00', '#FF9800']} style={styles.container}>
      {/* Main Display */}
      <View style={styles.mainSection}>
        <AppIcon name="nutrition" size={48} color="#FFFFFF" />
        <View style={styles.costContainer}>
          <Text style={styles.costLarge}>{total_cost?.toFixed(0) || '?'}</Text>
          <Text style={styles.costCurrency}>ETB/day</Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppIcon name="list" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{feeds.length} feeds</Text>
        </View>
        <View style={styles.statItem}>
          <AppIcon name="scale" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{totalQuantity.toFixed(1)} kg/day</Text>
        </View>
        {expected_milk && (
          <View style={styles.statItem}>
            <AppIcon name="water" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>{expected_milk.toFixed(1)} L milk</Text>
          </View>
        )}
      </View>

      {/* Feed Mix */}
      <View style={styles.feedSection}>
        <Text style={styles.sectionLabel}>Recommended Feed Mix</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
          {feeds.map((feed, index) => (
            <View key={index} style={styles.feedItem}>
              <Text style={styles.feedName} numberOfLines={1}>{feed.name}</Text>
              <Text style={styles.feedQty}>{feed.quantity?.toFixed(1) || '0'} kg</Text>
              {feed.cost && <Text style={styles.feedCost}>{feed.cost.toFixed(0)} ETB</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Nutrient Balance */}
      {nutrients && (
        <View style={styles.nutrientSection}>
          <Text style={styles.sectionLabel}>Nutrient Balance</Text>
          <NutrientBar label="Dry Matter" actual={nutrients.dm_actual} required={nutrients.dm_required} unit="kg" />
          <NutrientBar label="Energy" actual={nutrients.me_actual} required={nutrients.me_required} unit="MJ" />
          <NutrientBar label="Protein" actual={nutrients.cp_actual} required={nutrients.cp_required} unit="g" />
        </View>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={styles.warningSection}>
          {warnings.map((warning, index) => (
            <View key={index} style={styles.warningRow}>
              <AppIcon name="warning" size={14} color="#FFD54F" />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Attribution */}
      <Text style={styles.attribution}>Feed Formulation Ethiopia</Text>
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
  costContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  costLarge: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 56,
  },
  costCurrency: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
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
  feedSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  feedScroll: {
    gap: SPACING.sm,
  },
  feedItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: SPACING.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  feedName: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 2,
  },
  feedQty: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  feedCost: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  nutrientSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  nutrientItem: {
    marginBottom: SPACING.sm,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nutrientLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  nutrientBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nutrientBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  warningSection: {
    marginBottom: SPACING.sm,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
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
