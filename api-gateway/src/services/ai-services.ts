/**
 * AI Services Client
 * Handles communication with the AI Services backend (Gemini endpoints)
 */

import {
  ChatRequest,
  ChatResponse,
  TtsRequest,
  TtsResponse,
  TranscribeRequest,
  TranscribeResponse,
} from '../types';

const AI_SERVICES_URL =
  process.env.AI_SERVICES_URL || 'https://ag-mcp-ai-services.up.railway.app';
const AI_SERVICES_KEY = process.env.AI_SERVICES_KEY || '';
const CHAT_TIMEOUT_MS = parseInt(process.env.CHAT_TIMEOUT_MS || '60000');
const TTS_TIMEOUT_MS = parseInt(process.env.TTS_TIMEOUT_MS || '60000');
const TRANSCRIBE_TIMEOUT_MS = parseInt(
  process.env.TRANSCRIBE_TIMEOUT_MS || '30000'
);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Call AI Services with timeout
 */
async function callAiServices<T>(
  endpoint: string,
  body: unknown,
  timeout: number
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${AI_SERVICES_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_SERVICES_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[AI Services] Error calling ${endpoint}:`, errorText);
      return { success: false, error: `AI Services returned ${response.status}` };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    clearTimeout(timeoutId);
    const err = error as Error;

    if (err.name === 'AbortError') {
      console.error(`[AI Services] Timeout calling ${endpoint}`);
      return { success: false, error: 'Request timed out' };
    }

    console.error(`[AI Services] Error calling ${endpoint}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send chat request to AI Services
 */
export async function sendChatRequest(
  request: ChatRequest & {
    mcpResults?: Record<string, unknown>;
    mcpServers?: Record<string, unknown>;
    intentsDetected?: string[];
    detectedRegions?: Array<{ name: string; code: string; level: number }>;
    locationContext?: Record<string, unknown>;
    noDataFallbacks?: Record<string, unknown>;
  }
): Promise<ApiResponse<ChatResponse>> {
  return callAiServices<ChatResponse>('/api/chat', request, CHAT_TIMEOUT_MS);
}

/**
 * Generate TTS audio via AI Services
 */
export async function generateTts(
  request: TtsRequest
): Promise<ApiResponse<TtsResponse>> {
  return callAiServices<TtsResponse>('/api/tts', request, TTS_TIMEOUT_MS);
}

/**
 * Transcribe audio via AI Services
 */
export async function transcribeAudio(
  request: TranscribeRequest
): Promise<ApiResponse<TranscribeResponse>> {
  return callAiServices<TranscribeResponse>(
    '/api/transcribe',
    request,
    TRANSCRIBE_TIMEOUT_MS
  );
}

/**
 * Generate conversation title via AI Services
 */
export async function generateTitle(request: {
  messages: Array<{ role: string; content: string }>;
  language: string;
}): Promise<ApiResponse<{ title: string; generatedAt: string }>> {
  return callAiServices<{ title: string; generatedAt: string }>(
    '/api/generate-title',
    request,
    30000
  );
}
