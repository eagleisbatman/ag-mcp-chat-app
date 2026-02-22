/**
 * Livestock picker configuration.
 * Two-step: searchable list → optional name + herd size form.
 */

import { t } from '../../../../constants/strings';
import { MAX_NUMBER_VALUE } from '../types';
import type { PickerConfig, PickerItem, MasterData, ProfileActions } from '../types';

export function createLivestockPickerConfig(): PickerConfig {
  return {
    key: 'livestock_picker',
    title: t('chat.selectLivestockType') || 'Select Livestock Type',
    steps: [
      {
        type: 'list',
        searchPlaceholder: t('chat.searchLivestock') || 'Search livestock...',
        emptyText: t('chat.noLivestockFound') || 'No livestock found',
        loadingText: t('chat.loadingLivestock') || 'Loading livestock...',
      },
      {
        type: 'form',
        fields: [
          {
            key: 'name',
            label: t('chat.nameOptional') || 'Name (optional)',
            placeholder: t('chat.namePlaceholder') || 'e.g. Aster, Bessie',
            type: 'text',
            optional: true,
            maxLength: 200,
          },
          {
            key: 'herdSize',
            label: t('chat.herdSizeOptional') || 'Herd size (optional)',
            placeholder: t('chat.herdSizePlaceholder') || 'e.g. 5',
            type: 'number',
            optional: true,
            maxLength: 7,
          },
        ],
        submitLabel: t('chat.addButton') || 'Add',
      },
    ],

    mapItems: (data: MasterData): PickerItem[] =>
      data.masterLivestock.map((l) => ({
        id: l.id,
        label: l.translatedName || l.name,
        sublabel: l.translatedName && l.translatedName !== l.name ? l.name : undefined,
        category: l.category || 'Other',
      })),

    onComplete: async (
      item: PickerItem,
      formData: Record<string, string> | undefined,
      purpose: 'clarify' | 'collect' | undefined,
      actions: ProfileActions,
    ) => {
      const name = formData?.name?.trim().slice(0, 200) || undefined;
      // Defense-in-depth: PickerFormStep validates before enabling submit, but we
      // re-validate here to guard against programmatic calls or future refactors.
      const rawHerdSize = formData?.herdSize?.trim();
      const parsedHerdSize = rawHerdSize ? parseInt(rawHerdSize, 10) : undefined;
      const herdSize = parsedHerdSize && !isNaN(parsedHerdSize) && parsedHerdSize > 0 && parsedHerdSize <= MAX_NUMBER_VALUE
        ? parsedHerdSize
        : undefined;

      const displayText = name ? `${item.label} - ${name}` : item.label;

      if (purpose === 'collect') {
        const animal = await actions.addAnimal({
          livestockId: item.id,
          name,
          herdSize,
          trackingMode: herdSize && herdSize > 1 ? 'herd' : 'individual',
        });
        return { text: displayText, saved: !!animal };
      }
      return { text: displayText, saved: true };
    },
  };
}
