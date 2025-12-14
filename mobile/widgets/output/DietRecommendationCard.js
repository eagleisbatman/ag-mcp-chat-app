/**
 * DietRecommendationCard - Output widget for feed formulation results
 *
 * Features:
 * - Feed mix table (feed name, quantity kg/day, cost)
 * - Total daily cost
 * - Expected milk yield
 * - Nutrient balance indicators
 * - Warnings & recommendations
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';
import DataTable from '../shared/DataTable';

// Nutrient status colors
const getNutrientStatus = (actual, required, theme) => {
  if (!actual || !required) return { color: theme.textMuted, label: 'Unknown' };
  const ratio = actual / required;
  if (ratio >= 0.9 && ratio <= 1.1) return { color: theme.success, label: 'Optimal' };
  if (ratio >= 0.75 && ratio < 0.9) return { color: theme.warning, label: 'Low' };
  if (ratio > 1.1 && ratio <= 1.25) return { color: theme.warning, label: 'High' };
  if (ratio < 0.75) return { color: theme.error, label: 'Deficient' };
  return { color: theme.error, label: 'Excess' };
};

function FeedTable({ feeds, theme }) {
  if (!feeds || feeds.length === 0) {
    return (
      <Text style={[styles.noData, { color: theme.textMuted }]}>
        No feeds in recommendation
      </Text>
    );
  }

  return (
    <View style={styles.feedTable}>
      <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerCell, styles.feedNameCell, { color: theme.textMuted }]}>
          Feed
        </Text>
        <Text style={[styles.headerCell, styles.quantityCell, { color: theme.textMuted }]}>
          kg/day
        </Text>
        <Text style={[styles.headerCell, styles.costCell, { color: theme.textMuted }]}>
          Cost
        </Text>
      </View>
      {feeds.map((feed, index) => (
        <View
          key={index}
          style={[styles.tableRow, { borderBottomColor: theme.border }]}
        >
          <Text style={[styles.tableCell, styles.feedNameCell, { color: theme.text }]}>
            {feed.name}
          </Text>
          <Text style={[styles.tableCell, styles.quantityCell, { color: theme.text }]}>
            {feed.quantity?.toFixed(1) || '0.0'}
          </Text>
          <Text style={[styles.tableCell, styles.costCell, { color: theme.accent }]}>
            {feed.cost ? `${feed.cost.toFixed(0)} ETB` : '-'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function NutrientIndicator({ label, actual, required, unit, theme }) {
  const status = getNutrientStatus(actual, required, theme);

  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientInfo}>
        <Text style={[styles.nutrientLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.nutrientValue, { color: theme.textMuted }]}>
          {actual?.toFixed(1) || '?'} / {required?.toFixed(1) || '?'} {unit}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
}

function SummaryCard({ title, value, subtitle, icon, theme, highlight = false }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: highlight ? theme.accentLight : theme.surfaceVariant }]}>
      <AppIcon name={icon} size={24} color={highlight ? theme.accent : theme.textMuted} />
      <Text style={[styles.summaryValue, { color: highlight ? theme.accent : theme.text }]}>
        {value}
      </Text>
      <Text style={[styles.summaryTitle, { color: theme.textMuted }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.summarySubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      )}
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
    recommendations = [],
  } = data;

  if (!feeds || feeds.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          No diet recommendation available. Please try again with different inputs.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppIcon name="nutrition" size={24} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>Diet Recommendation</Text>
      </View>

      {/* Summary cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryRow}
        contentContainerStyle={styles.summaryContent}
      >
        <SummaryCard
          title="Daily Cost"
          value={`${total_cost?.toFixed(0) || '?'} ETB`}
          icon="cash"
          theme={theme}
          highlight
        />
        {expected_milk && (
          <SummaryCard
            title="Expected Milk"
            value={`${expected_milk?.toFixed(1) || '?'} L`}
            subtitle="per day"
            icon="water"
            theme={theme}
          />
        )}
        <SummaryCard
          title="Feeds"
          value={feeds.length}
          subtitle="in mix"
          icon="list"
          theme={theme}
        />
      </ScrollView>

      {/* Feed table */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Recommended Feed Mix
        </Text>
        <FeedTable feeds={feeds} theme={theme} />
      </View>

      {/* Nutrient balance */}
      {nutrients && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Nutrient Balance
          </Text>
          <NutrientIndicator
            label="Dry Matter"
            actual={nutrients.dm_actual}
            required={nutrients.dm_required}
            unit="kg"
            theme={theme}
          />
          <NutrientIndicator
            label="Energy (ME)"
            actual={nutrients.me_actual}
            required={nutrients.me_required}
            unit="MJ"
            theme={theme}
          />
          <NutrientIndicator
            label="Protein (CP)"
            actual={nutrients.cp_actual}
            required={nutrients.cp_required}
            unit="g"
            theme={theme}
          />
        </View>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.warning }]}>
            Warnings
          </Text>
          {warnings.map((warning, index) => (
            <View key={index} style={styles.warningRow}>
              <AppIcon name="warning" size={16} color={theme.warning} />
              <Text style={[styles.warningText, { color: theme.text }]}>{warning}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Tips
          </Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recRow}>
              <AppIcon name="bulb" size={16} color={theme.accent} />
              <Text style={[styles.recText, { color: theme.text }]}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
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
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  summaryRow: {
    marginBottom: SPACING.md,
  },
  summaryContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
    minWidth: 100,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  summarySubtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  section: {
    padding: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  feedTable: {
    borderRadius: SPACING.radiusSm,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  feedNameCell: {
    flex: 2,
  },
  quantityCell: {
    flex: 1,
    textAlign: 'right',
  },
  costCell: {
    flex: 1,
    textAlign: 'right',
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  nutrientInfo: {
    flex: 1,
  },
  nutrientLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SPACING.radiusFull,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  warningText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  recText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  noData: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    padding: SPACING.md,
  },
  errorText: {
    padding: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
