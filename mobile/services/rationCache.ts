/**
 * Offline cache for RationSmart diet results.
 *
 * Stores the last diet result per cow in AsyncStorage.
 * Used by RationFlowRenderer to show cached data when offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'ration_diet_cache:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedDiet {
  feeds: Array<{ name: string; quantity_kg: number; cost: number }>;
  totalCost: number;
  currency: string;
  cachedAt: number;
}

function cacheKey(userId: string, cowId: string): string {
  return `${CACHE_PREFIX}${userId}:${cowId}`;
}

/**
 * Cache a diet result for a cow.
 * Called when a new diet is generated successfully.
 */
export async function cacheDietResult(
  userId: string,
  cowId: string,
  diet: { feeds: Array<{ name: string; quantity_kg: number; cost: number }>; totalCost: number; currency: string },
): Promise<void> {
  try {
    const entry: CachedDiet = { ...diet, cachedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(userId, cowId), JSON.stringify(entry));
  } catch {
    // Non-fatal — cache miss is acceptable
  }
}

/**
 * Retrieve a cached diet for a cow.
 * Returns null if no cache exists or cache is expired.
 */
export async function getCachedDiet(
  userId: string,
  cowId: string,
): Promise<(CachedDiet & { isCached: true }) | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId, cowId));
    if (!raw) return null;
    const entry: CachedDiet = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(cacheKey(userId, cowId));
      return null;
    }
    return { ...entry, isCached: true };
  } catch {
    return null;
  }
}

/**
 * Clear all cached diets for a user.
 * Note: getAllKeys() is an O(N) scan of all AsyncStorage keys. For apps with
 * many keys, consider maintaining a separate index of cached cow IDs per user.
 */
export async function clearDietCache(userId: string): Promise<void> {
  try {
    const prefix = `${CACHE_PREFIX}${userId}:`;
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(prefix));
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // Non-fatal
  }
}
