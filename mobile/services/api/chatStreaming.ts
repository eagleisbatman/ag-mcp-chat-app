import { log } from '../../utils/logger';
import type { ChatMetadata, StreamingChatParams, A2UIPayload, RationFlowStep } from '../../types';
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
              a2ui?: A2UIPayload;
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
            } else if (parsed.type === 'a2ui' && parsed.a2ui) {
              // Collect A2UI directives in metadata and notify callback
              if (!metadata.a2uiWidgets) metadata.a2uiWidgets = [];
              metadata.a2uiWidgets.push(parsed.a2ui);
              onA2UI?.(parsed.a2ui);
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
