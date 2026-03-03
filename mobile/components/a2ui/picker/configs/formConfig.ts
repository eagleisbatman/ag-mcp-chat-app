/**
 * Form widget config — multi-field form for structured data collection.
 *
 * Used by RationSmart cow details, and other multi-field collection flows.
 * Fields are injected from the A2UI context at runtime.
 *
 * The AI triggers with: [A2UI:form title="Cow Details" context={"fields":[...]}]
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerFormField } from '../types';

/**
 * Context-aware form config.
 * Fields can be overridden from widget.context.fields at runtime.
 */
export function createFormConfig(): PickerConfig {
  return {
    key: 'form',
    title: t('a2ui.fillForm'),
    steps: [
      {
        type: 'form',
        fields: [], // Populated at runtime from widget.context.fields
        submitLabel: t('common.submit'),
      },
    ],
    mapItems: () => [],
    onComplete: async (_item, formData) => {
      if (!formData) return { text: '', saved: false };
      // Format form data as readable text for the AI
      const entries = Object.entries(formData).filter(([, v]) => v.trim());
      const text = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
      // Return raw formData as structured response so AI gets typed values
      const responseData: Record<string, unknown> = {};
      for (const [k, v] of entries) responseData[k] = v;
      return { text, saved: false, responseData };
    },
  };
}

/** Convert context fields (from AI) to PickerFormField[] */
export function parseContextFields(
  contextFields: unknown[],
): PickerFormField[] {
  if (!Array.isArray(contextFields)) return [];
  return contextFields
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f) => ({
      key: String(f.key || f.name || ''),
      label: String(f.label || f.key || ''),
      placeholder: String(f.placeholder || ''),
      type: (['text', 'number', 'decimal', 'select', 'toggle'].includes(String(f.type))
        ? String(f.type)
        : 'text') as 'text' | 'number' | 'decimal' | 'select' | 'toggle',
      optional: f.optional === true,
      maxLength: typeof f.maxLength === 'number' ? f.maxLength : undefined,
      maxValue: typeof f.maxValue === 'number' ? f.maxValue : undefined,
      options: Array.isArray(f.options)
        ? f.options.map((o: unknown) => {
            const opt = o as Record<string, unknown>;
            return { value: String(opt.value || ''), label: String(opt.label || opt.value || '') };
          })
        : undefined,
    }))
    .filter((f) => f.key.length > 0);
}
