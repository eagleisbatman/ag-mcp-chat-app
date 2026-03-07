/**
 * Plot selector widget config — pick a farm plot from user's profile.
 *
 * The AI triggers with: [A2UI:plot_selector title="Which plot?" context={"plots":[{"id":"..","name":"Field 1","area":2.5}]}]
 * Plots are passed from AI context (enriched from user profile). Single-step list picker.
 */

import { t } from '../../../../constants/strings';
import type { PickerConfig, PickerItem, MasterData } from '../types';

export function createPlotSelectorConfig(): PickerConfig {
  return {
    key: 'plot_selector',
    title: t('a2ui.selectPlot') || 'Select Plot',
    steps: [
      {
        type: 'list',
        searchPlaceholder: t('a2ui.searchPlots') || 'Search plots...',
        emptyText: t('a2ui.noPlotsFound') || 'No plots found. Add a farm in your profile first.',
      },
    ],
    // mapItems is called with masterData but plots come from widget.context
    // The hook injects context items when masterData is empty
    mapItems: (_data: MasterData): PickerItem[] => [],
    onComplete: async (item) => {
      if (!item) return { text: '', saved: false };
      return {
        text: item.label,
        saved: false,
        responseData: { plotId: item.id, plotName: item.label },
      };
    },
  };
}

/** Convert context plots (from AI) to PickerItem[] */
export function parseContextPlots(plots: unknown): PickerItem[] {
  if (!Array.isArray(plots)) return [];
  return plots
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => {
      const id = String(p.id || p.plotId || '');
      const name = String(p.name || p.plotName || 'Unnamed Plot');
      const area = p.area || p.totalArea;
      const sublabel = area ? `${area} ha` : undefined;
      const category = String(p.farmName || '');
      return { id, label: name, sublabel, category };
    })
    .filter((p) => p.id.length > 0);
}
