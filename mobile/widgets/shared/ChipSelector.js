/**
 * ChipSelector - Horizontal chip selection component
 *
 * Used for quick option selection like "Today", "5-Day", "This Week"
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function ChipSelector({
  options,
  selectedValue,
  onSelect,
  label,
  multiSelect = false,
  scrollable = false,
}) {
  const { theme } = useApp();

  const handleSelect = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (multiSelect) {
      const currentSelection = Array.isArray(selectedValue) ? selectedValue : [];
      const newSelection = currentSelection.includes(value)
        ? currentSelection.filter(v => v !== value)
        : [...currentSelection, value];
      onSelect(newSelection);
    } else {
      onSelect(value);
    }
  };

  const isSelected = (value) => {
    if (multiSelect) {
      return Array.isArray(selectedValue) && selectedValue.includes(value);
    }
    return selectedValue === value;
  };

  const ChipsContainer = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.scrollContent }
    : { style: styles.chipsRow };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <ChipsContainer {...containerProps}>
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <Pressable
              key={option.value}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.accent : theme.surfaceVariant,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
              onPress={() => handleSelect(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? '#FFFFFF' : theme.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ChipsContainer>
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  scrollContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.radiusFull,
    borderWidth: 1,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
