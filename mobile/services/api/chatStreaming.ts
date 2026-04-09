import { log } from '../../utils/logger';
import type { ChatMetadata, StreamingChatParams, A2UIPayload, A2UIWidgetType, A2UIEvent, A2UIOperation, RationFlowStep } from '../../types';
import { isA2UIOperation } from '../../types';
import {
  API_KEY,
  CHAT_API_URL,
  CHAT_TIMEOUT_MS,
  FALLBACK_LATITUDE,
  FALLBACK_LONGITUDE,
  buildLocationContext,
  ensureDeviceId,
  getLocalDateTime,
} from './core';

// FOLLOWUP tag filtering removed — server already strips these tags before emitting SSE chunks

/**
 * Send chat message with STREAMING support
 * Real-time text chunks are passed to onChunk callback
 */
export interface StreamingChatResult {
  promise: Promise<{ success: boolean; error?: string }>;
  abort: () => void;
}

export const sendChatMessageStreaming = ({
  message,
  latitude,
  longitude,
  language,
  locationDetails,
  history = [],
  sessionId,
  onBehalfOfFarmerUserId,
  a2uiResponse,
  previousInteractionId,
  onChunk,
  onThinking,
  onComplete,
  onError,
  onA2UI,
  onFlowStep,
}: StreamingChatParams): StreamingChatResult => {
  let xhrRef: XMLHttpRequest | null = null;
  let aborted = false;

  const promise = (async () => {
    const deviceId = await ensureDeviceId();
    const formattedHistory = history
      .filter(m => m._id !== 'welcome' && m.text)
      .slice(0, 10)
      .reverse()
      .map(m => ({ text: m.text || '', isBot: m.isBot }));

    const locationContext = buildLocationContext(locationDetails);

    log('📤 [API] Starting streaming chat:', {
      historyCount: formattedHistory.length,
      location: locationContext?.displayName || `${latitude}, ${longitude}`,
      language,
      deviceId: deviceId?.substring(0, 15) + '...',
    });

    const requestBody = {
      message,
      latitude: latitude ?? FALLBACK_LATITUDE,
      longitude: longitude ?? FALLBACK_LONGITUDE,
      language: language || 'en',
      location: locationContext,
      history: formattedHistory,
      stream: true,
      deviceId,
      sessionId,
      ...(onBehalfOfFarmerUserId && { onBehalfOfFarmerUserId }),
      ...(a2uiResponse && { a2uiResponse }),
      ...(previousInteractionId && { previousInteractionId }),
      clientDateTime: getLocalDateTime(),
    };

    // If abort was called before XHR was created, bail out
    if (aborted) {
      return { success: false, error: 'Aborted' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef = xhr;
      let buffer = '';
      let fullText = '';
      let metadata: ChatMetadata = {};
      let lastProcessedIndex = 0;
      let completed = false;

      const finishError = (error: Error): void => {
        log('❌ [API] Streaming chat error:', error.message, 'status:', xhr.status, 'response:', xhr.responseText?.substring(0, 200));
        if (!completed) {
          completed = true;
          onError?.(error);
        }
        resolve({ success: false, error: error.message });
      };

      xhr.open('POST', CHAT_API_URL, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-API-Key', API_KEY);
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('X-Device-Id', deviceId);

      xhr.onprogress = (): void => {
        const newData = xhr.responseText.slice(lastProcessedIndex);
        lastProcessedIndex = xhr.responseText.length;
        buffer += newData;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            if (!completed) {
              completed = true;
              log('📥 [API] Stream complete:', { textLength: fullText.length });
              onComplete?.(fullText, metadata);
            }
            resolve({ success: true });
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              type: string;
              text?: string;
              thinking?: string;
              toolName?: string;
              response?: string;
              error?: string;
              interactionId?: string;
              followUpQuestions?: string[];
              // New format: A2UI operation wrapped in a2ui field
              a2ui?: A2UIEvent;
              // Gateway spread format: A2UIOperation fields at top level
              op?: string;
              surface?: string;
              node?: Record<string, unknown>;
              flowStep?: RationFlowStep;
              usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
            };

            if (parsed.type === 'text') {
              const text = parsed.text || '';
              fullText += text;
              // Server already strips FOLLOWUP tags — pass text directly
              if (text) {
                onChunk?.(text);
              }
            } else if (parsed.type === 'thinking' && parsed.thinking) {
              onThinking?.(parsed.thinking);
            } else if (parsed.type === 'complete' && parsed.response) {
              fullText = parsed.response;
              // Capture interactionId for stateful Gemini conversation chaining
              if (parsed.interactionId) {
                metadata.interactionId = parsed.interactionId;
              }
              // Extract follow-up questions from the complete chunk
              if (parsed.followUpQuestions && parsed.followUpQuestions.length > 0) {
                metadata.followUpQuestions = parsed.followUpQuestions;
              }
              // Capture token usage for cost tracking
              if (parsed.usage) {
                metadata.usage = parsed.usage;
              }
            } else if (parsed.type === 'a2ui') {
              // Handle both A2UI formats:
              // 1. farmerchat-agent wrapped: { type: 'a2ui', a2ui: <A2UIPayload | A2UIOperation> }
              // 2. Gateway spread: { type: 'a2ui', op: '...', surface: '...', node: {...} }
              let a2uiEvent: A2UIEvent | undefined;

              if (parsed.a2ui) {
                // Wrapped format from farmerchat-agent
                a2uiEvent = parsed.a2ui;
              } else if (parsed.op && parsed.surface && parsed.node) {
                // Spread format from gateway fast-path — reconstruct as A2UIOperation
                a2uiEvent = {
                  op: parsed.op,
                  surface: parsed.surface,
                  node: parsed.node,
                } as unknown as A2UIOperation;
              }

              if (a2uiEvent) {
                // For new-format A2UIOperations, convert to a legacy-compatible A2UIPayload
                // so existing picker/chart flows still work, while also storing the raw operation
                if (isA2UIOperation(a2uiEvent)) {
                  // Store in a2uiOperations for new renderers
                  if (!metadata.a2uiOperations) metadata.a2uiOperations = [];
                  (metadata.a2uiOperations as A2UIOperation[]).push(a2uiEvent);

                  // Also convert to legacy payload shape for backward-compatible rendering
                  const legacyPayload = operationToLegacyPayload(a2uiEvent);
                  if (legacyPayload) {
                    if (!metadata.a2uiWidgets) metadata.a2uiWidgets = [];
                    metadata.a2uiWidgets.push(legacyPayload);
                    onA2UI?.(legacyPayload);
                  }
                } else {
                  // Legacy A2UIPayload — handle as before
                  if (!metadata.a2uiWidgets) metadata.a2uiWidgets = [];
                  metadata.a2uiWidgets.push(a2uiEvent as A2UIPayload);
                  onA2UI?.(a2uiEvent as A2UIPayload);
                }
              }
            } else if (parsed.type === 'flow_step' && parsed.flowStep) {
              onFlowStep?.(parsed.flowStep);
            } else if (parsed.type === 'meta') {
              metadata = { ...metadata, ...(parsed as unknown as ChatMetadata) };
            } else if (parsed.type === 'error') {
              finishError(new Error(parsed.error || 'Stream error'));
              return;
            }
          } catch {
            // Skip partial JSON
          }
        }
      };

      xhr.onload = (): void => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!completed) {
            completed = true;
            onComplete?.(fullText, metadata);
          }
          resolve({ success: true });
        } else {
          finishError(new Error(`API error: ${xhr.status}`));
        }
      };

      xhr.onabort = () => {
        if (!completed) {
          completed = true;
          // Treat partial text as the final response on abort
          onComplete?.(fullText, metadata);
        }
        resolve({ success: true });
      };

      xhr.onerror = () => finishError(new Error('Network request failed'));
      xhr.ontimeout = () => finishError(new Error('Request timeout'));
      xhr.timeout = CHAT_TIMEOUT_MS;
      xhr.send(JSON.stringify(requestBody));
    });
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      if (xhrRef) {
        xhrRef.abort();
      }
    },
  };
};

