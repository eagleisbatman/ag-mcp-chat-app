// Chat API service - calls API Gateway → n8n workflow

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ag-mcp-api-gateway.up.railway.app/api/chat';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

export const sendChatMessage = async ({ message, latitude, longitude, language }) => {
  try {
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

