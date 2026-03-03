/**
 * Number input widget config — stepper or direct input for quantities/weights.
 *
 * The AI triggers this with: [A2UI:number_input title="How many kg?" context={"min":1,"max":2000,"unit":"kg"}]
 * User enters a number. Response is sent as chat text.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig } from '../types';

export function createNumberInputConfig(): PickerConfig {
  return {
    key: 'number_input',
    title: t('a2ui.enterNumber'),
    steps: [
      {
        type: 'number_input',
        min: 0,
        max: 99999,
        submitLabel: t('common.submit'),
      },
    ],
    mapItems: () => [],
    onComplete: async (_item, formData) => {
      const value = formData?.value || '0';
      return { text: value, saved: false, responseData: { value: parseFloat(value) } };
    },
  };
}
