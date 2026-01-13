// Text-to-Speech service - calls API Gateway → AI Services TTS → Cloudinary
import { fetchWithTimeout } from '../utils/apiHelpers';
import { getDeviceId } from '../utils/deviceInfo';
import { API_BASE_URL, API_KEY } from '../utils/config';
import { log } from '../utils/logger';

const API_URL = `${API_BASE_URL}/api/tts`;
const TTS_TIMEOUT_MS = 65000; // 65s for TTS generation (AI Services uses 60s timeout)

// User-friendly error messages (never show raw backend errors)
const USER_FRIENDLY_ERRORS: Record<string, string> = {
  timeout: 'Speech is taking too long. Please try again.',
  network: 'Cannot connect to speech service. Check your internet.',
  server: 'Speech service is busy. Please try again.',
  default: 'Could not generate speech. Please try again.',
};

export interface TTSLocation {
  country?: string;
  state?: string;
  city?: string;
}

export interface TTSResult {
  success: boolean;
  audioUrl?: string;
  publicId?: string;
  duration?: number;
  audioBase64?: string;
  error?: string;
}

/**
 * Convert text to speech audio using Gemini TTS
 * @param text - Text to convert to speech
 * @param language - Language code (e.g., 'en', 'hi', 'sw')
 * @param location - User's location for accent localization
 * @returns Promise with audio URL or error
 */
export const textToSpeech = async (
  text: string,
  language: string = 'en',
  location: TTSLocation | null = null
): Promise<TTSResult> => {
  try {
    const deviceId = await getDeviceId();
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        text,
        language,
        location,
        deviceId,
      }),
    }, TTS_TIMEOUT_MS);

    if (!response.ok) {
      // Log technical details but return user-friendly message
      log(`TTS API error: ${response.status}`);
      const errorType = response.status >= 500 ? 'server' : 'default';
      return {
        success: false,
        error: USER_FRIENDLY_ERRORS[errorType],
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        audioUrl: data.audioUrl, // Cloudinary URL
        publicId: data.publicId,
        duration: data.duration,
        // Fallback to base64 if URL not available
        audioBase64: data.audioBase64,
      };
    } else {
      // Log raw error but return user-friendly message
      log('TTS service returned error:', data.error || data.message);
      return {
        success: false,
        error: USER_FRIENDLY_ERRORS.default,
      };
    }
  } catch (error) {
    // Log technical details but return user-friendly message
    const err = error as Error;
    log('TTS exception:', err.message);

    // Detect error type for appropriate message
    const msg = err.message?.toLowerCase() || '';
    let errorType = 'default';
    if (msg.includes('timeout') || msg.includes('aborted')) {
      errorType = 'timeout';
    } else if (msg.includes('network') || msg.includes('fetch')) {
      errorType = 'network';
    }

    return {
      success: false,
      error: USER_FRIENDLY_ERRORS[errorType],
    };
  }
};

export default { textToSpeech };
