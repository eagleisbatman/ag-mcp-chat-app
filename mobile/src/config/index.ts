/**
 * Configuration Exports
 */

export {
  type Environment,
  type EnvironmentConfig,
  ENVIRONMENTS,
  MCP_SERVERS,
  getDefaultEnvironment,
} from './environments';

export {
  useEnvironment,
  getEnvironmentConfig,
  getApiBaseUrl,
  getAiServicesUrl,
} from './useEnvironment';
