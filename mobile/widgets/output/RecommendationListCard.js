/**
 * RecommendationListCard - Output widget for crop recommendations
 *
 * Features:
 * - Growth stage indicator
 * - Recommendations list with icons
 * - Priority indicators
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Growth stage progress bar
function GrowthStageBar({ stage, theme }) {
  const stages = ['germination', 'vegetative', 'flowering', 'grain_filling', 'maturity'];
  const currentIndex = stages.indexOf(stage);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 50;

  const stageLabels = {
    germination: 'Germination',
    vegetative: 'Vegetative',
    flowering: 'Flowering',
    grain_filling: 'Grain Filling',
    maturity: 'Maturity',
  };

  return (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <Text style={[styles.stageLabel, { color: theme.textMuted }]}>Growth Stage</Text>
        <Text style={[styles.stageName, { color: theme.accent }]}>
          {stageLabels[stage] || stage}
        </Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: theme.surfaceVariant }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%`, backgroundColor: theme.accent },
          ]}
        />
      </View>
      <View style={styles.stageMarkers}>
        {stages.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stageMarker,
              { backgroundColor: i <= currentIndex ? theme.accent : theme.surfaceVariant },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// Priority icon and color
const getPriorityStyle = (priority, theme) => {
  switch (priority) {
    case 'high':
      return { icon: 'alert-circle', color: theme.error };
    case 'medium':
      return { icon: 'warning', color: theme.warning };
    case 'low':
    default:
      return { icon: 'information-circle', color: theme.info };
  }
};

function RecommendationItem({ recommendation, theme }) {
  const { icon, color } = getPriorityStyle(recommendation.priority, theme);

  return (
    <View style={[styles.recItem, { borderLeftColor: color }]}>
      <View style={styles.recHeader}>
        <AppIcon name={icon} size={18} color={color} />
        <Text style={[styles.recTitle, { color: theme.text }]}>
          {recommendation.title}
        </Text>
        {recommendation.priority && (
          <View style={[styles.priorityBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.priorityText, { color }]}>
              {recommendation.priority.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.recDescription, { color: theme.textMuted }]}>
        {recommendation.description}
      </Text>
      {recommendation.action && (
        <View style={styles.actionRow}>
          <AppIcon name="arrow-forward" size={14} color={theme.accent} />
          <Text style={[styles.actionText, { color: theme.accent }]}>
            {recommendation.action}
          </Text>
        </View>
      )}
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
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <AppIcon name="leaf" size={24} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>Crop Recommendations</Text>
        </View>
        <Text style={[styles.noDataText, { color: theme.textMuted }]}>
          No recommendations available. Please try adjusting your inputs.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppIcon name="leaf" size={24} color={theme.accent} />
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: theme.text }]}>Crop Recommendations</Text>
          {crop && (
            <Text style={[styles.cropName, { color: theme.textMuted }]}>
              {crop.charAt(0).toUpperCase() + crop.slice(1)}
            </Text>
          )}
        </View>
      </View>

      {/* Growth Stage Bar */}
      {growth_stage && <GrowthStageBar stage={growth_stage} theme={theme} />}

      {/* Weather Summary */}
      {weather_summary && (
        <View style={[styles.weatherBox, { backgroundColor: theme.surfaceVariant }]}>
          <AppIcon name="partly-sunny" size={16} color={theme.textMuted} />
          <Text style={[styles.weatherText, { color: theme.textMuted }]}>
            {weather_summary}
          </Text>
        </View>
      )}

      {/* Recommendations List */}
      <ScrollView style={styles.recList} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {recommendations.length} Recommendation{recommendations.length !== 1 ? 's' : ''}
        </Text>
        {recommendations.map((rec, index) => (
          <RecommendationItem key={index} recommendation={rec} theme={theme} />
        ))}
      </ScrollView>

      {/* Source */}
      <Text style={[styles.sourceText, { color: theme.textMuted }]}>
        Source: TomorrowNow Decision Support System
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
  cropName: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  stageContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  stageLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  stageName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stageMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  stageMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weatherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    padding: SPACING.sm,
    borderRadius: SPACING.radiusSm,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  weatherText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
  },
  recList: {
    maxHeight: 300,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  recItem: {
    marginBottom: SPACING.md,
    paddingLeft: SPACING.md,
    borderLeftWidth: 3,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: SPACING.radiusFull,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  recDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * 1.4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  actionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
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
