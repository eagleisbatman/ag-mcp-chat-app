/**
 * Shared types for the reusable A2UI picker system.
 *
 * PickerConfig defines how a picker behaves: what data it shows, how many steps,
 * and what happens on completion. New picker types only need a new config — no
 * new Modal component required.
 *
 * ## Purpose field semantics
 *
 * A2UI widgets carry a `purpose` that determines what happens on completion:
 * - `'clarify'`  — Disambiguation only. The selected item label is sent as chat text
 *                   so the AI can refine its response. Nothing is saved to the user's profile.
 * - `'collect'`  — Profile data collection. The selected item is BOTH sent as chat text
 *                   AND saved to the user's profile (via ProfileActions). Success/error
 *                   toasts are shown. The AI uses the data for future personalized advice.
 * - `undefined`  — Treated like 'clarify' (no save).
 */

import type { Animal, MasterCrop, MasterLivestock } from '../../../types';

// ============================================
// Constants
// ============================================

/** Default upper bound for numeric form fields (shared between validation and configs). */
export const MAX_NUMBER_VALUE = 9999999;

// ============================================
// Display types
// ============================================

/** A single selectable item in the picker list. */
export interface PickerItem {
  id: string;
  label: string;        // Primary display text (e.g. translatedName || name)
  sublabel?: string;    // Secondary text (e.g. English name when translated differs)
  category?: string;    // For grouping into sections
}

/** A field in a form step. */
export interface PickerFormField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'decimal' | 'select' | 'toggle';
  optional?: boolean;
  maxLength?: number;
  /** For number fields: maximum allowed value (default: 9999999). */
  maxValue?: number;
  /** For select fields: dropdown options. */
  options?: { value: string; label: string }[];
  /** For toggle fields: label when on/off. */
  toggleLabels?: { on: string; off: string };
}

// ============================================
// Config types
// ============================================

/** A single step in a picker flow. */
export interface PickerStep {
  type: 'list' | 'form' | 'confirmation' | 'number_input';
  // List step options:
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  // Form step options:
  fields?: PickerFormField[];
  submitLabel?: string;
  // Confirmation step options:
  confirmLabel?: string;
  cancelLabel?: string;
  // Number input step options:
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  numberPlaceholder?: string;
}

/** Profile action functions passed to onComplete (avoids hooks in configs). */
export interface ProfileActions {
  addCropToDefaultPlot: (cropId: string) => Promise<boolean>;
  addAnimal: (animal: {
    livestockId: string; name?: string; trackingMode?: string;
    herdSize?: number;
  }) => Promise<Animal | null>;
  /** When EW chats on behalf, saves should target the farmer's profile. */
  onBehalfOfFarmerUserId?: string;
}

/** Master data sets passed to mapItems (avoids hooks in configs). */
export interface MasterData {
  masterCrops: MasterCrop[];
  masterLivestock: MasterLivestock[];
}

/**
 * Configuration for a picker type.
 *
 * Each picker type (crop_picker, livestock_picker, etc.) provides one of these.
 * The PickerSheet component renders it generically — no per-type Modal needed.
 *
 * NOTE: No React hooks in configs. Data and actions are injected by the caller.
 */
export interface PickerConfig {
  /** Widget type key, e.g. 'crop_picker'. */
  key: string;

  /** Default modal title. Can be overridden by widget.title. */
  title: string;

  /** Ordered steps: typically [list] or [list, form]. */
  steps: PickerStep[];

  /**
   * Pure function that maps master data into PickerItem[] for the list step.
   * Called by the hook — NOT a React hook itself.
   */
  mapItems: (data: MasterData) => PickerItem[];

  /** Timeout in ms for the onComplete handler (default: 10000). Override for slow operations. */
  timeoutMs?: number;

  /**
   * Called when the user completes all steps.
   * Returns display text for chat, whether data was saved, and optional structured response data.
   * `item` is null for non-list flows (confirmation, standalone form, number_input).
   */
  onComplete: (
    item: PickerItem | null,
    formData: Record<string, string> | undefined,
    purpose: 'clarify' | 'collect' | undefined,
    actions: ProfileActions,
  ) => Promise<{ text: string; saved: boolean; responseData?: Record<string, unknown> }>;
}
