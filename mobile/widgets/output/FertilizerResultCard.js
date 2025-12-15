/**
 * FertilizerResultCard - Visually appealing fertilizer recommendations
 *
 * Design: Green/lime gradient (agriculture theme)
 * - Large yield display
 * - Organic vs Inorganic sections
 * - Application timing
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

export default function FertilizerResultCard({ data = {} }) {
  const { theme } = useApp();

  const {
    crop,
    organic = {},
    inorganic = {},
    expected_yield,
    timing = [],
  } = data;

  if (!organic.compost && !inorganic.urea) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="flask" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Fertilizer data unavailable
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#558B2F', '#689F38', '#7CB342']} style={styles.container}>
      {/* Main Yield Display */}
      <View style={styles.mainSection}>
        <AppIcon name="trending-up" size={48} color="#FFFFFF" />
        <View style={styles.yieldContainer}>
          <Text style={styles.yieldLarge}>{expected_yield?.toFixed(0) || '?'}</Text>
          <View style={styles.yieldInfo}>
            <Text style={styles.yieldUnit}>kg/ha</Text>
            <Text style={styles.yieldAlt}>({((expected_yield || 0) / 100).toFixed(1)} q/ha)</Text>
          </View>
        </View>
      </View>

      {/* Crop Badge */}
      {crop && (
        <View style={styles.cropRow}>
          <View style={styles.cropBadge}>
            <Text style={styles.cropText}>{crop.charAt(0).toUpperCase() + crop.slice(1)}</Text>
          </View>
          <Text style={styles.expectedText}>Expected Yield</Text>
        </View>
      )}

      {/* Fertilizer Sections */}
      <View style={styles.fertilizerGrid}>
        {/* Organic */}
        <View style={styles.fertSection}>
          <Text style={styles.sectionLabel}>Organic</Text>
          <View style={styles.fertItem}>
            <Text style={styles.fertValue}>{organic.compost?.toFixed(1) || '0'}</Text>
            <Text style={styles.fertName}>Compost (t/ha)</Text>
          </View>
          <View style={styles.fertItem}>
            <Text style={styles.fertValue}>{organic.vermicompost?.toFixed(1) || '0'}</Text>
            <Text style={styles.fertName}>Vermicompost (t/ha)</Text>
          </View>
        </View>

        {/* Inorganic */}
        <View style={styles.fertSection}>
          <Text style={styles.sectionLabel}>Inorganic</Text>
          <View style={styles.fertItem}>
            <Text style={styles.fertValue}>{inorganic.urea?.toFixed(0) || '0'}</Text>
            <Text style={styles.fertName}>Urea (kg/ha)</Text>
          </View>
          <View style={styles.fertItem}>
            <Text style={styles.fertValue}>{inorganic.nps?.toFixed(0) || '0'}</Text>
            <Text style={styles.fertName}>NPS (kg/ha)</Text>
          </View>
        </View>
      </View>

      {/* Application Timing */}
      {timing.length > 0 && (
        <View style={styles.timingSection}>
          <Text style={styles.sectionLabel}>Application Timing</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timingScroll}>
            {timing.map((item, index) => (
              <View key={index} style={styles.timingChip}>
                <AppIcon name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.timingText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Attribution */}
      <Text style={styles.attribution}>NextGen SSFR Ethiopia</Text>
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
    marginBottom: SPACING.xs,
  },
  yieldContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  yieldLarge: {
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  yieldInfo: {
    alignItems: 'flex-start',
  },
  yieldUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  yieldAlt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  cropBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cropText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  expectedText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  fertilizerGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  fertSection: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  fertItem: {
    marginBottom: SPACING.sm,
  },
  fertValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  fertName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  timingSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  timingScroll: {
    gap: SPACING.sm,
  },
  timingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timingText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#FFFFFF',
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
