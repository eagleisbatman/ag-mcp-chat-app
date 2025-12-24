// Chat API service - calls API Gateway → AI Services
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';
import { getDeviceId } from '../utils/deviceInfo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_URL = `${API_BASE_URL}/api/chat`;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

// Timeout constants
const CHAT_TIMEOUT_MS = 60000; // 60s for chat (includes MCP calls)
const DEFAULT_TIMEOUT_MS = 30000; // 30s for other endpoints

// Cached device ID for server-side persistence
let cachedDeviceId = null;

/**
 * Get device ID (cached after first call)
 */
async function ensureDeviceId() {
  if (!cachedDeviceId) {
    cachedDeviceId = await getDeviceId();
    console.log('📱 [API] Device ID loaded:', cachedDeviceId.substring(0, 20) + '...');
  }
  return cachedDeviceId;
}

/**
 * Send chat message with STREAMING support
 * Real-time text chunks are passed to onChunk callback
 *
 * @param {object} params - Chat parameters
 * @param {string} params.message - Current user message
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {string} params.language - Language code (e.g., 'en', 'hi')
 * @param {object} params.locationDetails - Human-readable location (L1-L6)
 * @param {Array} params.history - Previous messages for context (last 10)
 * @param {function} params.onChunk - Callback for each text chunk: (text) => void
 * @param {function} params.onThinking - Callback for thinking updates: (thinking) => void
 * @param {function} params.onComplete - Callback when stream completes: (fullResponse, metadata) => void
 * @param {function} params.onError - Callback on error: (error) => void
 */
export const sendChatMessageStreaming = async ({
  message,
  latitude,
  longitude,
  language,
  locationDetails,
  history = [],
  sessionId, // Optional: reuse existing session
  onChunk,
  onThinking,
  onComplete,
  onError,
}) => {
  // Get device ID for server-side persistence
  const deviceId = await ensureDeviceId();

  // Format history for AI Services
  // History is newest-first in the hook, but Gemini wants oldest-first
  const formattedHistory = history
    .filter(m => m._id !== 'welcome')
    .slice(0, 10)
    .reverse() // Reverse to get oldest-first
    .map(m => ({ text: m.text, isBot: m.isBot }));

  // Build location context
  const locationContext = locationDetails ? {
    country: locationDetails.level1Country,
    state: locationDetails.level2State,
    district: locationDetails.level3District,
    city: locationDetails.level5City,
    locality: locationDetails.level6Locality,
    displayName: locationDetails.displayName,
  } : null;

  console.log('📤 [API] Starting streaming chat:', {
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
  };

  // Use XMLHttpRequest for React Native SSE streaming
  // (fetch doesn't support ReadableStream in RN)
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let buffer = '';
    let fullText = '';
    let metadata = {};
    let lastProcessedIndex = 0;

    xhr.open('POST', API_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-API-Key', API_KEY);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    // Process SSE data as it arrives
    xhr.onprogress = () => {
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
            console.log('📥 [API] Stream complete:', {
              textLength: fullText.length,
            });
            onComplete?.(fullText, metadata);
            resolve({ success: true });
            return;
          }

          try {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            const parsed = JSON.parse(dataStr);
            console.log('📥 [API] Stream chunk:', parsed.type, 
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
              console.log('🛠️ [API] Tool call:', parsed.toolName);
            } else if (parsed.type === 'tool_result') {
              console.log('✅ [API] Tool result:', parsed.toolName);
            } else if (parsed.type === 'complete') {
              // Final response - ALWAYS update if it's the complete chunk
              console.log('🏁 [API] Received complete chunk', { 
                hasResponse: !!parsed.response, 
                responseLength: parsed.response?.length || 0 
              });
              if (parsed.response) fullText = parsed.response;
            } else if (parsed.type === 'meta') {
              // Metadata (MCP tools, intents, regions)
              metadata = parsed;
            } else if (parsed.type === 'error') {
              console.error('📥 [API] Stream error:', parsed.error);
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

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Process any remaining buffer
        if (buffer.includes('data: ')) {
          const remaining = buffer.split('data: ').filter(Boolean);
          for (const data of remaining) {
            if (data.trim() === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data.trim());
              if (parsed.type === 'complete') {
                if (parsed.response) fullText = parsed.response;
              }
            } catch (e) {
              // Skip
            }
          }
        }
        onComplete?.(fullText, metadata);
        resolve({ success: true });
      } else {
        const error = new Error(`API error: ${xhr.status}`);
        console.error('📥 [API] HTTP error:', xhr.status);
        onError?.(error);
        resolve({ success: false, error: error.message });
      }
    };

    xhr.onerror = () => {
      const error = new Error('Network request failed');
      console.error('📥 [API] Network error');
      onError?.(error);
      resolve({ success: false, error: error.message });
    };

    xhr.ontimeout = () => {
      const error = new Error('Request timeout');
      console.error('📥 [API] Timeout');
      onError?.(error);
      resolve({ success: false, error: error.message });
    };

    xhr.timeout = CHAT_TIMEOUT_MS;
    xhr.send(JSON.stringify(requestBody));
  });
};

/**
 * Send chat message (non-streaming fallback)
 * @param {object} params - Chat parameters
 * @param {string} params.message - Current user message
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {string} params.language - Language code (e.g., 'en', 'hi')
 * @param {object} params.locationDetails - Human-readable location (L1-L6)
 * @param {Array} params.history - Previous messages for context (last 10)
 * @param {string} params.sessionId - Optional: reuse existing session
 */
