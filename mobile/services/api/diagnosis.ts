import { fetchWithTimeout, parseErrorMessage } from '../../utils/apiHelpers';
import type { PlantDiagnosisParams, PlantDiagnosisResult } from '../../types';
import { API_KEY, CHAT_API_URL, CHAT_TIMEOUT_MS, buildLocationContext, ensureDeviceId, getLocalDateTime } from './core';

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
        latitude: params.latitude || -1.2864,
        longitude: params.longitude || 36.8172,
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
      metadata: {
        ...(data._meta || {}),
        intentsDetected: data.intentsDetected || [],
        mcpToolsUsed: data.mcpToolsUsed || [],
        extractedEntities: data.extractedEntities || null,
        intentSource: data.intentSource,
      },
    };
  } catch (error) {
    return { success: false, error: parseErrorMessage(error) };
  }
};
