// Database sync service
// Communicates with the API Gateway for persistent storage

import { getDeviceId, getDeviceInfo } from '../utils/deviceInfo';
import { fetchWithTimeout } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { log, error as logError } from '../utils/logger';
import { t } from '../constants/strings';
import {
  User,
  LocationData,
  Session,
  Message,
  ApiResult,
  UserResult,
  SessionResult,
  MessageResult,
  LocationLookupResult,
  TitleResult,
  UserProfile,
  Farm,
  Plot,
  Animal,
  AnimalEvent,
  AnimalEventType,
  MasterCrop,
  MasterLivestock,
  CropAllocation,
  FarmerEwMapping,
} from '../types';

const DB_TIMEOUT_MS = TIMEOUTS.DB;

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// ============================================
// Response Mappers — flatten nested relations
// ============================================

/** Flatten API crop allocation: { crop: { name } } → { cropName } */
function mapCropAllocation(raw: Record<string, unknown>): CropAllocation {
  const crop = raw.crop as { name?: string } | undefined;
  return { ...raw, cropName: crop?.name || raw.cropName } as unknown as CropAllocation;
}

/** Flatten API animal: { livestock: { name } } → { livestockName } */
function mapAnimal(raw: Record<string, unknown>): Animal {
  const livestock = raw.livestock as { name?: string } | undefined;
  return { ...raw, livestockName: livestock?.name || raw.livestockName } as unknown as Animal;
}

/** Flatten all nested relations in a farm response */
function mapFarm(raw: Record<string, unknown>): Farm {
  const plots = (raw.plots as Record<string, unknown>[] | undefined) || [];
  return {
    ...raw,
    plots: plots.map((p) => ({
      ...p,
      cropAllocations: ((p.cropAllocations as Record<string, unknown>[]) || []).map(mapCropAllocation),
    })),
  } as unknown as Farm;
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
export async function generateTitle(messages: Array<{ role: string; content: string }>, language: string = 'en'): Promise<TitleResult> {
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

// ============================================
// PROFILE MANAGEMENT
// ============================================

export async function getProfile(): Promise<ApiResult<UserProfile>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/profile/${deviceId}/profile`,
      { headers },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get profile error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateProfile(
  fields: Partial<Pick<UserProfile, 'name' | 'phone' | 'gender' | 'profilePictureUrl' | 'role' | 'farmingTypes'>>
): Promise<ApiResult<UserProfile>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/profile/${deviceId}/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fields),
    }, DB_TIMEOUT_MS);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Update profile error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// FARM MANAGEMENT
// ============================================

export async function getFarms(): Promise<ApiResult<Farm[]>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farms?deviceId=${deviceId}`,
      { headers },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    const farms = ((data.data || []) as Record<string, unknown>[]).map(mapFarm);
    return { success: true, data: farms };
  } catch (error) {
    const err = error as Error;
    logError('Get farms error:', err);
    return { success: false, error: err.message };
  }
}

export async function createFarm(
  farm: { name: string; latitude?: number; longitude?: number; totalAreaHectares?: number; dataSource?: string }
): Promise<ApiResult<Farm>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...farm }),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Create farm error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateFarm(
  farmId: string,
  fields: Partial<Pick<Farm, 'name' | 'latitude' | 'longitude' | 'totalAreaHectares'>>
): Promise<ApiResult<Farm>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/${farmId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fields),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Update farm error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteFarm(farmId: string): Promise<ApiResult> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/${farmId}`, {
      method: 'DELETE',
      headers,
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logError('Delete farm error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// PLOT MANAGEMENT
// ============================================

export async function createPlot(
  farmId: string,
  plot: { name: string; areaHectares?: number; soilType?: string; irrigationType?: string }
): Promise<ApiResult<Plot>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/${farmId}/plots`, {
      method: 'POST',
      headers,
      body: JSON.stringify(plot),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Create plot error:', err);
    return { success: false, error: err.message };
  }
}

export async function updatePlot(
  plotId: string,
  fields: Partial<Pick<Plot, 'name' | 'areaHectares' | 'soilType' | 'irrigationType'>>
): Promise<ApiResult<Plot>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/plots/${plotId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fields),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Update plot error:', err);
    return { success: false, error: err.message };
  }
}

export async function deletePlot(plotId: string): Promise<ApiResult> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/plots/${plotId}`, {
      method: 'DELETE',
      headers,
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logError('Delete plot error:', err);
    return { success: false, error: err.message };
  }
}

export async function allocateCrop(
  plotId: string,
  allocation: { cropId: string; percentageArea?: number; season?: string; plantingDate?: string; status?: string }
): Promise<ApiResult<CropAllocation>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/plots/${plotId}/crops`, {
      method: 'POST',
      headers,
      body: JSON.stringify(allocation),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: mapCropAllocation(data.data) };
  } catch (error) {
    const err = error as Error;
    logError('Allocate crop error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateCropAllocation(
  allocationId: string,
  fields: { status?: string; percentageArea?: number; season?: string }
): Promise<ApiResult<CropAllocation>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/crop-allocations/${allocationId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fields),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: mapCropAllocation(data.data) };
  } catch (error) {
    const err = error as Error;
    logError('Update crop allocation error:', err);
    return { success: false, error: err.message };
  }
}

