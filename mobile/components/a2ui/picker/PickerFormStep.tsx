/**
 * PickerFormStep — Renders a configurable form step within PickerSheet.
 *
 * Each field renders a label + TextInput. The submit button uses theme-aware colors
 * for proper dark/light mode contrast. Button is visually dimmed when validation fails.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../../constants/themes';
import { t } from '../../../constants/strings';
import { MAX_NUMBER_VALUE } from './types';
import type { PickerFormField } from './types';

interface PickerFormStepProps {
  fields: PickerFormField[];
  submitLabel?: string;
  onSubmit: (formData: Record<string, string>) => void;
}

export default function PickerFormStep({ fields, submitLabel, onSubmit }: PickerFormStepProps) {
  const { theme } = useApp();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Compute validation state for visual feedback
  const isValid = useMemo(() => {
    for (const field of fields) {
      // Required fields must have content
      if (!field.optional && !formData[field.key]?.trim()) return false;
      // Number fields with content must be positive integers within bounds
      if (field.type === 'number' && formData[field.key]?.trim()) {
        const num = parseInt(formData[field.key], 10);
        const max = field.maxValue ?? MAX_NUMBER_VALUE;
        if (isNaN(num) || num <= 0 || num > max) return false;
      }
    }
    return true;
  }, [fields, formData]);

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onSubmit(formData);
  }, [isValid, formData, onSubmit]);

  return (
    <View style={styles.form}>
      {fields.map((field, index) => (
        <View key={field.key} style={index > 0 ? styles.fieldSpacing : undefined}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {field.label}
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.inputBorder }]}
            value={formData[field.key] || ''}
            onChangeText={(value) => updateField(field.key, value)}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            placeholderTextColor={theme.textMuted}
            keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
            autoCapitalize={field.type === 'text' ? 'words' : 'none'}
          />
        </View>
      ))}

      <TouchableOpacity
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={!isValid}
        style={[
          styles.submitButton,
          { backgroundColor: theme.accent, opacity: isValid ? 1 : 0.4 },
        ]}
      >
        <Text style={[styles.submitText, { color: theme.name === 'dark' ? '#000000' : '#FFFFFF' }]}>
          {submitLabel || t('chat.addButton') || 'Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  fieldSpacing: {
    marginTop: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.xs,
  },
  input: {
    fontSize: TYPOGRAPHY.sizes.md,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  submitButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
