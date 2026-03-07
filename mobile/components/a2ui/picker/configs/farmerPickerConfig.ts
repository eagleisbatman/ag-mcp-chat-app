/**
 * Farmer picker widget config — EW selects a farmer from their connected list.
 *
 * The AI triggers with: [A2UI:farmer_picker title="Which farmer?" context={"farmers":[...]}]
 * Farmers come from widget.context (injected by AI from EW's connected farmers).
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerItem, MasterData } from '../types';

export function createFarmerPickerConfig(): PickerConfig {
  return {
    key: 'farmer_picker',
    title: t('a2ui.selectFarmer') || 'Select Farmer',
    steps: [
      {
        type: 'list',
        searchPlaceholder: t('a2ui.searchFarmers') || 'Search farmers...',
        emptyText: t('a2ui.noFarmersFound') || 'No connected farmers found.',
      },
    ],
    mapItems: (_data: MasterData): PickerItem[] => [],
    onComplete: async (item) => {
      if (!item) return { text: '', saved: false };
      return {
        text: item.label,
        saved: false,
        responseData: { farmerId: item.id, farmerName: item.label },
      };
    },
  };
}

/** Convert context farmers (from AI) to PickerItem[] */
export function parseContextFarmers(farmers: unknown): PickerItem[] {
  if (!Array.isArray(farmers)) return [];
  return farmers
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f) => {
      const id = String(f.id || f.userId || f.farmerId || '');
      const name = String(f.name || f.farmerName || 'Unknown');
      const phone = f.phone ? `...${String(f.phone).slice(-4)}` : undefined;
      return { id, label: name, sublabel: phone };
    })
    .filter((f) => f.id.length > 0);
}
