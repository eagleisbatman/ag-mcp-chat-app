/**
 * Register all picker configurations.
 * Import this module for the side-effect of registering pickers.
 *
 * ## Registered widget types
 * - crop_picker      ✅ list picker (single-step)
 * - livestock_picker ✅ list + form picker (two-step)
 * - confirmation     ✅ yes/no dialog
 * - number_input     ✅ numeric value entry
 * - form             ✅ multi-field structured form
 *
 * ## Unregistered widget types (fallback to text)
 * - plot_selector    — farm plot / field selection
 * - date_picker      — calendar date selection
 * - multi_select     — checkbox multi-option picker
 * - profile_prompt   — user profile onboarding prompt
 * - farmer_picker    — select farmer from EW's connected list
 */

import { registerPicker } from '../pickerRegistry';
import { createCropPickerConfig } from './cropPickerConfig';
import { createLivestockPickerConfig } from './livestockPickerConfig';
import { createConfirmationConfig } from './confirmationConfig';
import { createNumberInputConfig } from './numberInputConfig';
import { createFormConfig } from './formConfig';

registerPicker('crop_picker', createCropPickerConfig);
registerPicker('livestock_picker', createLivestockPickerConfig);
registerPicker('confirmation', createConfirmationConfig);
registerPicker('number_input', createNumberInputConfig);
registerPicker('form', createFormConfig);
