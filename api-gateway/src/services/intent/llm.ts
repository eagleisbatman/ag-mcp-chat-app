/**
 * LLM-based Intent Classification
 * Uses Intent Classification MCP Server for multi-language intent detection
 */

import { LLMClassification, McpCategory } from '../../types';
import { mapIntentToMcpCategory } from './mapper';

const INTENT_CLASSIFICATION_URL =
  process.env.INTENT_CLASSIFICATION_URL ||
  'https://intent-classification-mcp.up.railway.app';

/**
 * Call Intent Classification MCP for multi-language intent detection
 * Provides structured entity extraction (crops, livestock, practices)
 */
export async function classifyIntentWithLLM(
  message: string,
  language = 'en'
): Promise<LLMClassification | null> {
  try {
    const response = await fetch(
      `${INTENT_CLASSIFICATION_URL}/tools/classify_intent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language }),
      }
    );

    if (!response.ok) {
      console.warn('[Intent] LLM classification failed:', response.status);
      return null;
    }

    const data = (await response.json()) as {
      success: boolean;
      classification?: LLMClassification;
    };

    if (data.success && data.classification) {
      console.log(
        `[Intent] LLM classified: ${data.classification.main_intent} (${data.classification.confidence})`
      );
      return data.classification;
    }

    return null;
  } catch (error) {
    console.error('[Intent] LLM error:', (error as Error).message);
    return null;
  }
}

/**
 * Extract MCP categories from LLM classification result
 */
export function extractMcpIntentsFromClassification(
  classification: LLMClassification
): McpCategory[] {
  const mcpIntents: McpCategory[] = [];
  const mainIntent = classification.main_intent?.toLowerCase() || '';
  const practices = (classification.practices || []).map((p) =>
    p.name?.toLowerCase()
  );
  const hasLivestock = (classification.livestock || []).length > 0;

  // Weather (short-term forecasts)
  if (
    mainIntent.includes('weather') ||
    (mainIntent.includes('forecast') &&
      !mainIntent.includes('seasonal') &&
      !mainIntent.includes('climate'))
  ) {
    mcpIntents.push('weather');
  }

  // Climate (seasonal/long-term forecasts from EDACaP)
  if (
    mainIntent.includes('climate') ||
    mainIntent.includes('seasonal') ||
    mainIntent.includes('season outlook')
  ) {
    mcpIntents.push('climate');
  }

  // Soil
  if (
    mainIntent.includes('soil') ||
    practices.includes('soil_preparation') ||
    practices.includes('soil_analysis')
  ) {
    mcpIntents.push('soil');
  }

  // Fertilizer
  if (mainIntent.includes('fertiliz') || practices.includes('fertilization')) {
    mcpIntents.push('fertilizer');
  }

  // Feed/Livestock
  if (
    hasLivestock ||
    practices.includes('feeding') ||
    mainIntent.includes('feeding') ||
    mainIntent.includes('feed') ||
    mainIntent.includes('nutrition')
  ) {
    mcpIntents.push('feed');
  }

  // Advisory/Crop Management (growth stages, crop recommendations from TomorrowNow)
  if (
    mainIntent.includes('advisory') ||
    mainIntent.includes('growth stage') ||
    mainIntent.includes('crop management') ||
    practices.includes('harvesting') ||
    practices.includes('pest_management') ||
    practices.includes('disease_management')
  ) {
    mcpIntents.push('advisory');
  }

  return mcpIntents;
}
