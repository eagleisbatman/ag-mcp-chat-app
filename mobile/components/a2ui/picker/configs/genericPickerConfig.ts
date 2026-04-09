/**
 * Generic picker configuration.
 * Renders whatever the AI sends — the mobile app acts as a dumb renderer.
 *
 * Items, form steps, and save actions all come from widget.context at runtime.
 * This config provides the structural skeleton; useA2UIPicker fills in the data.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerItem, ProfileActions } from '../types';

export function createGenericPickerConfig(): PickerConfig {
  return {
    key: 'picker',
    title: t('chat.search') || 'Select',  // Will be overridden by widget.title from AI
    steps: [
      {
        type: 'list',
        searchPlaceholder: t('chat.search') || 'Search...',
        emptyText: t('chat.noResults') || 'No results found',
      },
    ],

    // mapItems returns empty — items come from context, resolved in useA2UIPicker
    mapItems: () => [],

    onComplete: async (
      item: PickerItem | null,
      formData: Record<string, string> | undefined,
      purpose: 'clarify' | 'collect' | undefined,
      _actions: ProfileActions,
    ) => {
      if (!item) return { text: '', saved: false };

      const responseData: Record<string, unknown> = {
        selectedId: item.id,
        selectedLabel: item.label,
        ...formData,
      };

      // The AI sends saveAction in widget.context — but we can't access it here.
      // Save actions are handled by useA2UIPicker before calling onComplete.
      // For 'collect' purpose, the hook handles the save.

      return { text: item.label, saved: purpose === 'collect', responseData };
    },
  };
}
