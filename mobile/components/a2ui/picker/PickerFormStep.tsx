/**
 * PickerFormStep — Renders a configurable form step within PickerSheet.
 *
 * Supports field types: text, number, decimal, select (dropdown), toggle (on/off).
 * The submit button uses theme-aware colors for proper dark/light mode contrast.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useApp } from '../../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../../constants/themes';
import { t } from '../../../constants/strings';
import AppIcon from '../../ui/AppIcon';
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Track which select field has its dropdown open (only one at a time)
  const [openSelect, setOpenSelect] = useState<string | null>(null);

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  // Per-field validation errors (only shown after field is touched)
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string | null> = {};
    for (const field of fields) {
      const value = formData[field.key]?.trim() || '';
      if (field.type === 'toggle') {
        errors[field.key] = null; // Toggles are always valid
      } else if (!field.optional && !value) {
        errors[field.key] = t('a2ui.fieldRequired') || 'Required';
      } else if ((field.type === 'number' || field.type === 'decimal') && value) {
        const num = field.type === 'decimal' ? parseFloat(value) : parseInt(value, 10);
        const max = field.maxValue ?? MAX_NUMBER_VALUE;
        if (isNaN(num) || num <= 0) {
          errors[field.key] = t('a2ui.fieldMustBePositive') || 'Must be a positive number';
        } else if (num > max) {
          errors[field.key] = `${t('a2ui.fieldMaxValue') || 'Maximum'}: ${max}`;
        } else {
          errors[field.key] = null;
        }
      } else {
        errors[field.key] = null;
      }
    }
    return errors;
  }, [fields, formData]);

  const isValid = useMemo(() => {
    return Object.values(fieldErrors).every((e) => e === null);
  }, [fieldErrors]);

  const handleSubmit = useCallback(() => {
    if (!isValid) {
      // Mark all fields as touched to reveal errors
      const allTouched: Record<string, boolean> = {};
      for (const f of fields) allTouched[f.key] = true;
      setTouched(allTouched);
      return;
    }
    onSubmit(formData);
  }, [isValid, formData, onSubmit, fields]);

  const renderField = (field: PickerFormField) => {
    const error = touched[field.key] ? fieldErrors[field.key] : null;

    // Toggle field
    if (field.type === 'toggle') {
      const isOn = formData[field.key] === 'true';
      return (
        <>
          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.textMuted, marginBottom: 0 }]}>
              {field.label}
            </Text>
            <View style={styles.toggleRight}>
              {field.toggleLabels && (
                <Text style={[styles.toggleLabel, { color: theme.textMuted }]}>
                  {isOn ? field.toggleLabels.on : field.toggleLabels.off}
                </Text>
              )}
              <Switch
                value={isOn}
                onValueChange={(val) => updateField(field.key, val ? 'true' : 'false')}
                trackColor={{ false: theme.border, true: theme.accent }}
              />
            </View>
          </View>
        </>
      );
    }

    // Select field (dropdown)
    if (field.type === 'select' && field.options) {
      const isOpen = openSelect === field.key;
      const selectedOption = field.options.find((o) => o.value === formData[field.key]);

      return (
        <>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {field.label}
          </Text>
          <TouchableOpacity
            style={[
              styles.input,
              styles.selectTrigger,
              { borderColor: error ? '#E53935' : theme.inputBorder },
            ]}
            onPress={() => setOpenSelect(isOpen ? null : field.key)}
            activeOpacity={0.7}
          >
            <Text style={{ color: selectedOption ? theme.text : theme.textMuted, fontSize: TYPOGRAPHY.sizes.md, flex: 1 }}>
              {selectedOption?.label || field.placeholder || 'Select...'}
            </Text>
            <AppIcon name={isOpen ? 'expand-less' : 'expand-more'} size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {isOpen && (
            <View style={[styles.selectDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ScrollView style={styles.selectScroll} nestedScrollEnabled>
                {field.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.selectOption,
                      formData[field.key] === opt.value && { backgroundColor: theme.surfaceVariant },
                    ]}
                    onPress={() => {
                      updateField(field.key, opt.value);
                      setOpenSelect(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectOptionText, { color: theme.text }]}>
                      {opt.label}
                    </Text>
                    {formData[field.key] === opt.value && (
                      <AppIcon name="check" size={18} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {error && <Text style={styles.fieldError}>{error}</Text>}
        </>
      );
    }

    // Text / number / decimal field (TextInput)
    return (
      <>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {field.label}
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: theme.text, borderColor: error ? '#E53935' : theme.inputBorder },
          ]}
          value={formData[field.key] || ''}
          onChangeText={(value) => updateField(field.key, value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType={field.type === 'number' ? 'number-pad' : field.type === 'decimal' ? 'decimal-pad' : 'default'}
          autoCapitalize={field.type === 'text' ? 'words' : 'none'}
        />
        {error && <Text style={styles.fieldError}>{error}</Text>}
      </>
    );
  };

  return (
    <View style={styles.form}>
      {fields.map((field, index) => (
        <View key={field.key} style={index > 0 ? styles.fieldSpacing : undefined}>
          {renderField(field)}
        </View>
      ))}

      <TouchableOpacity
        onPress={handleSubmit}
        activeOpacity={0.8}
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
  fieldError: {
    color: '#E53935',
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  // Select
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  selectScroll: {
    maxHeight: 180,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  selectOptionText: {
    fontSize: TYPOGRAPHY.sizes.md,
  },
  // Submit
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
