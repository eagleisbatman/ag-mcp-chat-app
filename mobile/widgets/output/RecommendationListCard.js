/**
 * RecommendationListCard - Visually appealing crop recommendations
 *
 * Design: Teal/cyan gradient (agriculture theme)
 * - Large crop & stage display
 * - Visual growth progress
 * - Priority-coded recommendations
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

const STAGES = ['germination', 'vegetative', 'flowering', 'grain_filling', 'maturity'];
const STAGE_LABELS = {
  germination: 'Germination',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  grain_filling: 'Grain Fill',
  maturity: 'Maturity',
};

// Priority colors
const PRIORITY_COLORS = {
  high: '#EF5350',
  medium: '#FF9800',
  low: '#4CAF50',
};

// Growth stage progress indicator
function GrowthProgress({ stage }) {
  const currentIndex = STAGES.indexOf(stage);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STAGES.length) * 100 : 50;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.progressMarkers}>
        {STAGES.map((s, i) => (
          <View
            key={s}
            style={[
              styles.marker,
              { backgroundColor: i <= currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// Recommendation item
function RecommendationItem({ recommendation }) {
  const priorityColor = PRIORITY_COLORS[recommendation.priority] || PRIORITY_COLORS.low;

  return (
    <View style={styles.recItem}>
      <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
      <View style={styles.recContent}>
        <View style={styles.recHeader}>
          <Text style={styles.recTitle}>{recommendation.title}</Text>
          {recommendation.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>{recommendation.priority}</Text>
            </View>
          )}
        </View>
        <Text style={styles.recDescription}>{recommendation.description}</Text>
        {recommendation.action && (
          <View style={styles.actionRow}>
            <AppIcon name="arrow-forward" size={12} color="#FFFFFF" />
            <Text style={styles.actionText}>{recommendation.action}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function RecommendationListCard({ data = {} }) {
  const { theme } = useApp();

  const {
    crop,
    growth_stage,
    recommendations = [],
    weather_summary,
  } = data;

  if (!recommendations || recommendations.length === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="leaf" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          No recommendations available
        </Text>
      </View>
    );
  }

  const cropName = crop ? crop.charAt(0).toUpperCase() + crop.slice(1) : 'Crop';
  const stageName = STAGE_LABELS[growth_stage] || growth_stage || 'Unknown';

  // Count by priority
  const highCount = recommendations.filter(r => r.priority === 'high').length;
  const mediumCount = recommendations.filter(r => r.priority === 'medium').length;

  return (
    <LinearGradient colors={['#00796B', '#009688', '#26A69A']} style={styles.container}>
      {/* Main Display */}
      <View style={styles.mainSection}>
        <AppIcon name="leaf" size={48} color="#FFFFFF" />
        <View style={styles.cropInfo}>
          <Text style={styles.cropName}>{cropName}</Text>
          <View style={styles.stageBadge}>
            <Text style={styles.stageText}>{stageName}</Text>
          </View>
        </View>
      </View>

      {/* Growth Progress */}
      {growth_stage && <GrowthProgress stage={growth_stage} />}

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{recommendations.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        {highCount > 0 && (
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: PRIORITY_COLORS.high }]} />
            <Text style={styles.statValue}>{highCount}</Text>
            <Text style={styles.statLabel}>Urgent</Text>
          </View>
        )}
        {mediumCount > 0 && (
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: PRIORITY_COLORS.medium }]} />
            <Text style={styles.statValue}>{mediumCount}</Text>
            <Text style={styles.statLabel}>Important</Text>
          </View>
        )}
      </View>

      {/* Weather Summary */}
      {weather_summary && (
        <View style={styles.weatherBox}>
          <AppIcon name="partly-sunny" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.weatherText}>{weather_summary}</Text>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.recSection}>
        <Text style={styles.sectionLabel}>Recommendations</Text>
        <ScrollView style={styles.recScroll} showsVerticalScrollIndicator={false}>
          {recommendations.map((rec, index) => (
            <RecommendationItem key={index} recommendation={rec} />
          ))}
        </ScrollView>
      </View>

      {/* Attribution */}
      <Text style={styles.attribution}>TomorrowNow Decision Support</Text>
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
  cropInfo: {
    alignItems: 'flex-start',
  },
  cropName: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  stageBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  stageText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  weatherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.sm,
    borderRadius: 10,
    marginBottom: SPACING.md,
  },
  weatherText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  recSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  recScroll: {
    maxHeight: 200,
  },
  recItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: SPACING.sm,
  },
  recContent: {
    flex: 1,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  recDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  actionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.medium,
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
