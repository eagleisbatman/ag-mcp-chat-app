// Text-to-Speech service - calls API Gateway → n8n TTS → Cloudinary
import { fetchWithTimeout } from '../utils/apiHelpers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_URL = `${API_BASE_URL}/api/tts`;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';
const TTS_TIMEOUT_MS = 30000; // 30s for TTS generation

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
      console.log(`TTS API returned status: ${response.status}`);
      return {
        success: false,
        error: 'Speech service error - please try again',
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
      return {
        success: false,
        error: data.error || 'TTS generation failed',
      };
    }
  } catch (error) {
    // Use console.log instead of console.error to avoid system alerts
    console.log('TTS service exception:', error.message);
    return {
      success: false,
      error: 'Speech service temporarily unavailable',
    };
  }
};

export default { textToSpeech };
