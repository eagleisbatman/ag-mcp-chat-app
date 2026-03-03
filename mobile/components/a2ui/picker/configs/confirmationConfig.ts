/**
 * Confirmation widget config — Yes/No dialog for follow/unfollow, delete, etc.
 *
 * The AI triggers this with: [A2UI:confirmation title="Remove Cow X?" purpose="collect"]
 * User sees a simple Yes/No dialog. Response is sent as chat text.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig } from '../types';

export function createConfirmationConfig(): PickerConfig {
  return {
    key: 'confirmation',
    title: t('a2ui.confirm'),
    steps: [
      {
        type: 'confirmation',
        confirmLabel: t('common.yes'),
        cancelLabel: t('common.no'),
      },
    ],
    // Not used for confirmation (no list step), but required by interface
    mapItems: () => [],
    onComplete: async (_item, formData) => {
      const confirmed = formData?.response === 'yes';
      const response = confirmed ? 'Yes' : 'No';
      return { text: response, saved: false, responseData: { confirmed } };
    },
  };
}
