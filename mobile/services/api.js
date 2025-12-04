// Chat API service - calls API Gateway → n8n workflow

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ag-mcp-api-gateway.up.railway.app/api/chat';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

/**
 * Send chat message with conversation history
 * @param {object} params - Chat parameters
 * @param {string} params.message - Current user message
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {string} params.language - Language code (e.g., 'en', 'hi')
 * @param {Array} params.history - Previous messages for context (last 10)
 */
export const sendChatMessage = async ({ message, latitude, longitude, language, history = [] }) => {
  try {
    // Format history for n8n workflow
    const formattedHistory = history
      .filter(m => m._id !== 'welcome') // Exclude welcome message
      .slice(0, 10) // Last 10 messages
      .reverse() // Oldest first
      .map(m => ({
        text: m.text,
        isBot: m.isBot,
      }));

    console.log('📤 [API] Sending chat with history:', formattedHistory.length, 'messages');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        message,
        latitude: latitude || -1.2864,
        longitude: longitude || 36.8172,
        language: language || 'en',
        history: formattedHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      response: data.response || data.text || 'No response received',
      region: data.region,
      language: data.language,
    };
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
    };
  }
};

export default { sendChatMessage };

