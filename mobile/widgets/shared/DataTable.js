/**
 * DataTable - Simple table for displaying structured data
 *
 * Used for displaying soil properties, fertilizer recommendations, etc.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function DataTable({
  title,
  data, // [{ label, value, unit, color }]
  columns = 2,
  compact = false,
}) {
  const { theme } = useApp();

  // Split data into rows based on column count
  const rows = [];
  for (let i = 0; i < data.length; i += columns) {
    rows.push(data.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      )}
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            { borderBottomColor: theme.border },
            rowIndex === rows.length - 1 && styles.lastRow,
          ]}
        >
          {row.map((item, colIndex) => (
            <View
              key={item.label || colIndex}
              style={[styles.cell, { flex: 1 }]}
            >
              <Text
                style={[
                  styles.cellLabel,
                  { color: theme.textMuted },
                  compact && styles.compactLabel,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.cellValue,
                  { color: item.color || theme.text },
                  compact && styles.compactValue,
                ]}
              >
                {item.value}
                {item.unit && (
                  <Text style={[styles.cellUnit, { color: theme.textMuted }]}>
                    {' '}{item.unit}
                  </Text>
                )}
              </Text>
            </View>
          ))}
          {/* Fill empty cells if row is incomplete */}
          {row.length < columns &&
            Array(columns - row.length)
              .fill(null)
              .map((_, i) => <View key={`empty-${i}`} style={styles.cell} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingRight: SPACING.sm,
  },
  cellLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: 2,
  },
  cellValue: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  cellUnit: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  compactLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  compactValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
