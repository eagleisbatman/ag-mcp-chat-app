// Chat API service - calls API Gateway → AI Services
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';
import { getDeviceId } from '../utils/deviceInfo';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { log } from '../utils/logger';

const API_URL = `${API_BASE_URL}/api/chat`;

// Timeout constants
const CHAT_TIMEOUT_MS = TIMEOUTS.CHAT;
const DEFAULT_TIMEOUT_MS = TIMEOUTS.DEFAULT;

// Cached device ID for server-side persistence
let cachedDeviceId: string | null = null;

// Type definitions
export interface LocationDetails {
  level1Country?: string;
  level2State?: string;
  level3District?: string;
  level5City?: string;
  level6Locality?: string;
  displayName?: string;
}

export interface LocationContext {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  displayName?: string;
}

export interface HistoryMessage {
  _id?: string;
  text: string;
  isBot: boolean;
}

export interface ClientDateTime {
  isoDateTime: string;
  localDateTime: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: string;
  utcOffset: string;
}

export interface ChatMetadata {
  intentsDetected?: string[];
  mcpToolsUsed?: string[];
  extractedEntities?: Record<string, unknown> | null;
  intentSource?: string;
  [key: string]: unknown;
}

export interface StreamingChatParams {
  message: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  locationDetails?: LocationDetails;
  history?: HistoryMessage[];
  sessionId?: string;
  onChunk?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onComplete?: (fullResponse: string, metadata: ChatMetadata) => void;
  onError?: (error: Error) => void;
}

export interface ChatParams {
  message: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  locationDetails?: LocationDetails;
  history?: HistoryMessage[];
  sessionId?: string;
}

export interface ChatResult {
  success: boolean;
  response?: string;
  region?: string;
  language?: string;
  error?: string;
}

export interface PlantDiagnosisParams {
  imageBase64: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  locationDetails?: LocationDetails;
  sessionId?: string;
}

export interface PlantDiagnosisResult {
  success: boolean;
  response?: string;
  diagnosis?: Record<string, unknown>;
  metadata?: ChatMetadata;
  error?: string;
}

export interface McpServer {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: string;
  healthStatus?: string;
  tagline?: string;
  regions?: string[];
  isActive?: boolean;
}

export interface McpServersResult {
  success: boolean;
  global?: McpServer[];
  regional?: McpServer[];
  detectedRegions?: string[];
  totalActive?: number;
  error?: string;
}

export interface McpServersStatusResult {
  success: boolean;
  servers?: McpServer[];
  grouped?: {
    active: McpServer[];
    degraded: McpServer[];
    inactive: McpServer[];
    comingSoon: McpServer[];
  };
  counts?: {
    total: number;
    active: number;
    degraded: number;
    inactive: number;
    comingSoon: number;
  };
  error?: string;
}

export interface McpServerResult {
  success: boolean;
  server?: McpServer | null;
  error?: string;
}

export interface RegionsResult {
  success: boolean;
  regions?: string[];
  error?: string;
}

/**
 * Get device's local date/time info for AI context
 * No permissions needed - uses device's timezone settings
 */
