/**
 * useStarterQuestions hook
 * Fetches starter questions with AsyncStorage caching and stale-while-revalidate.
 * Returns cached questions immediately, refreshes in the background.
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchStarterQuestions, StarterQuestion } from '../services/api/starterQuestions';
import { log } from '../utils/logger';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedData {
  questions: StarterQuestion[];
  timestamp: number;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getCacheKey(lang: string, country: string): string {
  return `starter-q:${lang}:${country}:${getTimeOfDay()}`;
}

interface UseStarterQuestionsParams {
  latitude?: number | null;
  longitude?: number | null;
  language?: string;
  country?: string;
}

interface UseStarterQuestionsReturn {
  questions: StarterQuestion[];
  isLoading: boolean;
}

const CLIENT_FALLBACKS: StarterQuestion[] = [
  { emoji: '🌾', text: 'What crops grow best in my area?' },
  { emoji: '🌤️', text: "What's the weather forecast for my farm?" },
  { emoji: '🐄', text: 'How can I improve my livestock health?' },
];

export default function useStarterQuestions(
  params: UseStarterQuestionsParams
): UseStarterQuestionsReturn {
  const [questions, setQuestions] = useState<StarterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const lang = params.language || 'en';
    const country = params.country || 'unknown';
    const cacheKey = getCacheKey(lang, country);

    async function load() {
      // 1. Try cache first
      let servedFromCache = false;
      try {
        const stored = await AsyncStorage.getItem(cacheKey);
        if (stored) {
          const cached: CachedData = JSON.parse(stored);
          if (cached.questions?.length > 0) {
            setQuestions(cached.questions.slice(0, 3));
            setIsLoading(false);
            servedFromCache = true;

            // If cache is still fresh, skip network fetch
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
              log('[StarterQ] Cache hit (fresh)', { cacheKey });
              return;
            }
            log('[StarterQ] Cache hit (stale), revalidating', { cacheKey });
          }
        }
      } catch {
        // Cache read failed, continue to network
      }

      // 2. Fetch from network (foreground if no cache, background if stale cache)
      try {
        const result = await fetchStarterQuestions({
          latitude: params.latitude,
          longitude: params.longitude,
          language: lang,
          country: params.country,
        });

        if (result.length > 0) {
          const sliced = result.slice(0, 3);
          setQuestions(sliced);

          // Write to cache
          const cacheData: CachedData = { questions: sliced, timestamp: Date.now() };
          AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData)).catch(() => {});
          log('[StarterQ] Fetched and cached', { count: sliced.length, cacheKey });
        } else if (!servedFromCache) {
          // Network returned empty and no cache — use fallbacks
          setQuestions(CLIENT_FALLBACKS);
          log('[StarterQ] No results, using fallbacks');
        }
      } catch (error) {
        if (!servedFromCache) {
          setQuestions(CLIENT_FALLBACKS);
          log('[StarterQ] Fetch failed, using fallbacks', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [params.latitude, params.longitude, params.language, params.country]);

  return { questions, isLoading };
}
