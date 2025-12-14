/**
 * SliderInput - Slider with value display
 *
 * Used for numeric range inputs like milk production, days in milk, etc.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function SliderInput({
  label,
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  unit = '',
  showValue = true,
  disabled = false,
}) {
  const { theme } = useApp();

  const formatValue = (val) => {
    if (step >= 1) {
      return Math.round(val);
    }
    return val.toFixed(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        {showValue && (
          <Text style={[styles.value, { color: theme.accent }]}>
            {formatValue(value)}{unit && ` ${unit}`}
          </Text>
        )}
      </View>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor={theme.surfaceVariant}
        thumbTintColor={theme.accent}
        disabled={disabled}
      />
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeLabel, { color: theme.textMuted }]}>
          {minimumValue}{unit && ` ${unit}`}
        </Text>
        <Text style={[styles.rangeLabel, { color: theme.textMuted }]}>
          {maximumValue}{unit && ` ${unit}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  value: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});
