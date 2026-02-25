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
import type { PickerConfig, PickerItem, ProfileActions } from '../components/a2ui/picker/types';
import type { A2UIPayload } from '../types';

// IMPORTANT: This side-effect import registers all picker configs with the registry.
// Removing it will cause all pickers to fall through to text-only mode silently.
import '../components/a2ui/picker/configs';

interface UseA2UIPickerDeps {
  handleSendText: (text: string) => void;
  scrollToBottom: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  respondedA2UIWidgetIds: Set<string>;
  setRespondedA2UIWidgetIds: React.Dispatch<React.SetStateAction<Set<string>>>;
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
}: UseA2UIPickerDeps) {
  const { masterCrops, masterLivestock, addCropToDefaultPlot, addAnimal } = useProfile();
  const [pickerState, setPickerState] = useState<PickerState>(CLOSED_STATE);

  // Profile actions passed to picker configs (avoids hooks in configs)
  const profileActions: ProfileActions = useMemo(
    () => ({ addCropToDefaultPlot, addAnimal }),
    [addCropToDefaultPlot, addAnimal],
  );

  // Map master data into PickerItem[] based on active config
  const items: PickerItem[] = useMemo(() => {
    if (!pickerState.config) return [];
    return pickerState.config.mapItems({ masterCrops, masterLivestock });
  }, [pickerState.config, masterCrops, masterLivestock]);

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
    (text: string) => {
      const widget = pickerState.widget;
      if (widget) {
        setRespondedA2UIWidgetIds((prev) => new Set(prev).add(widget.widgetId));
        // Fire-and-forget audit log if the gateway provided an interactionId
        if (widget.interactionId) {
          logA2UIResponse(widget.interactionId, { widgetId: widget.widgetId, displayText: text });
        }
      }
      handleSendText(text);
      setPickerState(CLOSED_STATE);
      scrollToBottom();
    },
    [pickerState.widget, setRespondedA2UIWidgetIds, handleSendText, scrollToBottom],
  );

  const handleClose = useCallback(() => {
    setPickerState(CLOSED_STATE);
  }, []);

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
