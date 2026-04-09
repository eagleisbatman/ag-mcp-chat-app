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
  const { masterCrops, masterLivestock, farms, animals, addCropToDefaultPlot, addAnimal } = useProfile();
  const [pickerState, setPickerState] = useState<PickerState>(CLOSED_STATE);

  // Profile actions passed to picker configs (avoids hooks in configs)
  const profileActions: ProfileActions = useMemo(
    () => ({ addCropToDefaultPlot, addAnimal, onBehalfOfFarmerUserId }),
    [addCropToDefaultPlot, addAnimal, onBehalfOfFarmerUserId],
  );

  // Map master data into PickerItem[] based on active config.
  // For context-driven widgets (plot_selector, farmer_picker, picker), items come from widget.context.
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

    // Generic picker: items come from context (inline items or dataSource reference)
    if (widgetType === 'picker') {
      // Option A: inline items from AI
      if (ctx?.items && Array.isArray(ctx.items)) {
        return (ctx.items as Array<Record<string, unknown>>).map((item) => ({
          id: String(item.id || item.label),
          label: String(item.label),
          sublabel: item.sublabel ? String(item.sublabel) : undefined,
          category: item.category ? String(item.category) : undefined,
        }));
      }
      // Option B: dataSource reference — resolve from local master data
      if (ctx?.dataSource === 'crops') {
        return masterCrops.map((c) => ({
          id: c.id,
          label: c.translatedName || c.name,
          sublabel: c.translatedName && c.translatedName !== c.name ? c.name : undefined,
          category: c.category
            ? c.category.charAt(0).toUpperCase() + c.category.slice(1).toLowerCase()
            : 'Other',
        }));
      }
      if (ctx?.dataSource === 'livestock') {
        return masterLivestock.map((l) => ({
          id: l.id,
          label: l.translatedName || l.name,
          sublabel: l.translatedName && l.translatedName !== l.name ? l.name : undefined,
          category: l.category
            ? l.category.charAt(0).toUpperCase() + l.category.slice(1).toLowerCase()
            : 'Other',
        }));
      }

      // User profile data sources
      if (ctx?.dataSource === 'user_animals') {
        return animals.map((a) => ({
          id: a.id,
          label: a.name || a.livestockName || 'Unnamed',
          sublabel: [a.breed, a.herdSize ? `${a.herdSize} head` : null].filter(Boolean).join(' · '),
          category: a.livestockName || 'Other',
        }));
      }
      if (ctx?.dataSource === 'user_farms') {
        return farms.map((f) => ({
          id: f.id,
          label: f.name || 'Unnamed Farm',
          sublabel: f.totalAreaHectares ? `${f.totalAreaHectares} ha` : undefined,
          category: 'Farm',
        }));
      }
      if (ctx?.dataSource === 'user_plots') {
        return farms.flatMap((f) =>
          (f.plots || []).map((p) => ({
            id: p.id,
            label: p.name || `Plot in ${f.name || 'Farm'}`,
            sublabel: [p.soilType, p.areaHectares ? `${p.areaHectares} ha` : null].filter(Boolean).join(' · '),
            category: f.name || 'Farm',
          }))
        );
      }
      if (ctx?.dataSource === 'user_crops') {
        const seen = new Set<string>();
        return farms.flatMap((f) =>
          (f.plots || []).flatMap((p) =>
            (p.cropAllocations || [])
              .filter((ca) => {
                if (seen.has(ca.cropId)) return false;
                seen.add(ca.cropId);
                return true;
              })
              .map((ca) => ({
                id: ca.cropId,
                label: ca.cropName || 'Unknown Crop',
                sublabel: p.name || f.name,
                category: ca.season || 'Current',
              }))
          )
        );
      }
      return [];
    }

    return pickerState.config.mapItems({ masterCrops, masterLivestock });
  }, [pickerState.config, pickerState.widget?.context, masterCrops, masterLivestock, farms, animals]);

  // Extract suggested items from widget context
  const suggestedItems: string[] | undefined = useMemo(() => {
    const ctx = pickerState.widget?.context;
    if (!ctx) return undefined;
    // Check suggestedCrops, suggestedTypes, and generic 'suggested' keys
    const raw = ctx.suggestedCrops || ctx.suggestedTypes || ctx.suggested;
    if (!Array.isArray(raw)) return undefined;
    const filtered = raw.filter((s): s is string => typeof s === 'string');
    return filtered.length > 0 ? filtered : undefined;
  }, [pickerState.widget?.context]);

  // Open a picker for a widget, or fall through to text for unregistered types
  const openPicker = useCallback(
    (widget: A2UIPayload) => {
      // Chart widgets are display-only — rendered inline by A2UIDispatcher, no picker needed
      if (widget.widgetType === 'chart') return;

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
        // Generic picker: inject form steps from AI context if present
        if (widget.widgetType === 'picker' && ctx?.formSteps && Array.isArray(ctx.formSteps)) {
          config.steps.push({
            type: 'form',
            fields: (ctx.formSteps as Array<Record<string, unknown>>).map((f) => ({
              key: String(f.key),
              label: String(f.label),
              placeholder: f.placeholder ? String(f.placeholder) : '',
              type: (f.type as 'text' | 'number' | 'decimal' | 'select' | 'toggle') || 'text',
              optional: f.optional !== false,
              maxLength: (f.maxLength as number) || 200,
            })),
            submitLabel: (ctx.submitLabel as string) || t('common.submit') || 'Submit',
          });
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
    async (text: string, responseData?: Record<string, unknown>) => {
      const widget = pickerState.widget;

      // Generic picker: handle saveAction from widget.context before sending
      if (widget?.widgetType === 'picker' && widget.context?.saveAction && widget.purpose === 'collect' && responseData) {
        const saveAction = widget.context.saveAction as Record<string, unknown>;
        try {
          if (saveAction.type === 'addCropToDefaultPlot' && responseData.selectedId) {
            const ok = await profileActions.addCropToDefaultPlot(String(responseData.selectedId));
            if (ok) {
              showSuccess(t('chat.profileSaved') || 'Saved to your profile!');
            } else {
              showError(t('chat.profileSaveFailed') || 'Could not save to your profile, but your selection was sent.');
            }
          } else if (saveAction.type === 'addAnimal' && responseData.selectedId) {
            const animal = await profileActions.addAnimal({
              livestockId: String(responseData.selectedId),
              name: responseData.name ? String(responseData.name) : undefined,
              herdSize: responseData.herdSize ? Number(responseData.herdSize) : undefined,
              trackingMode: responseData.herdSize && Number(responseData.herdSize) > 1 ? 'herd' : 'individual',
            });
            if (animal) {
              showSuccess(t('chat.profileSaved') || 'Saved to your profile!');
            } else {
              showError(t('chat.profileSaveFailed') || 'Could not save to your profile, but your selection was sent.');
            }
          }
          // Other saveAction types: no save, just send text
        } catch (err) {
          log('[A2UI] Generic picker saveAction failed:', err);
          showError(t('chat.profileSaveFailed') || 'Could not save to your profile, but your selection was sent.');
        }
      }

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
    [pickerState.widget, profileActions, setRespondedA2UIWidgetIds, handleSendText, scrollToBottom, showSuccess, showError],
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
    showError(t('chat.profileSaveFailed') || 'Could not save to your profile, but your selection was sent.');
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
