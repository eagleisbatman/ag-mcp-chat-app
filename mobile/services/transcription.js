// Transcription Service - Voice to text via Gemini 2.5 Flash (n8n workflow)
import { fetchWithTimeout } from '../utils/apiHelpers';

const WHISPER_URL = process.env.EXPO_PUBLIC_WHISPER_URL || 'https://ag-mcp-api-gateway.up.railway.app/api/transcribe';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';
const TRANSCRIPTION_TIMEOUT_MS = 30000; // 30s for transcription

/**
 * Transcribe audio to text using Gemini 2.5 Flash via n8n workflow
 * @param {string} audioBase64 - Base64 encoded audio file
 * @param {string} language - Optional language hint (ISO code, e.g., 'en', 'hi')
 * @returns {Promise<{success: boolean, text?: string, language?: string, error?: string}>}
 */
export const transcribeAudio = async (audioBase64, language = null) => {
  try {
    // Ensure proper data URL format
    let audioData = audioBase64;
    if (!audioBase64.startsWith('data:')) {
      audioData = `data:audio/m4a;base64,${audioBase64}`;
    }

    const response = await fetchWithTimeout(WHISPER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        audio: audioData,
        language: language,
      }),
    }, TRANSCRIPTION_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`Transcription error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if API returned success: false
    if (data.success === false) {
      return {
        success: false,
        error: data.error || 'Transcription failed',
      };
    }
    
    return {
      success: true,
      text: data.text || data.transcription || '',
      language: data.detected_language || language,
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to transcribe audio',
    };
  }
};

export default { transcribeAudio };

