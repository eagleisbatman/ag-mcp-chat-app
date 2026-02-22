import { fetchWithTimeout, parseErrorMessage } from '../../utils/apiHelpers';
import type { PlantDiagnosisParams, PlantDiagnosisResult } from '../../types';
import { API_KEY, CHAT_API_URL, CHAT_TIMEOUT_MS, FALLBACK_LATITUDE, FALLBACK_LONGITUDE, buildLocationContext, ensureDeviceId, getLocalDateTime } from './core';

/**
 * Analyze plant image via API Gateway
 */
export const analyzePlantImage = async (params: PlantDiagnosisParams): Promise<PlantDiagnosisResult> => {
  try {
    const deviceId = await ensureDeviceId();
    const locationContext = buildLocationContext(params.locationDetails);

    const response = await fetchWithTimeout(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        message: 'Analyze this plant image for health issues and provide diagnosis.',
        latitude: params.latitude ?? FALLBACK_LATITUDE,
        longitude: params.longitude ?? FALLBACK_LONGITUDE,
        language: params.language || 'en',
        location: locationContext,
        image: params.imageBase64,
        stream: false,
        deviceId,
        sessionId: params.sessionId,
        clientDateTime: getLocalDateTime(),
      }),
    }, CHAT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return {
      success: true,
      response: data.response,
      diagnosis: data.diagnosis,
      followUpQuestions: data.followUpQuestions || data._meta?.followUpQuestions || [],
      metadata: {
        ...(data._meta || {}),
        intentsDetected: data.intentsDetected || [],
        mcpToolsUsed: data.mcpToolsUsed || [],
        extractedEntities: data.extractedEntities || null,
        intentSource: data.intentSource,
        followUpQuestions: data.followUpQuestions || data._meta?.followUpQuestions || [],
      },
    };
  } catch (error) {
    return { success: false, error: parseErrorMessage(error) };
  }
};
