/**
 * FertilizerResultCard - Output widget for NextGen fertilizer recommendations
 *
 * Features:
 * - Three-section layout: Organic, Inorganic, Expected Yield
 * - Application timing recommendations
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

function FertilizerSection({ title, icon, items, theme, accentColor }) {
  return (
    <View style={[styles.section, { borderLeftColor: accentColor }]}>
      <View style={styles.sectionHeader}>
        <AppIcon name={icon} size={20} color={accentColor} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>{item.label}</Text>
          <Text style={[styles.itemValue, { color: accentColor }]}>
            {item.value} <Text style={styles.itemUnit}>{item.unit}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function FertilizerResultCard({ data = {} }) {
  const { theme } = useApp();

  const {
    crop,
    location,
    organic = {},
    inorganic = {},
    expected_yield,
    timing = [],
    notes = [],
  } = data;

  if (!organic.compost && !inorganic.urea) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          No fertilizer recommendation available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppIcon name="flask" size={24} color={theme.accent} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Fertilizer Recommendation</Text>
          {crop && (
            <Text style={[styles.cropBadge, { backgroundColor: theme.accentLight, color: theme.accent }]}>
              {crop.charAt(0).toUpperCase() + crop.slice(1)}
            </Text>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Organic Fertilizers */}
        <FertilizerSection
          title="Organic Fertilizers"
          icon="leaf"
          accentColor={theme.success}
          theme={theme}
          items={[
            { label: 'Compost', value: organic.compost?.toFixed(1) || '0', unit: 'tons/ha' },
            { label: 'Vermicompost', value: organic.vermicompost?.toFixed(1) || '0', unit: 'tons/ha' },
          ]}
        />

        {/* Inorganic Fertilizers */}
        <FertilizerSection
          title="Inorganic Fertilizers"
          icon="flask"
          accentColor={theme.info}
          theme={theme}
          items={[
            { label: 'Urea', value: inorganic.urea?.toFixed(0) || '0', unit: 'kg/ha' },
            { label: 'NPS', value: inorganic.nps?.toFixed(0) || '0', unit: 'kg/ha' },
          ]}
        />

        {/* Expected Yield */}
        {expected_yield && (
          <View style={[styles.yieldSection, { backgroundColor: theme.accentLight }]}>
            <AppIcon name="trending-up" size={24} color={theme.accent} />
            <View style={styles.yieldInfo}>
              <Text style={[styles.yieldLabel, { color: theme.textMuted }]}>Expected Yield</Text>
              <Text style={[styles.yieldValue, { color: theme.accent }]}>
                {expected_yield.toFixed(0)} {' '}
                <Text style={styles.yieldUnit}>kg/ha</Text>
              </Text>
              <Text style={[styles.yieldAlt, { color: theme.textMuted }]}>
                ({(expected_yield / 100).toFixed(1)} quintals/ha)
              </Text>
            </View>
          </View>
        )}

        {/* Application Timing */}
        {timing.length > 0 && (
          <View style={styles.timingSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Application Timing
            </Text>
            {timing.map((item, index) => (
              <View key={index} style={styles.timingItem}>
                <View style={[styles.timingDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.timingText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Notes</Text>
            {notes.map((note, index) => (
              <Text key={index} style={[styles.noteText, { color: theme.textMuted }]}>
                • {note}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Source */}
      <Text style={[styles.sourceText, { color: theme.textMuted }]}>
        Source: NextGen SSFR (Site-Specific Fertilizer Recommendation)
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
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  cropBadge: {
    fontSize: TYPOGRAPHY.sizes.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: SPACING.radiusFull,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  section: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.md,
    borderLeftWidth: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  itemLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  itemValue: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  itemUnit: {
    fontWeight: TYPOGRAPHY.weights.regular,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  yieldSection: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
    gap: SPACING.md,
  },
  yieldInfo: {
    flex: 1,
  },
  yieldLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textTransform: 'uppercase',
  },
  yieldValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  yieldUnit: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  yieldAlt: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  timingSection: {
    padding: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  timingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  timingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  notesSection: {
    padding: SPACING.md,
  },
  noteText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginBottom: SPACING.xs,
  },
  sourceText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    padding: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  errorText: {
    padding: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
