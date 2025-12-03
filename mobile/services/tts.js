// Text-to-Speech service - calls API Gateway → n8n TTS → Cloudinary

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/chat', '/api/tts') 
  || 'https://ag-mcp-api-gateway.up.railway.app/api/tts';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

/**
 * Convert text to speech audio using Gemini TTS
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (e.g., 'en', 'hi', 'sw')
 * @returns {Promise<{success: boolean, audioUrl?: string, error?: string}>}
 */
export const textToSpeech = async (text, language = 'en') => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
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
    console.error('TTS service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate speech',
    };
  }
};

export default { textToSpeech };
