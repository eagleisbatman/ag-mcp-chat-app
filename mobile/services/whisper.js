// Whisper Transcription Service - Voice to text via n8n workflow

const WHISPER_URL = process.env.EXPO_PUBLIC_WHISPER_URL || 'https://ag-mcp-api-gateway.up.railway.app/api/transcribe';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

/**
 * Transcribe audio to text using OpenAI Whisper via n8n
 * @param {string} audioBase64 - Base64 encoded audio file
 * @param {string} language - Optional language hint (ISO code)
 * @returns {Promise<object>} Transcription result
 */
export const transcribeAudio = async (audioBase64, language = null) => {
  try {
    // Ensure proper data URL format
    let audioData = audioBase64;
    if (!audioBase64.startsWith('data:')) {
      audioData = `data:audio/m4a;base64,${audioBase64}`;
    }

    const response = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        audio: audioData,
        language: language,
      }),
    });

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

