/**
 * Register all picker configurations.
 * Import this module for the side-effect of registering pickers.
 */

import { registerPicker } from '../pickerRegistry';
import { createCropPickerConfig } from './cropPickerConfig';
import { createLivestockPickerConfig } from './livestockPickerConfig';

registerPicker('crop_picker', createCropPickerConfig);
registerPicker('livestock_picker', createLivestockPickerConfig);