export async function removeCropAllocation(allocationId: string): Promise<ApiResult> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/farms/crop-allocations/${allocationId}`, {
      method: 'DELETE',
      headers,
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logError('Remove crop allocation error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// LIVESTOCK / ANIMAL MANAGEMENT
// ============================================

export async function getAnimals(status?: string): Promise<ApiResult<Animal[]>> {
  try {
    const deviceId = await getDeviceId();
    let url = `${API_BASE_URL}/api/livestock?deviceId=${deviceId}`;
    if (status) url += `&status=${status}`;
    const response = await fetchWithTimeout(url, { headers }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    const animals = ((data.data || []) as Record<string, unknown>[]).map(mapAnimal);
    return { success: true, data: animals };
  } catch (error) {
    const err = error as Error;
    logError('Get animals error:', err);
    return { success: false, error: err.message };
  }
}

export async function createAnimal(
  animal: {
    livestockId: string; name?: string; tagId?: string; trackingMode?: string;
    herdSize?: number; breed?: string; gender?: string; dateOfBirth?: string;
    weightKg?: number; lactationStatus?: string;
  }
): Promise<ApiResult<Animal>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/livestock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId, ...animal }),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Create animal error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateAnimal(
  animalId: string,
  fields: Partial<Pick<Animal, 'name' | 'tagId' | 'trackingMode' | 'herdSize' | 'breed' | 'gender' | 'weightKg' | 'lactationStatus' | 'status'>>
): Promise<ApiResult<Animal>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/livestock/${animalId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fields),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Update animal error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteAnimal(animalId: string): Promise<ApiResult> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/livestock/${animalId}`, {
      method: 'DELETE',
      headers,
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logError('Delete animal error:', err);
    return { success: false, error: err.message };
  }
}

export async function recordAnimalEvent(
  animalId: string,
  event: { eventType: AnimalEventType; eventDate?: string; eventData?: Record<string, unknown>; notes?: string }
): Promise<ApiResult<AnimalEvent>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/livestock/${animalId}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Record event error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// MASTER DATA (Reference data)
// ============================================

export async function getMasterCrops(
  params?: { lang?: string; category?: string; search?: string }
): Promise<ApiResult<MasterCrop[]>> {
  try {
    const query = new URLSearchParams();
    if (params?.lang) query.set('lang', params.lang);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);

    const url = `${API_BASE_URL}/api/master/crops${query.toString() ? '?' + query.toString() : ''}`;
    const response = await fetchWithTimeout(url, { headers }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get master crops error:', err);
    return { success: false, error: err.message };
  }
}

export async function getMasterLivestock(
  params?: { lang?: string; category?: string }
): Promise<ApiResult<MasterLivestock[]>> {
  try {
    const query = new URLSearchParams();
    if (params?.lang) query.set('lang', params.lang);
    if (params?.category) query.set('category', params.category);

    const url = `${API_BASE_URL}/api/master/livestock${query.toString() ? '?' + query.toString() : ''}`;
    const response = await fetchWithTimeout(url, { headers }, DB_TIMEOUT_MS);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get master livestock error:', err);
    return { success: false, error: err.message };
  }
}

export async function getMasterBreeds(
  livestockType: string,
  lang?: string
): Promise<ApiResult<{ name: string; purpose?: string }[]>> {
  try {
    const query = new URLSearchParams({ type: livestockType });
    if (lang) query.set('lang', lang);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/master/breeds?${query.toString()}`,
      { headers },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get master breeds error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// FARMER-EW MAPPING
// ============================================

export async function getMyFarmers(): Promise<ApiResult<FarmerEwMapping[]>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farmer-ew/my-farmers/${deviceId}`,
      { headers },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get my farmers error:', err);
    return { success: false, error: err.message };
  }
}

export async function getMyEws(): Promise<ApiResult<FarmerEwMapping[]>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farmer-ew/my-ews/${deviceId}`,
      { headers },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get my EWs error:', err);
    return { success: false, error: err.message };
  }
}

export async function getPendingMappings(): Promise<ApiResult<FarmerEwMapping[]>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farmer-ew/pending/${deviceId}`,
      { headers },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Get pending mappings error:', err);
    return { success: false, error: err.message };
  }
}

export async function connectFarmer(
  farmerPhone: string,
  organizationId?: string
): Promise<ApiResult<FarmerEwMapping>> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farmer-ew/map`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ewDeviceId: deviceId,
          farmerPhone,
          organizationId,
        }),
      },
      DB_TIMEOUT_MS
    );
    if (!response.ok) {
      try {
        const data = await response.json();
        return { success: false, error: data.error || `HTTP ${response.status}` };
      } catch {
        return { success: false, error: `HTTP ${response.status}` };
      }
    }
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    const err = error as Error;
    logError('Connect farmer error:', err);
    return { success: false, error: err.message };
  }
}

export async function respondToMapping(
  mappingId: string,
  status: 'approved' | 'rejected'
): Promise<ApiResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farmer-ew/${mappingId}/respond`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, deviceId }),
      },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logError('Respond to mapping error:', err);
    return { success: false, error: err.message };
  }
}

export async function createConnectedSession(
  farmerDeviceId: string,
  sessionId: string,
  reason?: string
): Promise<ApiResult> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/farmer-ew/connected-session`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          ewDeviceId: deviceId,
          farmerDeviceId,
          reason,
        }),
      },
      DB_TIMEOUT_MS
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logError('Create connected session error:', err);
    return { success: false, error: err.message };
  }
}
