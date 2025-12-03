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
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Registration failed');
    
    return data;
  } catch (error) {
    console.error('User registration error:', error);
    throw error;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${API_BASE_URL}/api/users/me?deviceId=${deviceId}`, { headers });
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
    return await response.json();
  } catch (error) {
    console.error('Update preferences error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('Save location error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('List sessions error:', error);
    return { success: false, sessions: [] };
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
    return await response.json();
  } catch (error) {
    console.error('Create session error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('Update session error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('Delete session error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('Save message error:', error);
    throw error;
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
    return await response.json();
  } catch (error) {
    console.error('Get messages error:', error);
    return { success: false, messages: [] };
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
    return await response.json();
  } catch (error) {
    console.error('Update message error:', error);
    throw error;
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
    const response = await fetch(`${API_BASE_URL}/api/location-lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ latitude, longitude, ipAddress }),
    });
    return await response.json();
  } catch (error) {
    console.error('Location lookup error:', error);
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
    const response = await fetch(`${API_BASE_URL}/api/generate-title`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, language }),
    });
    return await response.json();
  } catch (error) {
    console.error('Title generation error:', error);
    return { success: false, title: 'New Conversation' };
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