// ============================================
// A2UI Envelope → Legacy Payload Converter
// ============================================

/**
 * Component name → legacy widgetType mapping for A2UI envelope operations.
 * Components that map to 'chart' are display-only (rendered by A2UIChartCard).
 * Components that map to interactive widget types trigger picker flows.
 * Components that return null need new dedicated renderers in A2UIDispatcher.
 */
const COMPONENT_TO_WIDGET_TYPE: Record<string, A2UIWidgetType | null> = {
  // Weather — display-only, rendered as chart cards
  WeatherCard: 'chart',
  ForecastTable: 'chart',
  TemperatureChart: 'chart',
  PrecipitationChart: 'chart',
  SprayWindowTimeline: 'chart',
  // Soil — display-only
  SoilAnalysisCard: 'chart',
  NutrientChart: 'chart',
  PHGauge: 'chart',
  // Diagnosis — display-only
  DiagnosisCard: 'chart',
  IssueList: 'chart',
  // RationSmart — display-only
  DietPlanCard: 'chart',
  FeedTable: 'chart',
  FeedDistributionChart: 'chart',
  FeedingSchedule: 'chart',
  // Forms — interactive (DynamicForm may also map to 'picker' — see operationToLegacyPayload)
  DynamicForm: 'form',
  ConfirmationCard: 'confirmation',
  ClarificationCard: 'multi_select',
  // Utility — display-only
  StatGrid: 'chart',
  AlertBanner: 'chart',
  SuggestionChips: null, // Handled separately via followUpQuestions
  // Rich content — display-only
  DataTable: 'chart',
  LineChart: 'chart',
  BarChart: 'chart',
  PieChart: 'chart',
  CollapsibleSection: 'chart',
  ImageViewer: 'chart',
  MapView: 'chart',
  // Workflow
  WorkflowTimeline: 'chart',
  ToolOutputPreview: 'chart',
};

