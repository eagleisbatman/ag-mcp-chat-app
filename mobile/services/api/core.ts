import { getDeviceId } from '../../utils/deviceInfo';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../../utils/config';
import { log } from '../../utils/logger';
import type { ClientDateTime, LocationContext, LocationDetails } from '../../types';

export const CHAT_API_URL = `${API_BASE_URL}/api/chat`;
export const CHAT_TIMEOUT_MS = TIMEOUTS.CHAT;
export const DEFAULT_TIMEOUT_MS = TIMEOUTS.DEFAULT;

/** Nairobi, Kenya — default fallback when user location is unavailable. */
export const FALLBACK_LATITUDE = -1.2864;
export const FALLBACK_LONGITUDE = 36.8172;

let cachedDeviceId: string | null = null;

/**
 * Get device's local date/time info for AI context
 * No permissions needed - uses device's timezone settings
 */
export function getLocalDateTime(): ClientDateTime {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();
  const offsetHours = -timezoneOffset / 60;
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const absOffsetHours = Math.abs(offsetHours);
  const hours = Math.floor(absOffsetHours);
  const minutes = Math.round((absOffsetHours - hours) * 60);
  const offsetStr = `${offsetSign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  let timezoneName = 'Unknown';
  try {
    timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Fallback if Intl not available
  }

  return {
    isoDateTime: now.toISOString(),
    localDateTime: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    timezone: timezoneName,
    utcOffset: offsetStr,
  };
}

/**
 * Get device ID (cached after first call)
 */
export async function ensureDeviceId(): Promise<string> {
  if (!cachedDeviceId) {
    cachedDeviceId = await getDeviceId();
    log('📱 [API] Device ID loaded:', cachedDeviceId.substring(0, 20) + '...');
  }
  return cachedDeviceId;
}

/**
 * Build location context from location details
 */
export function buildLocationContext(locationDetails: LocationDetails | undefined): LocationContext | null {
  return locationDetails ? {
    country: locationDetails.level1Country,
    state: locationDetails.level2State,
    district: locationDetails.level3District,
    city: locationDetails.level5City,
    locality: locationDetails.level6Locality,
    displayName: locationDetails.displayName,
  } : null;
}

export { API_BASE_URL, API_KEY };
