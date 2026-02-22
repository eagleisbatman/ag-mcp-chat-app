/**
 * Picker Registry — maps A2UI widget types to their PickerConfig factories.
 *
 * The useA2UIPicker hook looks up configs at runtime via getPickerConfig().
 * Configs are lazy (factory functions) so i18n strings resolve at open time.
 *
 * ## Adding a new picker type
 *
 * 1. Create `configs/myPickerConfig.ts` exporting a factory:
 *    `export function createMyPickerConfig(): PickerConfig { ... }`
 *
 * 2. Register it in `configs/index.ts`:
 *    `registerPicker('my_widget_type', createMyPickerConfig);`
 *
 * That's it — PickerSheet renders it automatically. No ChatScreen changes needed.
 */

import type { PickerConfig } from './types';

const registry = new Map<string, () => PickerConfig>();

/** Register a picker config factory for a widget type. */
export function registerPicker(widgetType: string, configFactory: () => PickerConfig) {
  registry.set(widgetType, configFactory);
}

/** Look up a picker config for a widget type. Returns null if not registered. */
export function getPickerConfig(widgetType: string): PickerConfig | null {
  const factory = registry.get(widgetType);
  return factory ? factory() : null;
}

/** Check if a widget type has a registered picker. */
export function hasPickerConfig(widgetType: string): boolean {
  return registry.has(widgetType);
}
