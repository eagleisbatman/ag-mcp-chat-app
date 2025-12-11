// Chat API service - calls API Gateway → n8n workflow

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_URL = `${API_BASE_URL}/api/chat`;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

/**
 * Send chat message with conversation history and location context
 * @param {object} params - Chat parameters
 * @param {string} params.message - Current user message
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {string} params.language - Language code (e.g., 'en', 'hi')
 * @param {object} params.locationDetails - Human-readable location (L1-L6)
 * @param {Array} params.history - Previous messages for context (last 10)
 */
export const sendChatMessage = async ({ message, latitude, longitude, language, locationDetails, history = [] }) => {
  try {
    // Format history for n8n workflow
    const formattedHistory = history
      .filter(m => m._id !== 'welcome') // Exclude welcome message
      .slice(0, 10) // Last 10 messages
      .reverse() // Oldest first
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
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        message,
        latitude: latitude || -1.2864,
        longitude: longitude || 36.8172,
        language: language || 'en',
        location: locationContext, // Human-readable location for AI context
        history: formattedHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 [API] Chat response:', {
      hasFollowUp: !!data.followUpQuestions?.length,
      followUpCount: data.followUpQuestions?.length || 0,
    });
    
    return {
      success: true,
      response: data.response || data.text || 'No response received',
      followUpQuestions: data.followUpQuestions || [], // ← THIS WAS MISSING!
      region: data.region,
      language: data.language,
    };
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

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
      error: error.message || 'Failed to fetch MCP servers',
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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

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
      error: error.message || 'Failed to fetch MCP server status',
      servers: [],
      grouped: { active: [], degraded: [], inactive: [], comingSoon: [] },
      counts: { total: 0, active: 0, degraded: 0, inactive: 0, comingSoon: 0 },
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
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Detect regions API error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default { 
  sendChatMessage, 
  getActiveMcpServers,
  getAllMcpServersWithStatus,
  getMcpServersLiveStatus,
  detectRegions,
};

