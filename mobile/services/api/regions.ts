import { fetchWithTimeout, parseErrorMessage } from '../../utils/apiHelpers';
import type { RegionsResult } from '../../types';
import { API_BASE_URL, API_KEY, DEFAULT_TIMEOUT_MS } from './core';

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
