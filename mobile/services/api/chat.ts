import { fetchWithTimeout, parseErrorMessage } from '../../utils/apiHelpers';
import type { ChatParams, ChatResult } from '../../types';
import { API_KEY, CHAT_API_URL, CHAT_TIMEOUT_MS, buildLocationContext, ensureDeviceId, getLocalDateTime } from './core';

/**
 * Send chat message (non-streaming fallback)
 */
export const sendChatMessage = async (params: ChatParams): Promise<ChatResult> => {
  try {
    const deviceId = await ensureDeviceId();
    const formattedHistory = (params.history || [])
      .filter(m => m._id !== 'welcome' && m.text)
      .slice(0, 10)
      .reverse()
      .map(m => ({ text: m.text || '', isBot: m.isBot }));

    const locationContext = buildLocationContext(params.locationDetails);
    const response = await fetchWithTimeout(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        ...params,
        location: locationContext,
        history: formattedHistory,
        deviceId,
        clientDateTime: getLocalDateTime(),
      }),
    }, CHAT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return {
      success: true,
      response: data.response || data.text || 'No response received',
      region: data.region,
      language: data.language,
      followUpQuestions: data.followUpQuestions,
    };
  } catch (error) {
    return { success: false, error: parseErrorMessage(error) };
  }
};
