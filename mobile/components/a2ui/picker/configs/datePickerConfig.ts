/**
 * Date picker widget config — date entry via text input.
 *
 * The AI triggers with: [A2UI:date_picker title="When did you plant?" context={"format":"YYYY-MM-DD"}]
 * User enters a date string. Response is sent as chat text.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig } from '../types';

export function createDatePickerConfig(): PickerConfig {
  return {
    key: 'date_picker',
    title: t('a2ui.selectDate') || 'Select Date',
    steps: [
      {
        type: 'form',
        fields: [
          {
            key: 'date',
            label: t('a2ui.date') || 'Date',
            placeholder: 'YYYY-MM-DD',
            type: 'text',
            maxLength: 10,
          },
        ],
        submitLabel: t('common.submit') || 'Submit',
      },
    ],
    mapItems: () => [],
    onComplete: async (_item, formData) => {
      const date = formData?.date?.trim() || '';
      if (!date) return { text: '', saved: false };
      return { text: date, saved: false, responseData: { date } };
    },
  };
}
