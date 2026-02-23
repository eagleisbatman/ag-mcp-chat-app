/**
 * Register all picker configurations.
 * Import this module for the side-effect of registering pickers.
 *
 * ## Registered widget types
 * - crop_picker      ✅ fully implemented
 * - livestock_picker ✅ fully implemented
 *
 * ## Unregistered widget types (show inline card → open PickerSheet)
 * These widget types are recognised by A2UIInlineCard (icon + title) but have
 * no PickerConfig registered yet. Tapping opens a PickerSheet that immediately
 * falls back to rendering nothing (getPickerConfig returns null).
 *
 * TODO: implement and register configs for each as needed:
 * - plot_selector    — farm plot / field selection
 * - confirmation     — yes/no confirmation dialog
 * - number_input     — numeric value entry
 * - date_picker      — calendar date selection
 * - multi_select     — checkbox multi-option picker
 * - form             — structured multi-field form
 * - profile_prompt   — user profile onboarding prompt
 */

import { registerPicker } from '../pickerRegistry';
import { createCropPickerConfig } from './cropPickerConfig';
import { createLivestockPickerConfig } from './livestockPickerConfig';

registerPicker('crop_picker', createCropPickerConfig);
registerPicker('livestock_picker', createLivestockPickerConfig);
