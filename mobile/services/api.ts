// Chat API service - calls API Gateway → AI Services
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';
import { getDeviceId } from '../utils/deviceInfo';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { log } from '../utils/logger';
import { 
  LocationDetails, 
  LocationContext, 
  HistoryMessage, 
  ClientDateTime, 
  ChatMetadata, 
  StreamingChatParams, 
  ChatParams, 
  ChatResult, 
  PlantDiagnosisParams, 
  PlantDiagnosisResult, 
  McpServer, 
  McpServersResult, 
  McpServersStatusResult, 
  McpServerResult, 
  RegionsResult 
} from '../types';

const API_URL = `${API_BASE_URL}/api/chat`;

// Timeout constants
const CHAT_TIMEOUT_MS = TIMEOUTS.CHAT;
const DEFAULT_TIMEOUT_MS = TIMEOUTS.DEFAULT;

// Cached device ID for server-side persistence
let cachedDeviceId: string | null = null;

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

  // Format history for AI Services
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

    xhr.open('POST', API_URL, true);
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
        if (line.startsWith('data: ')) {
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
              onError?.(new Error(parsed.error || 'Stream error'));
              resolve({ success: false, error: parsed.error });
              return;
            }
          } catch (e) { /* Skip partial JSON */ }
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
        const error = new Error(`API error: ${xhr.status}`);
        onError?.(error);
        resolve({ success: false, error: error.message });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: 'Network request failed' });
    xhr.ontimeout = () => resolve({ success: false, error: 'Request timeout' });
    xhr.timeout = CHAT_TIMEOUT_MS;
    xhr.send(JSON.stringify(requestBody));
  });
};

/**
 * Send chat message (non-streaming fallback)
 */
export const sendChatMessage = async (params: ChatParams): Promise<ChatResult> => {
  try {
    const deviceId = await ensureDeviceId();
    const formattedHistory = (params.history || [])
      .filter(m => m._id !== 'welcome' && m.text)
      .slice(0, 10)
      .reverse()
      .map(m => ({ text: m.text || '', isBot: m.isBot }));

    const locationContext = buildLocationContext(params.locationDetails);

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        ...params,
        location: locationContext,
        history: formattedHistory,
        deviceId,
        clientDateTime: getLocalDateTime(),
      }),
    }, CHAT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return {
      success: true,
      response: data.response || data.text || 'No response received',
      region: data.region,
      language: data.language,
    };
  } catch (error) {
    return { success: false, error: parseErrorMessage(error) };
  }
};

/**
 * Analyze plant image via API Gateway
 */
export const analyzePlantImage = async (params: PlantDiagnosisParams): Promise<PlantDiagnosisResult> => {
  try {
    const deviceId = await ensureDeviceId();
    const locationContext = buildLocationContext(params.locationDetails);

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        message: 'Analyze this plant image for health issues and provide diagnosis.',
        latitude: params.latitude || -1.2864,
        longitude: params.longitude || 36.8172,
        language: params.language || 'en',
        location: locationContext,
        image: params.imageBase64,
        stream: false,
        deviceId,
        sessionId: params.sessionId,
        clientDateTime: getLocalDateTime(),
      }),
    }, CHAT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
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
    return { success: false, error: parseErrorMessage(error) };
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
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    
    return {
      success: true,
      global: data.global || [],
      regional: data.regional || [],
      detectedRegions: data.detectedRegions || [],
      totalActive: data.totalActive || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: parseErrorMessage(error),
      global: [], regional: [], detectedRegions: [], totalActive: 0,
    };
  }
};

/**
 * Get ALL MCP servers with active/inactive status
 */
export const getAllMcpServersWithStatus = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersStatusResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());
    
    const url = `${API_BASE_URL}/api/mcp-servers/all-with-status?${queryParams}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Get LIVE status of all MCP servers
 */
export const getMcpServersLiveStatus = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersStatusResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());
    
    const url = `${API_BASE_URL}/api/mcp-servers/live-status?${queryParams}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    
    return { success: true, ...data };
  } catch (error) {
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
 * Get a specific MCP server by slug
 */
export const getMcpServer = async (slug: string): Promise<McpServerResult> => {
  try {
    const url = `${API_BASE_URL}/api/mcp-servers/${slug}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    return { success: true, server: data.server };
  } catch (error) {
    return { success: false, error: parseErrorMessage(error), server: null };
  }
};

/**
 * Detect regions for a given location
 */
export const detectRegions = async (lat: number, lon: number): Promise<RegionsResult> => {
  try {
    const url = `${API_BASE_URL}/api/regions/detect?lat=${lat}&lon=${lon}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: parseErrorMessage(error) };
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
