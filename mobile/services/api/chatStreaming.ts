import { log } from '../../utils/logger';
import type { ChatMetadata, StreamingChatParams } from '../../types';
import {
  API_KEY,
  CHAT_API_URL,
  CHAT_TIMEOUT_MS,
  buildLocationContext,
  ensureDeviceId,
  getLocalDateTime,
} from './core';

/**
 * Send chat message with STREAMING support
 * Real-time text chunks are passed to onChunk callback
 */
export const sendChatMessageStreaming = async ({
  message,
  latitude,
  longitude,
  language,
  locationDetails,
  history = [],
  sessionId,
  onChunk,
  onThinking,
  onComplete,
  onError,
}: StreamingChatParams): Promise<{ success: boolean; error?: string }> => {
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
    latitude: latitude || -1.2864,
    longitude: longitude || 36.8172,
    language: language || 'en',
    location: locationContext,
    history: formattedHistory,
    stream: true,
    deviceId,
    sessionId,
    clientDateTime: getLocalDateTime(),
  };

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let buffer = '';
    let fullText = '';
    let metadata: ChatMetadata = {};
    let lastProcessedIndex = 0;
    let completed = false;

    const finishError = (error: Error): void => {
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
          };

          if (parsed.type === 'text') {
            const text = parsed.text || '';
            fullText += text;
            onChunk?.(text);
          } else if (parsed.type === 'thinking' && parsed.thinking) {
            onThinking?.(parsed.thinking);
          } else if (parsed.type === 'complete' && parsed.response) {
            fullText = parsed.response;
          } else if (parsed.type === 'meta') {
            metadata = parsed as unknown as ChatMetadata;
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

    xhr.onerror = () => finishError(new Error('Network request failed'));
    xhr.ontimeout = () => finishError(new Error('Request timeout'));
    xhr.timeout = CHAT_TIMEOUT_MS;
    xhr.send(JSON.stringify(requestBody));
  });
};
