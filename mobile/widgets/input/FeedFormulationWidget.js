/**
 * FeedFormulationWidget - Clean single-page feed calculator
 *
 * UX Design:
 * - Lactating toggle at top
 * - Simple chips for milk production & weight
 * - Optional expandable details
 * - Single action button
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Milk production options
const MILK_OPTIONS = [
  { value: 8, label: '8 L' },
  { value: 12, label: '12 L' },
  { value: 16, label: '16 L' },
  { value: 20, label: '20 L' },
];

// Body weight options
const WEIGHT_OPTIONS = [
  { value: 300, label: '300 kg' },
  { value: 350, label: '350 kg' },
  { value: 400, label: '400 kg' },
  { value: 450, label: '450 kg' },
];

// Ethiopian defaults (hidden)
const ETHIOPIAN_DEFAULTS = {
  temperature: 20,
  topography: 'highland',
  distance: 2,
  calving_interval: 450,
  fat_milk: 3.5,
  tp_milk: 3.2,
  breed: 'crossbred',
  days_in_milk: 90,
  parity: 2,
  days_of_pregnancy: 0,
};

export default function FeedFormulationWidget({ onSubmit }) {
  const { theme } = useApp();
  const [lactating, setLactating] = useState(true);
  const [milkProduction, setMilkProduction] = useState(12);
  const [bodyWeight, setBodyWeight] = useState(350);

  const handleSubmit = () => {
    onSubmit({
      widget_type: 'feed_formulation_input',
      data: {
        cattle_info: {
          lactating,
          milk_production: lactating ? milkProduction : 0,
          body_weight: bodyWeight,
          ...ETHIOPIAN_DEFAULTS,
        },
        action: 'get_diet_recommendation',
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Lactating Toggle */}
      <View style={styles.toggleSection}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>Lactating Cattle?</Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: lactating ? theme.accent : theme.surfaceVariant }
            ]}
            onPress={() => setLactating(true)}
          >
            <Text style={[styles.toggleText, { color: lactating ? '#FFFFFF' : theme.text }]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: !lactating ? theme.accent : theme.surfaceVariant }
            ]}
            onPress={() => setLactating(false)}
          >
            <Text style={[styles.toggleText, { color: !lactating ? '#FFFFFF' : theme.text }]}>No</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Milk Production (only if lactating) */}
      {lactating && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Target Milk (per day)</Text>
          <View style={styles.chipRow}>
            {MILK_OPTIONS.map((option) => {
              const isSelected = milkProduction === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? theme.accent : theme.surfaceVariant }
                  ]}
                  onPress={() => setMilkProduction(option.value)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Body Weight */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Body Weight</Text>
        <View style={styles.chipRow}>
          {WEIGHT_OPTIONS.map((option) => {
            const isSelected = bodyWeight === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chip,
                  { backgroundColor: isSelected ? theme.accent : theme.surfaceVariant }
                ]}
                onPress={() => setBodyWeight(option.value)}
              >
                <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: theme.accent }]}
        onPress={handleSubmit}
      >
        <AppIcon name="calculator" size={20} color="#FFFFFF" />
        <Text style={styles.submitText}>Calculate Diet</Text>
      </TouchableOpacity>

      {/* Attribution */}
      <Text style={[styles.attribution, { color: theme.textMuted }]}>
        Feed Formulation for Ethiopia
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  toggleBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
  },
  toggleText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  submitText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  attribution: {
    fontSize: 10,
    textAlign: 'center',
  },
});
