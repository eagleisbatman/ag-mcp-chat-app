// Transcription Service - Voice to text via Gemini 2.5 Flash (AI Services)
import { fetchWithTimeout } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { error as logError } from '../utils/logger';

const WHISPER_URL = `${API_BASE_URL}/api/transcribe`;
const TRANSCRIPTION_TIMEOUT_MS = TIMEOUTS.DEFAULT;

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  error?: string;
  errorCode?: string | null;
  errorDetails?: string | null;
  requestedLanguage?: string | null;
  detectedLanguage?: string | null;
}

/**
 * Transcribe audio to text using Gemini 2.5 Flash via AI Services
 * @param audioBase64 - Base64 encoded audio file
 * @param language - Optional language hint (ISO code, e.g., 'en', 'hi')
 * @returns Promise with transcription text or error
 */
export const transcribeAudio = async (
  audioBase64: string,
  language: string | null = null
): Promise<TranscriptionResult> => {
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

    // Check if API returned success: false with structured error
    if (data.success === false) {
      return {
        success: false,
        error: data.error || 'Transcription failed',
        errorCode: data.errorCode || null,
        errorDetails: data.errorDetails || null,
        requestedLanguage: data.requestedLanguage || language,
        detectedLanguage: data.detectedLanguage || null,
      };
    }

    return {
      success: true,
      text: data.text || data.transcription || '',
      language: data.detectedLanguage || data.detected_language || language || undefined,
    };
  } catch (error) {
    const err = error as Error;
    logError('Whisper transcription error:', err);
    return {
      success: false,
      error: err.message || 'Failed to transcribe audio',
    };
  }
};

export default { transcribeAudio };