function getLocalDateTime(): ClientDateTime {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset(); // Minutes from UTC
  const offsetHours = -timezoneOffset / 60; // Convert to hours
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const absOffsetHours = Math.abs(offsetHours);
  const hours = Math.floor(absOffsetHours);
  const minutes = Math.round((absOffsetHours - hours) * 60);
  const offsetStr = `${offsetSign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Get timezone name if available (e.g., "Asia/Kolkata", "Africa/Addis_Ababa")
  let timezoneName = 'Unknown';
  try {
    timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    // Fallback if Intl not available
  }

  return {
    isoDateTime: now.toISOString(),           // UTC ISO format
    localDateTime: now.toString(),            // Full local string
    year: now.getFullYear(),
    month: now.getMonth() + 1,                // 1-12
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    timezone: timezoneName,
    utcOffset: offsetStr,                     // e.g., "+05:30" or "-08:00"
  };
}

/**
 * Get device ID (cached after first call)
 */
async function ensureDeviceId(): Promise<string> {
  if (!cachedDeviceId) {
    cachedDeviceId = await getDeviceId();
    log('📱 [API] Device ID loaded:', cachedDeviceId.substring(0, 20) + '...');
  }
  return cachedDeviceId;
}

/**
 * Build location context from location details
 */
function buildLocationContext(locationDetails: LocationDetails | undefined): LocationContext | null {
  return locationDetails ? {
    country: locationDetails.level1Country,
    state: locationDetails.level2State,
    district: locationDetails.level3District,
    city: locationDetails.level5City,
    locality: locationDetails.level6Locality,
    displayName: locationDetails.displayName,
  } : null;
}

/**
 * Send chat message with STREAMING support
 * Real-time text chunks are passed to onChunk callback
 * Includes auto-retry on timeout (handles Railway cold starts)
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
  // Get device ID for server-side persistence
  const deviceId = await ensureDeviceId();
  
  // Inner function for the actual request (allows retry)
  const attemptRequest = async (isRetry: boolean): Promise<{ success: boolean; error?: string }> => {
    if (isRetry) {
      log('🔄 [API] Retrying request (services warming up)...');
      onThinking?.('Services warming up, retrying...');
    }

  // Format history for AI Services
  // History is newest-first in the hook, but Gemini wants oldest-first
  // Filter out messages with null/empty text to prevent validation errors
  const formattedHistory = history
    .filter(m => m._id !== 'welcome' && m.text)
    .slice(0, 10)
    .reverse() // Reverse to get oldest-first
    .map(m => ({ text: m.text || '', isBot: m.isBot }));

  // Build location context
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
    stream: true, // Enable streaming
    // Server-side persistence
    deviceId,
    sessionId, // Pass existing sessionId if available
    // Device's local date/time for seasonal context (no permissions needed)
    clientDateTime: getLocalDateTime(),
  };

  // Use XMLHttpRequest for React Native SSE streaming
  // (fetch doesn't support ReadableStream in RN)
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let buffer = '';
    let fullText = '';
    let metadata: ChatMetadata = {};
    let lastProcessedIndex = 0;
    let completed = false; // Guard against double onComplete calls

    xhr.open('POST', API_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-API-Key', API_KEY);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    // Process SSE data as it arrives
    xhr.onprogress = (): void => {
      const newData = xhr.responseText.slice(lastProcessedIndex);
      lastProcessedIndex = xhr.responseText.length;
      buffer += newData;

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          // End of stream
          if (data === '[DONE]') {
            if (!completed) {
              completed = true;
              log('📥 [API] Stream complete:', {
                textLength: fullText.length,
              });
              onComplete?.(fullText, metadata);
            }
            resolve({ success: true });
            return;
          }

          try {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            const parsed = JSON.parse(dataStr) as {
              type: string;
              text?: string;
              thinking?: string;
              toolName?: string;
              response?: string;
              error?: string;
            };
            log('📥 [API] Stream chunk:', parsed.type, 
              parsed.text ? `(text: ${parsed.text.length} chars)` : 
              parsed.thinking ? `(thinking: ${parsed.thinking.length} chars)` : 
              parsed.toolName ? `(tool: ${parsed.toolName})` : ''
            );

            // Handle different chunk types
            if (parsed.type === 'text') {
              // Even empty text or whitespace should be processed if it's explicitly sent
              const text = parsed.text || '';
              fullText += text;
              onChunk?.(text);
            } else if (parsed.type === 'thinking' && parsed.thinking) {
              // AI's thinking process (farmer-friendly)
              onThinking?.(parsed.thinking);
            } else if (parsed.type === 'tool_call') {
              log('🛠️ [API] Tool call:', parsed.toolName);
            } else if (parsed.type === 'tool_result') {
              log('✅ [API] Tool result:', parsed.toolName);
            } else if (parsed.type === 'complete') {
              // Final response - ALWAYS update if it's the complete chunk
              log('🏁 [API] Received complete chunk', { 
                hasResponse: !!parsed.response, 
                responseLength: parsed.response?.length || 0 
              });
              if (parsed.response) fullText = parsed.response;
            } else if (parsed.type === 'meta') {
              // Metadata (MCP tools, intents, regions)
              metadata = parsed as unknown as ChatMetadata;
            } else if (parsed.type === 'error') {
              log('📥 [API] Stream error:', parsed.error);
              onError?.(new Error(parsed.error || 'Stream error'));
              resolve({ success: false, error: parsed.error });
              return;
            }
          } catch (parseError) {
            // Skip unparseable chunks (partial JSON)
          }
        }
      }
    };

    xhr.onload = (): void => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Process any remaining buffer
        if (buffer.includes('data: ')) {
          const remaining = buffer.split('data: ').filter(Boolean);
          for (const data of remaining) {
            if (data.trim() === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data.trim()) as { type: string; response?: string };
              if (parsed.type === 'complete') {
                if (parsed.response) fullText = parsed.response;
              }
            } catch (e) {
              // Skip
            }
          }
        }
        // Only call onComplete if not already called by [DONE] handler
        if (!completed) {
          completed = true;
          onComplete?.(fullText, metadata);
        }
        resolve({ success: true });
      } else {
        const error = new Error(`API error: ${xhr.status}`);
        log('📥 [API] HTTP error:', xhr.status);
        onError?.(error);
        resolve({ success: false, error: error.message });
      }
    };

    xhr.onerror = (): void => {
      const error = new Error('Network request failed');
      log('📥 [API] Network error');
      onError?.(error);
      resolve({ success: false, error: error.message });
    };

    xhr.ontimeout = (): void => {
      const error = new Error('Request timeout');
      log('📥 [API] Timeout');
      onError?.(error);
      resolve({ success: false, error: error.message });
    };

    xhr.timeout = CHAT_TIMEOUT_MS;
    xhr.send(JSON.stringify(requestBody));
  });
};

/**
 * Send chat message (non-streaming fallback)
 */
export const sendChatMessage = async ({
  message,
  latitude,
  longitude,
  language,
  locationDetails,
  history = [],
  sessionId,
}: ChatParams): Promise<ChatResult> => {
  try {
    // Get device ID for server-side persistence
    const deviceId = await ensureDeviceId();

    // Format history for AI Services
    // Filter out messages with null/empty text to prevent validation errors
    const formattedHistory = history
      .filter(m => m._id !== 'welcome' && m.text)
      .slice(0, 10)
      .reverse()
      .map(m => ({ text: m.text || '', isBot: m.isBot }));

    // Build location context string for AI
    const locationContext = buildLocationContext(locationDetails);

    log('📤 [API] Sending chat with:', {
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
      deviceId,
      sessionId,
      clientDateTime: getLocalDateTime(),
    };

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    }, CHAT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    log('📥 [API] Chat response:', {
      responseLength: data.response?.length || 0,
    });

    return {
      success: true,
      response: data.response || data.text || 'No response received',
      region: data.region,
      language: data.language,
    };
  } catch (error) {
    log('Chat API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
};

/**
 * Analyze plant image via API Gateway (proxies to AgriVision MCP)
 */
export const analyzePlantImage = async ({
  imageBase64,
  latitude,
  longitude,
  language,
  locationDetails,
  sessionId,
}: PlantDiagnosisParams): Promise<PlantDiagnosisResult> => {
  try {
    const deviceId = await ensureDeviceId();

    log('🌿 [API] Starting plant diagnosis via gateway...');
    log('🌿 [API] Image size:', Math.round(imageBase64.length / 1024), 'KB');

    const locationContext = buildLocationContext(locationDetails);

    const requestBody = {
      message: 'Analyze this plant image for health issues and provide diagnosis.',
      latitude: latitude || -1.2864,
      longitude: longitude || 36.8172,
      language: language || 'en',
      location: locationContext,
      image: imageBase64,
      stream: false,
      deviceId,
      sessionId,
      clientDateTime: getLocalDateTime(),
    };

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    }, CHAT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    log('🌿 [API] Diagnosis response received:', {
      hasResponse: !!data.response,
      hasDiagnosis: !!data.diagnosis,
      responseLength: data.response?.length || 0,
    });

    return {
      success: true,
      response: data.response,
      diagnosis: data.diagnosis,
      metadata: {
        ...(data._meta || {}),
        intentsDetected: data.intentsDetected || [],
        mcpToolsUsed: data.mcpToolsUsed || [],
        extractedEntities: data.extractedEntities || null,
        intentSource: data.intentSource,
      },
    };
  } catch (error) {
    log('🌿 [API] Plant diagnosis error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
};

/**
 * Get active MCP servers for user's location
 */
export const getActiveMcpServers = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());
    
    const url = `${API_BASE_URL}/api/mcp-servers/active${queryParams.toString() ? `?${queryParams}` : ''}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    log('📥 [API] MCP servers response:', {
      globalCount: data.global?.length || 0,
      regionalCount: data.regional?.length || 0,
      totalActive: data.totalActive,
    });
    
    return {
      success: true,
      global: data.global || [],
      regional: data.regional || [],
      detectedRegions: data.detectedRegions || [],
      totalActive: data.totalActive || 0,
    };
  } catch (error) {
    log('MCP servers API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
      global: [],
      regional: [],
      detectedRegions: [],
      totalActive: 0,
    };
  }
};

