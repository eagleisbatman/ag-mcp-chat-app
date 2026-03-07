/**
 * Multi-select widget config — toggle-based multi-option picker.
 *
 * The AI triggers with: [A2UI:multi_select title="Select symptoms" context={"options":["Yellowing","Wilting","Spots"]}]
 * Uses form step with toggle fields for each option.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerFormField } from '../types';

export function createMultiSelectConfig(): PickerConfig {
  return {
    key: 'multi_select',
    title: t('a2ui.selectOptions') || 'Select Options',
    steps: [
      {
        type: 'form',
        fields: [], // Populated at runtime from widget.context.options
        submitLabel: t('common.done') || 'Done',
      },
    ],
    mapItems: () => [],
    onComplete: async (_item, formData) => {
      if (!formData) return { text: '', saved: false };
      const selected = Object.entries(formData)
        .filter(([, v]) => v === 'true')
        .map(([k]) => k);
      if (selected.length === 0) return { text: 'None selected', saved: false };
      const text = selected.join(', ');
      return { text, saved: false, responseData: { selected } };
    },
  };
}

/** Convert context options (from AI) to toggle PickerFormField[] */
export function parseMultiSelectOptions(options: unknown): PickerFormField[] {
  if (!Array.isArray(options)) return [];
  return options
    .filter((o): o is string | Record<string, unknown> => typeof o === 'string' || (typeof o === 'object' && o !== null))
    .map((o) => {
      const label = typeof o === 'string' ? o : String((o as Record<string, unknown>).label || (o as Record<string, unknown>).value || '');
      const key = typeof o === 'string' ? o : String((o as Record<string, unknown>).value || (o as Record<string, unknown>).label || '');
      return {
        key,
        label,
        placeholder: '',
        type: 'toggle' as const,
        optional: true,
      };
    })
    .filter((f) => f.key.length > 0);
}
