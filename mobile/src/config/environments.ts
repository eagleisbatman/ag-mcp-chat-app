/**
 * Environment Configuration
 *
 * Supports runtime switching between production and development environments.
 * This enables:
 * 1. Developers to test against dev servers
 * 2. Testers to switch environments without reinstalling
 * 3. Future "developer mode" features for power users
 */

export type Environment = 'production' | 'development';

export interface EnvironmentConfig {
  name: string;
  apiGateway: string;
  aiServices: string;
  apiKey: string;
  features: {
    debugMode: boolean;
    showDevTools: boolean;
    verboseLogging: boolean;
  };
}

/**
 * Production Environment
 * - Stable, tested features only
 * - Connected to production database
 */
const PRODUCTION: EnvironmentConfig = {
  name: 'Production',
  apiGateway: 'https://ag-mcp-api-gateway.up.railway.app',
  aiServices: 'https://ag-mcp-ai-services.up.railway.app',
  apiKey: process.env.EXPO_PUBLIC_API_KEY || '',
  features: {
    debugMode: false,
    showDevTools: false,
    verboseLogging: false,
  },
};

/**
 * Development Environment
 * - May have experimental features
 * - Connected to development database
 * - Extra debugging tools available
 */
const DEVELOPMENT: EnvironmentConfig = {
  name: 'Development',
  apiGateway: 'https://api-gateway-development-a0ed.up.railway.app',
  aiServices: 'https://ag-mcp-ai-services-development.up.railway.app',
  apiKey: process.env.EXPO_PUBLIC_API_KEY || '',
  features: {
    debugMode: true,
    showDevTools: true,
    verboseLogging: true,
  },
};

export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  production: PRODUCTION,
  development: DEVELOPMENT,
};

/**
 * Get the default environment based on build configuration
 */
export function getDefaultEnvironment(): Environment {
  const envFromBuild = process.env.EXPO_PUBLIC_ENV as Environment;
  if (envFromBuild && ENVIRONMENTS[envFromBuild]) {
    return envFromBuild;
  }
  // Default to production for safety
  return __DEV__ ? 'development' : 'production';
}

/**
 * MCP Server URLs by environment
 * Used for direct MCP server access (if needed)
 */
export const MCP_SERVERS = {
  production: {
    gapWeather: 'https://gap-weather-mcp.up.railway.app',
    accuWeather: 'https://accuweather-mcp.up.railway.app',
    tomorrowIo: 'https://tomorrow-io-mcp.up.railway.app',
    isdaSoil: 'https://isda-soil-mcp.up.railway.app',
    agriVision: 'https://agrivision.up.railway.app',
    plantix: 'https://plantix-mcp.up.railway.app',
    nextGen: 'https://nextgen-mcp.up.railway.app',
    edacap: 'https://edacap-mcp-server.up.railway.app',
  },
  development: {
    gapWeather: 'https://gap-weather-mcp-development.up.railway.app',
    accuWeather: 'https://accuweather-mcp-server-development.up.railway.app',
    tomorrowIo: 'https://tomorrow-io-mcp-development.up.railway.app',
    isdaSoil: 'https://isda-soil-mcp-development.up.railway.app',
    agriVision: 'https://agrivision-mcp-server-development.up.railway.app',
    plantix: 'https://plantix-mcp-development.up.railway.app',
    nextGen: 'https://nextgen-mcp-development.up.railway.app',
    edacap: 'https://edacap-mcp-server-development.up.railway.app',
  },
} as const;