/**
 * Get ALL MCP servers with active/inactive status based on user's location
 */
export const getAllMcpServersWithStatus = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersStatusResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());
    
    const url = `${API_BASE_URL}/api/mcp-servers/all-with-status${queryParams.toString() ? `?${queryParams}` : ''}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log('All MCP servers API error:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to fetch MCP servers',
    };
  }
};

/**
 * Get LIVE status of all MCP servers with real-time health checks
 */
export const getMcpServersLiveStatus = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersStatusResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());
    
    const url = `${API_BASE_URL}/api/mcp-servers/live-status${queryParams.toString() ? `?${queryParams}` : ''}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    log('📥 [API] MCP live status:', {
      active: data.counts?.active || 0,
      degraded: data.counts?.degraded || 0,
      inactive: data.counts?.inactive || 0,
    });
    
    return {
      success: true,
      ...data,
    };
  } catch (error) {
    log('MCP live status API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
      servers: [],
      grouped: { active: [], degraded: [], inactive: [], comingSoon: [] },
      counts: { total: 0, active: 0, degraded: 0, inactive: 0, comingSoon: 0 },
    };
  }
};

/**
 * Get a specific MCP server by slug with full marketing content
 */
export const getMcpServer = async (slug: string): Promise<McpServerResult> => {
  try {
    const url = `${API_BASE_URL}/api/mcp-servers/${slug}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    log('📥 [API] MCP server detail:', {
      slug,
      hasMarketing: !!data.server?.tagline,
      healthStatus: data.server?.healthStatus,
    });

    return {
      success: true,
      server: data.server,
    };
  } catch (error) {
    log('MCP server detail API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
      server: null,
    };
  }
};

/**
 * Detect regions for a given location
 */
export const detectRegions = async (lat: number, lon: number): Promise<RegionsResult> => {
  try {
    const url = `${API_BASE_URL}/api/regions/detect?lat=${lat}&lon=${lon}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log('Detect regions API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
};

export default {
  sendChatMessage,
  sendChatMessageStreaming,
  getActiveMcpServers,
  getAllMcpServersWithStatus,
  getMcpServersLiveStatus,
  getMcpServer,
  detectRegions,
};
