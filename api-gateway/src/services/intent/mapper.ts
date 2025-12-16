/**
 * Intent to MCP Category Mapper
 * Maps intent names to MCP server categories
 */

import { McpCategory, IntentMappingConfig } from '../../types';

/**
 * Intent name to MCP category mapping
 */
const INTENT_TO_MCP_MAP: IntentMappingConfig = {
  // Weather (short-term forecasts)
  weather_forecast: 'weather',
  weather: 'weather',

  // Climate (seasonal/long-term forecasts)
  climate_forecast: 'climate',
  climate: 'climate',
  seasonal_forecast: 'climate',
  seasonal: 'climate',

  // Soil
  soil_analysis: 'soil',
  soil: 'soil',
  soil_nutrients: 'soil',

  // Fertilizer
  fertilizer_recommendation: 'fertilizer',
  fertilization: 'fertilizer',
  fertilizer: 'fertilizer',

  // Feed/Livestock
  feeding: 'feed',
  livestock: 'feed',
  dairy: 'feed',
  feed: 'feed',
  nutrition: 'feed',

  // Advisory/Decision Tree (crop management)
  crop_advisory: 'advisory',
  advisory: 'advisory',
  growth_stage: 'advisory',
  crop_management: 'advisory',

  // Planting/Irrigation (can trigger weather for timing)
  planting_advice: 'weather',
  irrigation_advice: 'weather',
};

/**
 * Map intent name to MCP category
 */
export function mapIntentToMcpCategory(
  intentName: string
): McpCategory | null {
  return (INTENT_TO_MCP_MAP[intentName.toLowerCase()] as McpCategory) || null;
}

/**
 * Get country from detected regions
 */
export function getCountryFromRegions(
  detectedRegions: Array<{ name: string; code?: string; level?: number }>
): string {
  const regionNames = (detectedRegions || []).map((r) =>
    r.name?.toLowerCase()
  );

  if (regionNames.includes('ethiopia')) return 'ethiopia';
  if (regionNames.includes('kenya')) return 'kenya';
  if (regionNames.includes('india')) return 'india';
  if (regionNames.includes('vietnam')) return 'vietnam';
  if (regionNames.includes('tanzania')) return 'tanzania';

  return 'global';
}
