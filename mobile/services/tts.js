// Text-to-Speech service - calls API Gateway → AI Services TTS → Cloudinary
import { fetchWithTimeout } from '../utils/apiHelpers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_URL = `${API_BASE_URL}/api/tts`;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';
const TTS_TIMEOUT_MS = 65000; // 65s for TTS generation (AI Services uses 60s timeout)

// User-friendly error messages (never show raw backend errors)
const USER_FRIENDLY_ERRORS = {
  timeout: 'Speech is taking too long. Please try again.',
  network: 'Cannot connect to speech service. Check your internet.',
  server: 'Speech service is busy. Please try again.',
  default: 'Could not generate speech. Please try again.',
};

/**
 * Convert text to speech audio using Gemini TTS
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (e.g., 'en', 'hi', 'sw')
 * @returns {Promise<{success: boolean, audioUrl?: string, error?: string}>}
 */
export const textToSpeech = async (text, language = 'en') => {
  try {
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        text,
        language,
      }),
    }, TTS_TIMEOUT_MS);

    if (!response.ok) {
      // Log technical details but return user-friendly message
      console.log(`TTS API error: ${response.status}`);
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
      console.log('TTS service returned error:', data.error || data.message);
      return {
        success: false,
        error: USER_FRIENDLY_ERRORS.default,
      };
    }
  } catch (error) {
    // Log technical details but return user-friendly message
    console.log('TTS exception:', error.message);

    // Detect error type for appropriate message
    const msg = error.message?.toLowerCase() || '';
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
