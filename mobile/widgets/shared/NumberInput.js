/**
 * NumberInput - Styled numeric input field
 *
 * Used for body weight, prices, etc.
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function NumberInput({
  label,
  value,
  onChangeValue,
  placeholder,
  unit,
  min,
  max,
  disabled = false,
}) {
  const { theme } = useApp();

  const handleChange = (text) => {
    // Allow empty, negative sign, or valid numbers
    if (text === '' || text === '-') {
      onChangeValue(text);
      return;
    }

    const num = parseFloat(text);
    if (!isNaN(num)) {
      // Clamp to min/max if specified
      let clamped = num;
      if (min !== undefined && num < min) clamped = min;
      if (max !== undefined && num > max) clamped = max;
      onChangeValue(String(clamped));
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          value={String(value || '')}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
          editable={!disabled}
        />
        {unit && (
          <View style={[styles.unitBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.unitText, { color: theme.textMuted }]}>{unit}</Text>
          </View>
        )}
      </View>
      {(min !== undefined || max !== undefined) && (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
            ? `Min: ${min}`
            : `Max: ${max}`}
        </Text>
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
  inputWrapper: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopLeftRadius: SPACING.radiusMd,
    borderBottomLeftRadius: SPACING.radiusMd,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  unitBox: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    borderTopRightRadius: SPACING.radiusMd,
    borderBottomRightRadius: SPACING.radiusMd,
  },
  unitText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  hint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
});
