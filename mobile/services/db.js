// Database sync service
// Communicates with the API Gateway for persistent storage

import { getDeviceId, getDeviceInfo } from '../utils/deviceInfo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/chat', '')
  || 'https://ag-mcp-api-gateway.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Register device with the backend
 * @returns {Promise<object>} User object with userId
 */
export async function registerUser() {
  try {
    const deviceInfo = await getDeviceInfo();
    
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deviceInfo),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔌 [DB] Sync error response:', errorText);
      throw new Error(`HTTP ${response.status}: Sync failed`);
    }
    
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error || 'Sync failed');
    
    return { success: true, userId: data.id || data.userId, ...data };
  } catch (error) {
    console.error('❌ [DB] User sync error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/users/me?deviceId=${deviceId}`, { headers });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(preferences) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/users/preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ deviceId, ...preferences }),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update preferences error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save user location
 */
export async function saveLocation(locationData) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/users/location`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...locationData }),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Save location error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * List chat sessions
 */
export async function listSessions(options = {}) {
  try {
    const deviceId = await getDeviceId();
    const params = new URLSearchParams({ deviceId, ...options });
    const response = await fetch(`${API_BASE_URL}/api/sessions?${params}`, { headers });
    
    if (!response.ok) {
      return { success: false, sessions: [], error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('List sessions error:', error);
    return { success: false, sessions: [], error: error.message };
  }
}

/**
 * Create a new chat session
 */
export async function createSession(options = {}) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...options }),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create session error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get session with messages
 */
export async function getSession(sessionId, messageLimit = 50) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(
      `${API_BASE_URL}/api/sessions/${sessionId}?deviceId=${deviceId}&messageLimit=${messageLimit}`,
      { headers }
    );
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get session error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update session (title, status, etc.)
 */
export async function updateSession(sessionId, updates) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ deviceId, ...updates }),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update session error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Archive/delete a session
 */
export async function deleteSession(sessionId) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(
      `${API_BASE_URL}/api/sessions/${sessionId}?deviceId=${deviceId}`,
      { method: 'DELETE', headers }
    );
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Delete session error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// MESSAGE MANAGEMENT
// ============================================

/**
 * Save a message to the database
 */
export async function saveMessage(messageData) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...messageData }),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Save message error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get messages for a session
 */
export async function getMessages(sessionId, options = {}) {
  try {
    const deviceId = await getDeviceId();
    const params = new URLSearchParams({ deviceId, ...options });
    const response = await fetch(`${API_BASE_URL}/api/messages/${sessionId}?${params}`, { headers });
    
    if (!response.ok) {
      return { success: false, messages: [], error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get messages error:', error);
    return { success: false, messages: [], error: error.message };
  }
}

/**
 * Update message (feedback, TTS played, etc.)
 */
export async function updateMessage(messageId, updates) {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ deviceId, ...updates }),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update message error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LOCATION LOOKUP
// ============================================

/**
 * Lookup location from GPS or IP via n8n workflow
 */
export async function lookupLocation(latitude, longitude, ipAddress = null) {
  try {
    console.log('🔌 [DB] Looking up location:', { latitude, longitude, ipAddress });
    
    const response = await fetch(`${API_BASE_URL}/api/location-lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ latitude, longitude, ipAddress }),
    });
    
    console.log('🔌 [DB] Location lookup response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔌 [DB] Location lookup error:', errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    console.log('🔌 [DB] Location lookup result:', {
      success: data.success,
      source: data.source,
      country: data.level1Country,
    });
    
    return data;
  } catch (error) {
    console.error('❌ [DB] Location lookup error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// TITLE GENERATION
// ============================================

/**
 * Generate session title via n8n workflow
 */
export async function generateTitle(messages, language = 'en') {
  try {
    console.log('🔌 [DB] Generating title with', messages.length, 'messages, language:', language);
    
    const response = await fetch(`${API_BASE_URL}/api/generate-title`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, language }),
    });
    
    console.log('🔌 [DB] Title generation response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔌 [DB] Title generation error response:', errorText);
      return { success: false, title: 'New Conversation', error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    console.log('🔌 [DB] Title generation result:', data);
    return data;
  } catch (error) {
    console.log('❌ [DB] Title generation exception:', error.message);
    return { success: false, title: 'New Conversation', error: error.message };
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Log an analytics event
 */
export async function logEvent(eventName, eventData = {}, sessionId = null) {
  try {
    const deviceId = await getDeviceId();
    await fetch(`${API_BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, sessionId, eventName, eventData }),
    });
  } catch (error) {
    // Silent fail for analytics
    console.debug('Analytics error:', error);
  }
}

