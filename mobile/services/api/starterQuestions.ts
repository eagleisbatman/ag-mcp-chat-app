/**
 * Starter Questions API Service
 * Fetches personalized starter questions from the API Gateway
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../utils/logger';
import { fetchWithTimeout } from '../../utils/apiHelpers';
import { API_BASE_URL, API_KEY, ensureDeviceId, getLocalDateTime } from './core';

const SERVICE_PREFS_KEY = '@service_preferences';

export interface StarterQuestion {
  emoji: string;
  text: string;
}

interface StarterQuestionsResponse {
  success: boolean;
  questions: StarterQuestion[];
  meta?: {
    isNewUser: boolean;
    interactionCount: number;
    generatedAt: string;
    fallback?: boolean;
  };
}

interface FetchStarterQuestionsParams {
  latitude?: number | null;
  longitude?: number | null;
  language?: string;
  country?: string;
}


/**
 * Fetch personalized starter questions from the API
 */
export async function fetchStarterQuestions(
  params: FetchStarterQuestionsParams
): Promise<StarterQuestion[]> {
  try {
    const deviceId = await ensureDeviceId();
    const localDateTime = getLocalDateTime();

    // Get weather provider from user preferences (tomorrow-io as fallback - works globally)
    let weatherProvider = 'tomorrow-io';
    try {
      const stored = await AsyncStorage.getItem(SERVICE_PREFS_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        weatherProvider = prefs.weather || 'google-weather';
      }
    } catch (e) {
      log('📋 [StarterQuestions] Failed to load service prefs:', e);
    }

    const requestBody = {
      deviceId,
      latitude: params.latitude ?? undefined,
      longitude: params.longitude ?? undefined,
      language: params.language || 'en',
      country: params.country,
      weatherProvider,
      localDateTime: {
        hour: localDateTime.hour,
        month: localDateTime.month,
        day: localDateTime.day,
        timezone: localDateTime.timezone,
      },
    };

    log('📋 [StarterQuestions] Fetching from API', {
      url: `${API_BASE_URL}/api/starter-questions`,
      deviceId: deviceId.substring(0, 8),
      hasLocation: !!(params.latitude && params.longitude),
      weatherProvider,
      hour: localDateTime.hour,
    });

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/starter-questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(requestBody),
      },
      15000 // 15s timeout (allow for cold starts)
    );

    log('📋 [StarterQuestions] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      log('⚠️ [StarterQuestions] API error', {
        status: response.status,
        error: errorText.substring(0, 200),
      });
      return [];
    }

    const data: StarterQuestionsResponse = await response.json();
    log('📋 [StarterQuestions] API response:', JSON.stringify(data).substring(0, 300));

    if (data.success && data.questions?.length > 0) {
      log('✅ [StarterQuestions] Got personalized questions', {
        count: data.questions.length,
        firstQuestion: data.questions[0]?.text,
        isNewUser: data.meta?.isNewUser,
      });
      return data.questions;
    }

    log('⚠️ [StarterQuestions] No questions in response');
    return [];
  } catch (error) {
    log('❌ [StarterQuestions] Fetch FAILED', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined,
    });
    return [];
  }
}