export const sendChatMessage = async ({ message, latitude, longitude, language, locationDetails, history = [], sessionId }) => {
  try {
    // Get device ID for server-side persistence
    const deviceId = await ensureDeviceId();

    // Format history for AI Services
    // History is newest-first in the hook, but Gemini wants oldest-first
    const formattedHistory = history
      .filter(m => m._id !== 'welcome') // Exclude welcome message
      .slice(0, 10) // Last 10 messages
      .reverse() // Reverse to get oldest-first
      .map(m => ({
        text: m.text,
        isBot: m.isBot,
      }));

    // Build location context string for AI
    const locationContext = locationDetails ? {
      country: locationDetails.level1Country,
      state: locationDetails.level2State,
      district: locationDetails.level3District,
      city: locationDetails.level5City,
      locality: locationDetails.level6Locality,
      displayName: locationDetails.displayName,
    } : null;

    console.log('📤 [API] Sending chat with:', {
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
      location: locationContext, // Human-readable location for AI context
      history: formattedHistory,
      // Server-side persistence
      deviceId,
      sessionId,
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
    console.log('📥 [API] Chat response:', {
      responseLength: data.response?.length || 0,
    });

    return {
      success: true,
      response: data.response || data.text || 'No response received',
      region: data.region,
      language: data.language,
    };
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
};

/**
 * Analyze plant image via API Gateway (proxies to AgriVision MCP)
 * This routes through the gateway to avoid SSE issues in React Native
 *
 * @param {object} params - Diagnosis parameters
 * @param {string} params.imageBase64 - Base64 encoded image (with data: prefix)
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {string} params.language - Language code
 * @param {object} params.locationDetails - Location context
 * @param {string} params.sessionId - Optional: reuse existing session
 */
export const analyzePlantImage = async ({ imageBase64, latitude, longitude, language, locationDetails, sessionId }) => {
  try {
    // Get device ID for server-side persistence
    const deviceId = await ensureDeviceId();

    console.log('🌿 [API] Starting plant diagnosis via gateway...');
    console.log('🌿 [API] Image size:', Math.round(imageBase64.length / 1024), 'KB');

    // Build location context
    const locationContext = locationDetails ? {
      country: locationDetails.level1Country,
      state: locationDetails.level2State,
      district: locationDetails.level3District,
      city: locationDetails.level5City,
      locality: locationDetails.level6Locality,
      displayName: locationDetails.displayName,
    } : null;

    // Use the chat endpoint with image parameter
    // The API Gateway handles AgriVision SSE properly
    const requestBody = {
      message: 'Analyze this plant image for health issues and provide diagnosis.',
      latitude: latitude || -1.2864,
      longitude: longitude || 36.8172,
      language: language || 'en',
      location: locationContext,
      image: imageBase64, // Base64 image for AgriVision
      stream: false, // Don't stream for diagnosis
      // Server-side persistence
      deviceId,
      sessionId,
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
    console.log('🌿 [API] Diagnosis response received:', {
      hasResponse: !!data.response,
      hasDiagnosis: !!data.diagnosis,
      responseLength: data.response?.length || 0,
    });

    // The response contains both the text response and diagnosis data
    return {
      success: true,
      response: data.response, // Formatted text for display
      diagnosis: data.diagnosis, // Raw diagnosis object
      metadata: {
        intentsDetected: data.intentsDetected || [],
        mcpToolsUsed: data.mcpToolsUsed || [],
        extractedEntities: data.extractedEntities || null,
        intentSource: data.intentSource,
      },
    };
  } catch (error) {
    console.error('🌿 [API] Plant diagnosis error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
};

/**
 * Get active MCP servers for user's location
 * @param {object} params - Query parameters
 * @param {number} params.lat - User's latitude
 * @param {number} params.lon - User's longitude
 */
export const getActiveMcpServers = async ({ lat, lon } = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat);
    if (lon !== undefined) queryParams.append('lon', lon);
    
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
    console.log('📥 [API] MCP servers response:', {
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
    console.error('MCP servers API error:', error);
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
 * Shows all available integrations with regional availability indicator
 */
export const getAllMcpServersWithStatus = async ({ lat, lon } = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat);
    if (lon !== undefined) queryParams.append('lon', lon);
    
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
    console.error('All MCP servers API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch MCP servers',
      allServers: [],
      activeServers: [],
      inactiveServers: [],
      counts: { total: 0, activeForUser: 0, inactiveForUser: 0 },
    };
  }
};

/**
 * Get LIVE status of all MCP servers with real-time health checks
 * Returns: active (working), degraded (API issues), inactive (not in region), coming_soon
 */
export const getMcpServersLiveStatus = async ({ lat, lon } = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat);
    if (lon !== undefined) queryParams.append('lon', lon);
    
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
    console.log('📥 [API] MCP live status:', {
      active: data.counts?.active || 0,
      degraded: data.counts?.degraded || 0,
      inactive: data.counts?.inactive || 0,
    });
    
    return {
      success: true,
      ...data,
    };
  } catch (error) {
    console.error('MCP live status API error:', error);
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
 * @param {string} slug - Server slug (e.g., 'accuweather', 'nextgen')
 */
export const getMcpServer = async (slug) => {
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
    console.log('📥 [API] MCP server detail:', {
      slug,
      hasMarketing: !!data.server?.tagline,
      healthStatus: data.server?.healthStatus,
    });

    return {
      success: true,
      server: data.server,
    };
  } catch (error) {
    console.error('MCP server detail API error:', error);
    return {
      success: false,
      error: parseErrorMessage(error),
      server: null,
    };
  }
};

/**
 * Detect regions for a given location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
export const detectRegions = async (lat, lon) => {
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
    console.error('Detect regions API error:', error);
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

