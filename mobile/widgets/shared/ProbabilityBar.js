/**
 * ProbabilityBar - Horizontal probability visualization
 *
 * Used for showing climate forecast probabilities (Below Normal, Normal, Above Normal)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function ProbabilityBar({
  label,
  probabilities, // [{ label, value, color }] or { below, normal, above }
  showLabels = true,
  height = 24,
}) {
  const { theme } = useApp();

  // Normalize probabilities to array format
  const normalizedProbs = Array.isArray(probabilities)
    ? probabilities
    : [
        { label: 'Below', value: probabilities.below || 0, color: theme.warning },
        { label: 'Normal', value: probabilities.normal || 0, color: theme.accent },
        { label: 'Above', value: probabilities.above || 0, color: theme.info },
      ];

  const total = normalizedProbs.reduce((sum, p) => sum + p.value, 0);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}

      {/* Bar container */}
      <View style={[styles.barContainer, { height, backgroundColor: theme.surfaceVariant }]}>
        {normalizedProbs.map((prob, index) => {
          const widthPercent = total > 0 ? (prob.value / total) * 100 : 0;
          if (widthPercent === 0) return null;

          return (
            <View
              key={prob.label || index}
              style={[
                styles.barSegment,
                {
                  width: `${widthPercent}%`,
                  backgroundColor: prob.color,
                  borderTopLeftRadius: index === 0 ? SPACING.radiusSm : 0,
                  borderBottomLeftRadius: index === 0 ? SPACING.radiusSm : 0,
                  borderTopRightRadius: index === normalizedProbs.length - 1 ? SPACING.radiusSm : 0,
                  borderBottomRightRadius: index === normalizedProbs.length - 1 ? SPACING.radiusSm : 0,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Labels below bar */}
      {showLabels && (
        <View style={styles.labelsRow}>
          {normalizedProbs.map((prob, index) => (
            <View key={prob.label || index} style={styles.labelItem}>
              <View style={[styles.labelDot, { backgroundColor: prob.color }]} />
              <Text style={[styles.labelText, { color: theme.textMuted }]}>
                {prob.label}
              </Text>
              <Text style={[styles.labelValue, { color: theme.text }]}>
                {Math.round(prob.value)}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.sm,
  },
  barContainer: {
    flexDirection: 'row',
    borderRadius: SPACING.radiusSm,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  labelValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
