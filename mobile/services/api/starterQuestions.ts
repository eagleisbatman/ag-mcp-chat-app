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

// Default fallback questions (used when API fails)
const FALLBACK_QUESTIONS: StarterQuestion[] = [
  { emoji: '🌾', text: 'What crops grow best in my region?' },
  { emoji: '🌧️', text: 'Is today good for spraying pesticides?' },
  { emoji: '🐛', text: 'How do I identify common crop pests?' },
  { emoji: '💧', text: 'When should I irrigate my crops?' },
];

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

    log('📋 [StarterQuestions] Fetching personalized questions', {
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

    if (!response.ok) {
      log('⚠️ [StarterQuestions] API error, using fallback', { status: response.status });
      return FALLBACK_QUESTIONS;
    }

    const data: StarterQuestionsResponse = await response.json();

    if (data.success && data.questions?.length > 0) {
      log('✅ [StarterQuestions] Got personalized questions', {
        count: data.questions.length,
        isNewUser: data.meta?.isNewUser,
        fallback: data.meta?.fallback,
      });
      return data.questions;
    }

    return FALLBACK_QUESTIONS;
  } catch (error) {
    log('⚠️ [StarterQuestions] Fetch failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return FALLBACK_QUESTIONS;
  }
}

/**
 * Get fallback questions (for immediate display before API responds)
 */
export function getFallbackQuestions(): StarterQuestion[] {
  return FALLBACK_QUESTIONS;
}
