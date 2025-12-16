/**
 * Intent Detection Services
 * Exports all intent-related functionality
 */

import { IntentDetectionResult, McpCategory, LLMClassification } from '../../types';
import { detectIntentsFromKeywords } from './keywords';
import {
  classifyIntentWithLLM,
  extractMcpIntentsFromClassification,
} from './llm';
import { mapIntentToMcpCategory, getCountryFromRegions } from './mapper';

export * from './keywords';
export * from './llm';
export * from './mapper';

/**
 * Unified intent detection: Global keywords first, then Intent Classification MCP
 */
export async function detectIntents(
  message: string,
  country = 'ethiopia',
  language = 'en'
): Promise<IntentDetectionResult> {
  // Step 1: Try fast global keyword detection (works for ALL locations)
  const keywordIntents = detectIntentsFromKeywords(message);

  if (keywordIntents.length > 0) {
    console.log(`[Intent] Global keyword match: ${keywordIntents.join(', ')}`);
    return {
      intents: keywordIntents,
      rawIntents: keywordIntents,
      source: 'keywords',
      classification: null,
    };
  }

  // Step 2: Use Intent Classification MCP for structured classification
  console.log('[Intent] No keyword match, using Intent Classification MCP...');
  const llmResult = await classifyIntentWithLLM(message, language);

  if (llmResult) {
    const mcpIntents = extractMcpIntentsFromClassification(llmResult);
    const mainIntent = llmResult.main_intent?.toLowerCase() || '';

    return {
      intents: mcpIntents,
      rawIntents: [mainIntent],
      source: 'llm',
      classification: llmResult,
    };
  }

  return {
    intents: [],
    rawIntents: [],
    source: 'none',
    classification: null,
  };
}
