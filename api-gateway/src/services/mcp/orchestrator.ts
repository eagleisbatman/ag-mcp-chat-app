/**
 * MCP Orchestrator
 * Handles intent-based MCP server orchestration
 */

import { config } from '../../config';
import { logger } from '../../utils/logger';
import { McpServer, LLMClassification, DetectedRegion } from '../../types';
import { detectIntents, getCountryFromRegions } from '../intent';
import { callTool, isErrorOrNoData } from './caller';

interface OrchestrationResult {
  mcpResults: Record<string, unknown>;
  intentsDetected: string[];
  classification: LLMClassification | null;
  intentSource: string;
  rawIntents: string[];
  noDataFallbacks: Record<string, unknown>;
}

/**
 * Build fallback context when MCP data is unavailable
 */
function buildFallbackContext(
  type: string,
  options: { region?: string; reason?: string; crop?: string; livestock?: string }
): Record<string, unknown> {
  const { region, reason, crop, livestock } = options;

  const templates: Record<string, Record<string, unknown>> = {
    fertilizer: {
      serviceProvider: 'NextGen Agro Advisory',
      instruction: `I don't have site-specific fertilizer data for ${region || 'your location'}. ${reason ? `Reason: ${reason}. ` : ''}Provide general recommendations for ${crop || 'crops'} in ${region || 'your region'}.`,
      useGeneralKnowledge: true,
    },
    weather: {
      serviceProvider: 'AccuWeather',
      instruction: `I don't have real-time weather data for ${region || 'your location'}. ${reason ? `Reason: ${reason}. ` : ''}Provide general seasonal patterns.`,
      useGeneralKnowledge: true,
    },
    soil: {
      serviceProvider: 'ISDA Soil Intelligence',
      instruction: `I don't have specific soil data for ${region || 'your location'}. ${reason ? `Reason: ${reason}. ` : ''}Provide general soil management advice.`,
      useGeneralKnowledge: true,
    },
    feed: {
      serviceProvider: 'Feed Formulation Service',
      instruction: `Feed data unavailable. ${reason ? `Reason: ${reason}. ` : ''}Provide general feeding recommendations for ${livestock || 'livestock'}.`,
      useGeneralKnowledge: true,
    },
    climate: {
      serviceProvider: 'EDACaP',
      instruction: `I don't have seasonal forecast data for ${region || 'your location'}. ${reason ? `Reason: ${reason}. ` : ''}Provide general climate patterns.`,
      useGeneralKnowledge: true,
    },
  };

  return templates[type] || { instruction: 'Service unavailable.', useGeneralKnowledge: true };
}

/**
 * Call MCP servers based on user intent
 */
