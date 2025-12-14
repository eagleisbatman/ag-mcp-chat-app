/**
 * ToggleSwitch - Yes/No toggle for boolean inputs
 *
 * Used for lactating status, etc.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function ToggleSwitch({
  label,
  value,
  onValueChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
  disabled = false,
}) {
  const { theme } = useApp();

  const handleToggle = (newValue) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleOption,
            {
              backgroundColor: value === false ? theme.accent : theme.surfaceVariant,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={() => handleToggle(false)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === false }}
        >
          <Text
            style={[
              styles.toggleText,
              { color: value === false ? '#FFFFFF' : theme.text },
            ]}
          >
            {falseLabel}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleOption,
            {
              backgroundColor: value === true ? theme.accent : theme.surfaceVariant,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={() => handleToggle(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === true }}
        >
          <Text
            style={[
              styles.toggleText,
              { color: value === true ? '#FFFFFF' : theme.text },
            ]}
          >
            {trueLabel}
          </Text>
        </Pressable>
      </View>
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
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
