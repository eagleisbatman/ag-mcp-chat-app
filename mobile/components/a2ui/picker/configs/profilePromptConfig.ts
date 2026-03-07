/**
 * Profile prompt widget config — collects missing profile fields.
 *
 * The AI triggers with: [A2UI:profile_prompt title="Complete your profile" context={"fields":["name","phone","gender"]}]
 * Shows a form with the requested profile fields. Responses are saved to profile.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerFormField } from '../types';

const PROFILE_FIELD_DEFS: Record<string, () => PickerFormField> = {
  name: () => ({
    key: 'name',
    label: t('profile.name') || 'Name',
    placeholder: t('profile.namePlaceholder') || 'Enter your name',
    type: 'text',
    maxLength: 200,
  }),
  phone: () => ({
    key: 'phone',
    label: t('profile.phone') || 'Phone',
    placeholder: '+91...',
    type: 'text',
    maxLength: 20,
  }),
  gender: () => ({
    key: 'gender',
    label: t('profile.gender') || 'Gender',
    placeholder: '',
    type: 'select',
    options: [
      { value: 'male', label: t('profile.male') || 'Male' },
      { value: 'female', label: t('profile.female') || 'Female' },
      { value: 'other', label: t('profile.other') || 'Other' },
    ],
  }),
  farmingTypes: () => ({
    key: 'farmingTypes',
    label: t('profile.farmingType') || 'Farming Type',
    placeholder: '',
    type: 'select',
    options: [
      { value: 'agriculture', label: t('profile.agriculture') || 'Agriculture' },
      { value: 'horticulture', label: t('profile.horticulture') || 'Horticulture' },
      { value: 'livestock', label: t('profile.livestock') || 'Livestock' },
      { value: 'poultry', label: t('profile.poultry') || 'Poultry' },
      { value: 'dairy', label: t('profile.dairy') || 'Dairy' },
      { value: 'aquaculture', label: t('profile.aquaculture') || 'Aquaculture' },
    ],
  }),
};

export function createProfilePromptConfig(): PickerConfig {
  return {
    key: 'profile_prompt',
    title: t('a2ui.completeProfile') || 'Complete Your Profile',
    steps: [
      {
        type: 'form',
        fields: [], // Populated at runtime from widget.context.fields
        submitLabel: t('common.save') || 'Save',
      },
    ],
    mapItems: () => [],
    onComplete: async (_item, formData) => {
      if (!formData) return { text: '', saved: false };
      const entries = Object.entries(formData).filter(([, v]) => v.trim());
      const text = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
      const responseData: Record<string, unknown> = {};
      for (const [k, v] of entries) responseData[k] = v;
      return { text: text || 'Profile updated', saved: true, responseData };
    },
  };
}

/** Convert context field names to PickerFormField[] using known profile field definitions */
export function parseProfileFields(fieldNames: unknown): PickerFormField[] {
  if (!Array.isArray(fieldNames)) return [];
  return fieldNames
    .filter((f): f is string => typeof f === 'string')
    .map((name) => PROFILE_FIELD_DEFS[name]?.())
    .filter((f): f is PickerFormField => f !== undefined);
}
