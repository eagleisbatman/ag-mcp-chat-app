/**
 * useA2UIPicker — Encapsulates all A2UI picker logic for ChatScreen.
 *
 * Manages picker state, maps master data to items, resolves widget context
 * to suggested items, and handles completion callbacks.
 */

import { useState, useCallback, useMemo } from 'react';
import { useProfile } from '../contexts/app/ProfileContext';
import { getPickerConfig } from '../components/a2ui/picker/pickerRegistry';
import { t } from '../constants/strings';
import { API_BASE_URL, API_KEY, ensureDeviceId } from '../services/api/core';
import { log } from '../utils/logger';
import type { PickerConfig, PickerItem, PickerFormField, ProfileActions } from '../components/a2ui/picker/types';
import type { A2UIPayload, A2UIResponse } from '../types';
import { parseContextPlots } from '../components/a2ui/picker/configs/plotSelectorConfig';
import { parseContextFarmers } from '../components/a2ui/picker/configs/farmerPickerConfig';
import { parseMultiSelectOptions } from '../components/a2ui/picker/configs/multiSelectConfig';
import { parseProfileFields } from '../components/a2ui/picker/configs/profilePromptConfig';
import { parseContextFields } from '../components/a2ui/picker/configs/formConfig';

// IMPORTANT: This side-effect import registers all picker configs with the registry.
// Removing it will cause all pickers to fall through to text-only mode silently.
import '../components/a2ui/picker/configs';

interface UseA2UIPickerDeps {
  handleSendText: (text: string, a2uiResponse?: boolean | A2UIResponse) => void;
  scrollToBottom: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  respondedA2UIWidgetIds: Set<string>;
  setRespondedA2UIWidgetIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** When EW chats on behalf, saves target the farmer's profile. */
  onBehalfOfFarmerUserId?: string;
}

interface PickerState {
  visible: boolean;
  widget: A2UIPayload | null;
  config: PickerConfig | null;
}

const CLOSED_STATE: PickerState = { visible: false, widget: null, config: null };

/**
 * Fire-and-forget: log the user's A2UI response to the gateway audit table.
 * Failures are non-critical — logged but never shown to the user.
 */
async function logA2UIResponse(interactionId: string, responseData: Record<string, unknown>): Promise<void> {
  try {
    const deviceId = await ensureDeviceId();
    const url = `${API_BASE_URL}/api/a2ui/${encodeURIComponent(interactionId)}/respond`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ responseData }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    log('[A2UI] Audit log failed (non-critical):', err);
  }
}

