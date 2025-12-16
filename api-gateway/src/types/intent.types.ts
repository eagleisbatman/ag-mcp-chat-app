/**
 * Intent Classification Types
 */

import { McpCategory } from './mcp.types';

export type IntentSource = 'keywords' | 'llm' | 'none';

export interface LLMClassification {
  main_intent: string;
  confidence: number;
  crops?: Array<{ name: string; canonical_name?: string; confidence?: number }>;
  livestock?: Array<{ name: string; canonical_name?: string; type?: string }>;
  practices?: Array<{ name: string }>;
  entities?: Record<string, unknown>;
}

export interface IntentDetectionResult {
  intents: McpCategory[];
  rawIntents: string[];
  source: IntentSource;
  classification: LLMClassification | null;
}

export interface IntentKeywordMap {
  weather: string[];
  soil: string[];
  fertilizer: string[];
  feed: string[];
  climate: string[];
  advisory: string[];
}

export interface IntentMappingConfig {
  [intentName: string]: McpCategory | null;
}
