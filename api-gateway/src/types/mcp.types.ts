/**
 * MCP Server and Region Types
 */

export interface McpServer {
  slug: string;
  name: string;
  category: McpCategory;
  tools: string[];
  capabilities: string[];
  endpoint: string | null;
  sourceRegion?: string;
}

export type McpCategory =
  | 'weather'
  | 'climate'
  | 'soil'
  | 'fertilizer'
  | 'feed'
  | 'advisory'
  | 'diagnosis'
  | 'general';

export interface Region {
  id: string;
  name: string;
  code: string;
  level: number;
  parentRegionId?: string | null;
  boundsMinLat: number;
  boundsMaxLat: number;
  boundsMinLon: number;
  boundsMaxLon: number;
  isActive: boolean;
}

export interface DetectedRegion {
  name: string;
  code: string;
  level: number;
}

export interface McpServersForLocation {
  global: McpServer[];
  regional: McpServer[];
  detectedRegions: DetectedRegion[];
}

export interface McpToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface McpCallOptions {
  endpoint: string;
  toolName: string;
  args: Record<string, unknown>;
  extraHeaders?: Record<string, string>;
  timeout?: number;
}

export interface McpServerHealth {
  slug: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export interface RegionHierarchy {
  regionIds: string[];
  regions: Region[];
}
