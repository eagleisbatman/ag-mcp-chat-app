/**
 * Keyword-based Intent Detection
 * Fast pattern matching for common farming queries
 */

import { IntentKeywordMap, McpCategory } from '../../types';

/**
 * Global keyword patterns for intent detection
 * Works for ANY location - no country-specific entries needed
 */
export const GLOBAL_INTENT_KEYWORDS: IntentKeywordMap = {
  weather: [
    'weather', 'forecast', 'temperature', 'rain', 'rainfall', 'precipitation',
    'humidity', 'wind', 'will it rain', 'how hot', 'how cold', 'sunny', 'cloudy',
    'storm', 'drought', 'flood', 'climate today', 'weather today', 'tomorrow weather',
  ],
  soil: [
    'soil', 'ph', 'nitrogen', 'phosphorus', 'potassium', 'soil quality',
    'soil test', 'soil analysis', 'soil nutrients', 'soil health', 'land quality',
  ],
  fertilizer: [
    'fertilizer', 'fertiliser', 'urea', 'nps', 'dap', 'compost', 'manure',
    'fertilizer recommendation', 'what fertilizer', 'which fertilizer',
  ],
  feed: [
    'feed', 'cow', 'cattle', 'dairy', 'livestock', 'milk', 'fodder', 'diet',
    'ration', 'animal feed', 'feeding', 'nutrition', 'lactating',
  ],
  climate: [
    'seasonal', 'season', 'monsoon', 'long term', 'climate forecast',
    'seasonal outlook', 'climate prediction', 'next season',
  ],
  advisory: [
    'growth stage', 'crop stage', 'recommendation', 'advice', 'what should i do',
    'pest', 'disease', 'harvest', 'planting advice', 'crop management',
  ],
};

/**
 * Detect intents from message using keyword matching
 * @returns Array of detected MCP categories
 */
export function detectIntentsFromKeywords(message: string): McpCategory[] {
  if (!message) return [];

  const lowerMessage = message.toLowerCase();
  const detectedIntents: McpCategory[] = [];

  for (const [intent, keywords] of Object.entries(GLOBAL_INTENT_KEYWORDS)) {
    if (keywords.some((keyword: string) => lowerMessage.includes(keyword))) {
      detectedIntents.push(intent as McpCategory);
    }
  }

  return detectedIntents;
}