export function useA2UIPicker({
  handleSendText,
  scrollToBottom,
  showSuccess,
  showError,
  respondedA2UIWidgetIds,
  setRespondedA2UIWidgetIds,
  onBehalfOfFarmerUserId,
}: UseA2UIPickerDeps) {
  const { masterCrops, masterLivestock, addCropToDefaultPlot, addAnimal } = useProfile();
  const [pickerState, setPickerState] = useState<PickerState>(CLOSED_STATE);

  // Profile actions passed to picker configs (avoids hooks in configs)
  const profileActions: ProfileActions = useMemo(
    () => ({ addCropToDefaultPlot, addAnimal, onBehalfOfFarmerUserId }),
    [addCropToDefaultPlot, addAnimal, onBehalfOfFarmerUserId],
  );

  // Map master data into PickerItem[] based on active config.
  // For context-driven widgets (plot_selector, farmer_picker), items come from widget.context.
  const items: PickerItem[] = useMemo(() => {
    if (!pickerState.config) return [];
    const ctx = pickerState.widget?.context;
    const widgetType = pickerState.config.key;

    // Context-driven list widgets: items from AI payload, not master data
    if (widgetType === 'plot_selector' && ctx?.plots) {
      return parseContextPlots(ctx.plots);
    }
    if (widgetType === 'farmer_picker' && ctx?.farmers) {
      return parseContextFarmers(ctx.farmers);
    }

    return pickerState.config.mapItems({ masterCrops, masterLivestock });
  }, [pickerState.config, pickerState.widget?.context, masterCrops, masterLivestock]);

  // Extract suggested items from widget context
  const suggestedItems: string[] | undefined = useMemo(() => {
    const ctx = pickerState.widget?.context;
    if (!ctx) return undefined;
    // Check both suggestedCrops and suggestedTypes keys
    const raw = ctx.suggestedCrops || ctx.suggestedTypes;
    if (!Array.isArray(raw)) return undefined;
    const filtered = raw.filter((s): s is string => typeof s === 'string');
    return filtered.length > 0 ? filtered : undefined;
  }, [pickerState.widget?.context]);

  // Open a picker for a widget, or fall through to text for unregistered types
  const openPicker = useCallback(
    (widget: A2UIPayload) => {
      const config = getPickerConfig(widget.widgetType);
      if (config) {
        // Inject context fields into form-based configs
        const ctx = widget.context || {};
        if (widget.widgetType === 'multi_select' && ctx.options && config.steps[0]) {
          config.steps[0].fields = parseMultiSelectOptions(ctx.options);
        }
        if (widget.widgetType === 'profile_prompt' && ctx.fields && config.steps[0]) {
          config.steps[0].fields = parseProfileFields(ctx.fields);
        }
        // Date picker: inject format hint from context
        if (widget.widgetType === 'date_picker' && ctx.format && config.steps[0]?.fields?.[0]) {
          config.steps[0].fields[0].placeholder = String(ctx.format);
        }
        // Generic form: inject context fields from AI
        if (widget.widgetType === 'form' && Array.isArray(ctx.fields) && config.steps[0]) {
          config.steps[0].fields = parseContextFields(ctx.fields);
        }
        setPickerState({ visible: true, widget, config });
      } else {
        // Fallback for unregistered widget types: send text directly.
        // Known picker types should never reach here — warn in dev if they do.
        if (__DEV__ && (widget.widgetType === 'crop_picker' || widget.widgetType === 'livestock_picker')) {
          console.warn(`[useA2UIPicker] Picker config missing for ${widget.widgetType}. Did you import picker/configs?`);
        }
        setRespondedA2UIWidgetIds((prev) => new Set(prev).add(widget.widgetId));
        const ctx = widget.context || {};
        const raw = (ctx.selectedLabel as string) || widget.title || `Selected: ${widget.widgetType}`;
        const displayText = raw.replace(/[\x00-\x1f]/g, '').slice(0, 200);
        handleSendText(displayText);
        scrollToBottom();
      }
    },
    [setRespondedA2UIWidgetIds, handleSendText, scrollToBottom],
  );

  // Called by PickerSheet when the user completes the picker flow
  const handleComplete = useCallback(
    (text: string, responseData?: Record<string, unknown>) => {
      const widget = pickerState.widget;
      const a2uiResponse: A2UIResponse | undefined = widget ? {
        widgetId: widget.widgetId,
        widgetType: widget.widgetType,
        responseData: responseData || {},
        displayText: text,
      } : undefined;

      if (widget) {
        setRespondedA2UIWidgetIds((prev) => new Set(prev).add(widget.widgetId));
        // Fire-and-forget audit log if the gateway provided an interactionId
        if (widget.interactionId) {
          logA2UIResponse(widget.interactionId, { ...(a2uiResponse || { widgetId: widget.widgetId, displayText: text }) });
        }
      }
      // Send structured a2uiResponse alongside display text so AI receives structured data
      handleSendText(text, a2uiResponse);
      setPickerState(CLOSED_STATE);
      scrollToBottom();
    },
    [pickerState.widget, setRespondedA2UIWidgetIds, handleSendText, scrollToBottom],
  );

  // Close without completing — send dismiss signal so AI can re-prompt
  const handleClose = useCallback(() => {
    const widget = pickerState.widget;
    if (widget) {
      setRespondedA2UIWidgetIds((prev) => new Set(prev).add(widget.widgetId));
      handleSendText(t('a2ui.dismissed') || '[A2UI_DISMISSED]');
      scrollToBottom();
    }
    setPickerState(CLOSED_STATE);
  }, [pickerState.widget, setRespondedA2UIWidgetIds, handleSendText, scrollToBottom]);

  const handleSaveError = useCallback(() => {
    showError(t('chat.profileSaveFailed') || 'Could not save to profile. Please try again.');
  }, [showError]);

  const handleSaveSuccess = useCallback(() => {
    showSuccess(t('chat.profileSaved') || 'Saved to your profile!');
  }, [showSuccess]);

  return {
    pickerState,
    items,
    suggestedItems,
    profileActions,
    openPicker,
    handleComplete,
    handleClose,
    handleSaveError,
    handleSaveSuccess,
  };
}
