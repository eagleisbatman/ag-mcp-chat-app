/**
 * Register all picker configurations.
 * Import this module for the side-effect of registering pickers.
 *
 * ## Registered widget types (11/11)
 * - crop_picker      ✅ list picker (single-step) — deprecated: use 'picker' with dataSource='crops'
 * - livestock_picker ✅ list + form picker (two-step) — deprecated: use 'picker' with dataSource='livestock'
 * - confirmation     ✅ yes/no dialog
 * - number_input     ✅ numeric value entry
 * - form             ✅ multi-field structured form
 * - date_picker      ✅ date entry via form
 * - multi_select     ✅ toggle-based multi-option picker
 * - plot_selector    ✅ farm plot list picker
 * - profile_prompt   ✅ profile field collection form
 * - farmer_picker    ✅ EW farmer list picker
 * - picker           ✅ generic picker — AI sends items/dataSource/formSteps via context
 */

import { registerPicker } from '../pickerRegistry';
import { createCropPickerConfig } from './cropPickerConfig';
import { createLivestockPickerConfig } from './livestockPickerConfig';
import { createConfirmationConfig } from './confirmationConfig';
import { createNumberInputConfig } from './numberInputConfig';
import { createFormConfig } from './formConfig';
import { createDatePickerConfig } from './datePickerConfig';
import { createMultiSelectConfig } from './multiSelectConfig';
import { createPlotSelectorConfig } from './plotSelectorConfig';
import { createProfilePromptConfig } from './profilePromptConfig';
import { createFarmerPickerConfig } from './farmerPickerConfig';
import { createGenericPickerConfig } from './genericPickerConfig';

// Legacy domain-specific pickers (kept for backward compatibility with old-format widgets)
registerPicker('crop_picker', createCropPickerConfig);
registerPicker('livestock_picker', createLivestockPickerConfig);
registerPicker('confirmation', createConfirmationConfig);
registerPicker('number_input', createNumberInputConfig);
registerPicker('form', createFormConfig);
registerPicker('date_picker', createDatePickerConfig);
registerPicker('multi_select', createMultiSelectConfig);
registerPicker('plot_selector', createPlotSelectorConfig);
registerPicker('profile_prompt', createProfilePromptConfig);
registerPicker('farmer_picker', createFarmerPickerConfig);

// Generic picker — AI sends items/dataSource/formSteps/saveAction via widget.context
registerPicker('picker', createGenericPickerConfig);