/**
 * Convert an A2UIOperation (new envelope protocol) to a legacy A2UIPayload
 * so the existing A2UIDispatcher can render it. Returns null for components
 * that should not be rendered as legacy widgets (e.g., SuggestionChips).
 *
 * The `context` field of the legacy payload carries the full props from the
 * A2UIOperation node, along with `_a2ui.component` and `_a2ui.surface` metadata
 * that new renderers can use for component-specific rendering.
 */
function operationToLegacyPayload(op: A2UIOperation): A2UIPayload | null {
  const componentName = op.node.component;
  let widgetType = COMPONENT_TO_WIDGET_TYPE[componentName];

  // null means skip (e.g., SuggestionChips are handled via followUpQuestions)
  if (widgetType === null || widgetType === undefined) return null;

  const props = op.node.props || {};

  // DynamicForm can carry widgetType: 'picker' in props to trigger the generic picker
  if (componentName === 'DynamicForm' && props.widgetType === 'picker') {
    widgetType = 'picker';
  }

  const title = typeof props.title === 'string'
    ? props.title
    : typeof props.label === 'string'
      ? props.label
      : componentName;

  // For chart-type widgets, map props into the ChartContext format that A2UIChartCard expects
  let context: Record<string, unknown>;
  if (widgetType === 'chart') {
    context = mapComponentToChartContext(componentName, props, op.surface);
  } else {
    context = { ...props, _a2ui: { component: componentName, surface: op.surface } };
  }

  return {
    widgetId: op.node.id,
    widgetType,
    title,
    description: typeof props.summary === 'string' ? props.summary : undefined,
    context,
  };
}

/**
 * Map A2UI component props to the ChartContext format that A2UIChartCard understands.
 * Preserves the original component name and surface in _a2ui metadata so future
 * dedicated renderers can differentiate.
 */
function mapComponentToChartContext(
  component: string,
  props: Record<string, unknown>,
  surface: string,
): Record<string, unknown> {
  const base = {
    _a2ui: { component, surface },
    title: props.title,
    summary: props.summary,
  };

  switch (component) {
    case 'TemperatureChart':
    case 'LineChart': {
      const xAxis = props.xAxis as { label?: string; values?: string[] } | undefined;
      const series = props.series as Array<{ name: string; values: number[]; color?: string }> | undefined;
      return {
        ...base,
        chartType: 'line',
        xLabel: xAxis?.label,
        labels: xAxis?.values || [],
        datasets: (series || []).map(s => ({
          label: s.name,
          data: s.values,
          color: s.color,
        })),
      };
    }
    case 'PrecipitationChart':
    case 'BarChart': {
      const xAxis = props.xAxis as { label?: string; values?: string[] } | undefined;
      const bars = props.bars as Array<{ value: number; color?: string }> | undefined;
      const threshold = props.threshold as number | undefined;
      return {
        ...base,
        chartType: 'bar',
        xLabel: xAxis?.label,
        labels: xAxis?.values || [],
        datasets: [{
          label: typeof props.title === 'string' ? props.title : 'Values',
          data: (bars || []).map(b => b.value),
          color: (bars || [])[0]?.color,
        }],
        ...(threshold != null ? { baseline: { value: threshold, label: `Threshold: ${threshold}` } } : {}),
      };
    }
    case 'PieChart':
    case 'FeedDistributionChart': {
      const segments = props.segments as Array<{ label: string; value: number; color?: string }> | undefined;
      return {
        ...base,
        chartType: 'bar', // A2UIChartCard only supports line/bar; render as horizontal bar
        labels: (segments || []).map(s => s.label),
        datasets: [{
          label: typeof props.title === 'string' ? props.title : 'Distribution',
          data: (segments || []).map(s => s.value),
          color: (segments || [])[0]?.color,
        }],
      };
    }
    default:
      // For components without chart mapping (WeatherCard, StatGrid, etc.),
      // pass all props through so the card can display at least the title/summary
      return { ...base, ...props };
  }
}
