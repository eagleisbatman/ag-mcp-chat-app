/**
 * Crop picker configuration.
 * Single-step: searchable list of crops grouped by category.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerItem, MasterData, ProfileActions } from '../types';

export function createCropPickerConfig(): PickerConfig {
  return {
    key: 'crop_picker',
    title: t('chat.selectCrop') || 'Select Crop',
    steps: [
      {
        type: 'list',
        searchPlaceholder: t('chat.searchCrops') || 'Search crops...',
        emptyText: t('chat.noCropsFound') || 'No crops found',
        loadingText: t('chat.loadingCrops') || 'Loading crops...',
      },
    ],

    mapItems: (data: MasterData): PickerItem[] =>
      data.masterCrops.map((c) => ({
        id: c.id,
        label: c.translatedName || c.name,
        sublabel: c.translatedName && c.translatedName !== c.name ? c.name : undefined,
        // Use i18n key for known categories, fallback to raw server value
        category: t(`categories.${(c.category || 'Other').toLowerCase().replace(/\s+/g, '_')}`) || c.category || 'Other',
      })),

    onComplete: async (
      item: PickerItem | null,
      _formData: Record<string, string> | undefined,
      purpose: 'clarify' | 'collect' | undefined,
      actions: ProfileActions,
    ) => {
      if (!item) return { text: '', saved: false };
      const responseData = { cropId: item.id, cropName: item.label };
      if (purpose === 'collect') {
        const ok = await actions.addCropToDefaultPlot(item.id);
        return { text: item.label, saved: ok, responseData };
      }
      return { text: item.label, saved: true, responseData };
    },
  };
}