export async function callMcpServersForIntent(
  message: string,
  latitude: number | null,
  longitude: number | null,
  mcpServers: { global: McpServer[]; regional: McpServer[] },
  language: string,
  detectedRegions: DetectedRegion[]
): Promise<OrchestrationResult> {
  const allServers = [...mcpServers.global, ...mcpServers.regional];
  const mcpResults: Record<string, unknown> = {};
  const noDataFallbacks: Record<string, unknown> = {};

  const country = getCountryFromRegions(detectedRegions);
  const regionName = detectedRegions?.[0]?.name || country;

  const intentResult = await detectIntents(message, country, language);
  const intentsDetected = intentResult.intents;
  const classification = intentResult.classification;

  const detectedCrop =
    classification?.crops?.[0]?.canonical_name?.toLowerCase() ||
    classification?.crops?.[0]?.name?.toLowerCase();

  logger.info(`[MCP] Intent detection: ${intentsDetected.join(', ') || 'none'}`);

  // Weather intent
  if (intentsDetected.includes('weather')) {
    const server = allServers.find((s) => s.slug === 'accuweather');
    if (server?.endpoint && latitude && longitude) {
      const [current, forecast] = await Promise.all([
        callTool(server.endpoint, 'get_accuweather_current_conditions', { latitude, longitude }),
        callTool(server.endpoint, 'get_accuweather_weather_forecast', { latitude, longitude, days: 5 }),
      ]);

      const currentObj = current as Record<string, unknown> | null;
      const forecastObj = forecast as Record<string, unknown> | null;

      mcpResults.weather = {
        current: currentObj?.current || current,
        forecast: forecastObj?.forecast || forecast,
        location: currentObj?.location || { latitude, longitude },
        error: isErrorOrNoData(current) && isErrorOrNoData(forecast),
      };

      if ((mcpResults.weather as Record<string, unknown>).error) {
        noDataFallbacks.weather = buildFallbackContext('weather', { region: regionName, reason: 'Service unavailable' });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.weather = buildFallbackContext('weather', { region: regionName, reason: 'No coordinates' });
    }
  }

  // Soil intent
  if (intentsDetected.includes('soil')) {
    const server = allServers.find((s) => s.slug === 'isda-soil');
    if (server?.endpoint && latitude && longitude) {
      mcpResults.soil = await callTool(server.endpoint, 'get_isda_soil_properties', { latitude, longitude });
      if (isErrorOrNoData(mcpResults.soil)) {
        noDataFallbacks.soil = buildFallbackContext('soil', { region: regionName, reason: 'Outside coverage area' });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.soil = buildFallbackContext('soil', { region: regionName, reason: 'No coordinates' });
    }
  }

  // Fertilizer intent
  if (intentsDetected.includes('fertilizer')) {
    const server = allServers.find((s) => s.slug === 'nextgen');
    if (server?.endpoint && latitude && longitude) {
      const crop = detectedCrop === 'maize' ? 'maize' : 'wheat';
      mcpResults.fertilizer = await callTool(
        server.endpoint,
        'get_fertilizer_recommendation',
        { crop, latitude, longitude },
        { 'X-Farm-Latitude': String(latitude), 'X-Farm-Longitude': String(longitude) }
      );
      if (isErrorOrNoData(mcpResults.fertilizer)) {
        noDataFallbacks.fertilizer = buildFallbackContext('fertilizer', { region: regionName, crop, reason: 'Data unavailable' });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.fertilizer = buildFallbackContext('fertilizer', { region: regionName, crop: detectedCrop || 'crops', reason: 'No coordinates' });
    }
  }

  // Feed intent
  if (intentsDetected.includes('feed')) {
    const server = allServers.find((s) => s.slug === 'feed-formulation');
    if (server?.endpoint) {
      const livestock = classification?.livestock?.[0]?.canonical_name || 'dairy cattle';
      mcpResults.feed = await callTool(server.endpoint, 'search_feeds', { query: livestock, limit: 5 });
      if (isErrorOrNoData(mcpResults.feed)) {
        noDataFallbacks.feed = buildFallbackContext('feed', { region: regionName, livestock, reason: 'Database unavailable' });
      }
    }
  }

  // Climate intent
  if (intentsDetected.includes('climate')) {
    const server = allServers.find((s) => s.slug === 'edacap');
    if (server?.endpoint && latitude && longitude) {
      mcpResults.climate = await callTool(server.endpoint, 'get_climate_forecast', { latitude, longitude });
      if (isErrorOrNoData(mcpResults.climate)) {
        noDataFallbacks.climate = buildFallbackContext('climate', { region: regionName, reason: 'Forecast unavailable' });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.climate = buildFallbackContext('climate', { region: regionName, reason: 'No coordinates' });
    }
  }

  return {
    mcpResults,
    intentsDetected,
    classification,
    intentSource: intentResult.source,
    rawIntents: intentResult.rawIntents,
    noDataFallbacks,
  };
}

/**
 * Call AgriVision MCP for plant health diagnosis
 */
export async function callAgriVisionDiagnosis(
  imageBase64: string,
  expectedCrop: string | null = null
): Promise<Record<string, unknown> | null> {
  try {
    logger.info('[AgriVision] Starting plant diagnosis...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeouts.agrivision);

    const args: Record<string, string> = { image: imageBase64 };
    if (expectedCrop) {
      args.crop = expectedCrop;
    }

    const response = await fetch(`${config.mcp.agrivisionUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'diagnose_plant_health', arguments: args },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    const dataLine = text.split('\n').find((l) => l.startsWith('data: '));

    if (dataLine) {
      const data = JSON.parse(dataLine.replace('data: ', ''));
      if (data.result?.content?.[0]?.text) {
        try {
          return JSON.parse(data.result.content[0].text);
        } catch {
          return { text: data.result.content[0].text, format: 'text' };
        }
      }
    }

    return null;
  } catch (e) {
    const err = e as Error;
    if (err.name === 'AbortError') {
      logger.error('[AgriVision] Timeout');
      return { error: 'timeout', message: 'Plant diagnosis timed out.' };
    }
    logger.error('[AgriVision] Error', { error: err.message });
    return { error: err.message };
  }
}
