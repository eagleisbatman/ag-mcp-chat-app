// Database sync service
// Communicates with the API Gateway for persistent storage

import { getDeviceId, getDeviceInfo } from '../utils/deviceInfo';
import { fetchWithTimeout } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { log, error as logError } from '../utils/logger';
import { t } from '../constants/strings';

const DB_TIMEOUT_MS = TIMEOUTS.DB;

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// Type definitions
export interface User {
  id?: string;
  userId?: string;
  deviceId?: string;
  language?: string;
  location?: LocationData;
}

export interface LocationData {
  latitude?: number;
  longitude?: number;
  displayName?: string;
  level1Country?: string;
  level2State?: string;
  level3District?: string;
  level5City?: string;
  level6Locality?: string;
}

export interface Session {
  id: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface Message {
  id?: string;
  _id?: string;
  text: string;
  isBot: boolean;
  createdAt?: string | Date;
  image?: string;
  diagnosisData?: Record<string, unknown>;
  ttsAudioUrl?: string;
}

export interface ApiResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface UserResult extends ApiResult {
  userId?: string;
  user?: User;
}

export interface SessionResult extends ApiResult {
  session?: Session;
  sessions?: Session[];
  messages?: Message[];
}

export interface MessageResult extends ApiResult {
  message?: Message;
  messages?: Message[];
}

export interface LocationLookupResult extends ApiResult {
  source?: string;
  displayName?: string;
  level1Country?: string;
  level2State?: string;
  level3District?: string;
  level5City?: string;
  level6Locality?: string;
}

export interface TitleResult extends ApiResult {
  title?: string;
}

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Register device with the backend
 */
export async function registerUser(): Promise<UserResult> {
  try {
    const deviceInfo = await getDeviceInfo();
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deviceInfo),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      const errorText = await response.text();
      log('🔌 [DB] Sync error response:', errorText);
      throw new Error(`HTTP ${response.status}: Sync failed`);
    }
    
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error || 'Sync failed');
    
    return { success: true, userId: data.id || data.userId, ...data };
  } catch (error) {
    const err = error as Error;
    logError('❌ [DB] User sync error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/me?deviceId=${deviceId}`, { headers }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    logError('Get user error:', error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(preferences: Record<string, unknown>): Promise<ApiResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ deviceId, ...preferences }),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Update preferences error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Save user location
 */
export async function saveLocation(locationData: LocationData): Promise<ApiResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/location`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...locationData }),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Save location error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * List chat sessions
 */
export async function listSessions(options: Record<string, unknown> = {}): Promise<SessionResult> {
  try {
    const deviceId = await getDeviceId();
    const params = new URLSearchParams({ deviceId, ...options } as Record<string, string>);
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/sessions?${params}`, { headers }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, sessions: [], error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('List sessions error:', err);
    return { success: false, sessions: [], error: err.message };
  }
}

/**
 * Create a new chat session
 */
export async function createSession(options: Record<string, unknown> = {}): Promise<SessionResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...options }),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Create session error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get session with messages
 */
export async function getSession(sessionId: string, messageLimit: number = 50): Promise<SessionResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/sessions/${sessionId}?deviceId=${deviceId}&messageLimit=${messageLimit}`,
      { headers },
      DB_TIMEOUT_MS
    );
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Get session error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update session (title, status, etc.)
 */
export async function updateSession(sessionId: string, updates: Record<string, unknown>): Promise<SessionResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ deviceId, ...updates }),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Update session error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Archive/delete a session
 */
export async function deleteSession(sessionId: string): Promise<ApiResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/sessions/${sessionId}?deviceId=${deviceId}`,
      { method: 'DELETE', headers },
      DB_TIMEOUT_MS
    );
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Delete session error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// MESSAGE MANAGEMENT
// ============================================

/**
 * Save a message to the database
 */
export async function saveMessage(messageData: Record<string, unknown>): Promise<MessageResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...messageData }),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Save message error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get messages for a session
 */
export async function getMessages(sessionId: string, options: Record<string, unknown> = {}): Promise<MessageResult> {
  try {
    const deviceId = await getDeviceId();
    const params = new URLSearchParams({ deviceId, ...options } as Record<string, string>);
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/messages/${sessionId}?${params}`, { headers }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, messages: [], error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Get messages error:', err);
    return { success: false, messages: [], error: err.message };
  }
}

/**
 * Update message (feedback, TTS played, etc.)
 */
export async function updateMessage(messageId: string, updates: Record<string, unknown>): Promise<MessageResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/messages/${messageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ deviceId, ...updates }),
    }, DB_TIMEOUT_MS);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logError('Update message error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// LOCATION LOOKUP
// ============================================

/**
 * Lookup location from GPS or IP via API Gateway (Nominatim/IP-API)
 */
export async function lookupLocation(
  latitude: number | null,
  longitude: number | null,
  ipAddress: string | null = null
): Promise<LocationLookupResult> {
  try {
    log('🔌 [DB] Looking up location:', { latitude, longitude, ipAddress });
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/location-lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ latitude, longitude, ipAddress }),
    }, DB_TIMEOUT_MS);
    
    log('🔌 [DB] Location lookup response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      log('🔌 [DB] Location lookup error:', errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    log('🔌 [DB] Location lookup result:', {
      success: data.success,
      source: data.source,
      country: data.level1Country,
    });
    
    return data;
  } catch (error) {
    const err = error as Error;
    logError('❌ [DB] Location lookup error:', err.message);
    return { success: false, error: err.message };
  }
}

// ============================================
// TITLE GENERATION
// ============================================

/**
 * Generate session title via AI Services
 */
export async function generateTitle(messages: Message[], language: string = 'en'): Promise<TitleResult> {
  try {
    log('🔌 [DB] Generating title with', messages.length, 'messages, language:', language);
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/generate-title`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, language }),
    }, DB_TIMEOUT_MS);
    
    log('🔌 [DB] Title generation response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      log('🔌 [DB] Title generation error response:', errorText);
      return { success: false, title: t('history.newConversation'), error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    log('🔌 [DB] Title generation result:', data);
    return data;
  } catch (error) {
    const err = error as Error;
    log('❌ [DB] Title generation exception:', err.message);
    return { success: false, title: t('history.newConversation'), error: err.message };
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Log an analytics event
 */
export async function logEvent(
  eventName: string,
  eventData: Record<string, unknown> = {},
  sessionId: string | null = null
): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await fetchWithTimeout(`${API_BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, sessionId, eventName, eventData }),
    }, DB_TIMEOUT_MS);
  } catch (error) {
    // Silent fail for analytics
    log('Analytics error:', error);
  }
}
