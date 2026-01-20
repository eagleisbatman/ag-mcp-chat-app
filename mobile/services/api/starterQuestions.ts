/**
 * Starter Questions API Service
 * Fetches personalized starter questions from the API Gateway
 */

import { log } from '../../utils/logger';
import { API_BASE_URL, API_KEY, ensureDeviceId, getLocalDateTime } from './core';

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
  weatherSummary?: {
    temperature?: number;
    conditions?: string;
    hasRain?: boolean;
  };
}


/**
 * Fetch personalized starter questions from the API
 */
export async function fetchStarterQuestions(
  params: FetchStarterQuestionsParams
): Promise<StarterQuestion[]> {
  try {
    const deviceId = await ensureDeviceId();
    const dateTime = getLocalDateTime();

    const requestBody = {
      deviceId,
      latitude: params.latitude ?? undefined,
      longitude: params.longitude ?? undefined,
      language: params.language || 'en',
      weatherSummary: params.weatherSummary,
      hour: dateTime.hour,
      month: dateTime.month,
    };

    log('📋 [StarterQuestions] Fetching from API', {
      url: `${API_BASE_URL}/api/starter-questions`,
      deviceId: deviceId.substring(0, 8),
      hasLocation: !!(params.latitude && params.longitude),
      hasWeather: !!params.weatherSummary,
    });

    const response = await fetch(`${API_BASE_URL}/api/starter-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

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
