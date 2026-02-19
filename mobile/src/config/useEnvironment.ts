/**
 * Environment Hook
 *
 * Manages the current environment selection and persists it.
 * Allows runtime switching between production and development.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Environment,
  EnvironmentConfig,
  ENVIRONMENTS,
  getDefaultEnvironment,
  MCP_SERVERS,
} from './environments';

const STORAGE_KEY = '@farmerchat/environment';

interface UseEnvironmentReturn {
  /** Current environment name */
  environment: Environment;
  /** Current environment configuration */
  config: EnvironmentConfig;
  /** MCP server URLs for current environment */
  mcpServers: (typeof MCP_SERVERS)[Environment];
  /** Whether environment is being loaded */
  isLoading: boolean;
  /** Switch to a different environment */
  setEnvironment: (env: Environment) => Promise<void>;
  /** Reset to default environment */
  resetToDefault: () => Promise<void>;
  /** Check if current environment is development */
  isDevelopment: boolean;
  /** Check if current environment is production */
  isProduction: boolean;
}

/**
 * Hook to manage environment configuration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { config, environment, setEnvironment, isDevelopment } = useEnvironment();
 *
 *   return (
 *     <View>
 *       <Text>Connected to: {config.name}</Text>
 *       <Text>API: {config.apiGateway}</Text>
 *       {isDevelopment && <DebugPanel />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useEnvironment(): UseEnvironmentReturn {
  const [environment, setEnvironmentState] = useState<Environment>(getDefaultEnvironment());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved environment on mount
  useEffect(() => {
    loadSavedEnvironment();
  }, []);

  const loadSavedEnvironment = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'production' || saved === 'development')) {
        setEnvironmentState(saved as Environment);
      }
    } catch (error) {
      console.warn('Failed to load saved environment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setEnvironment = useCallback(async (env: Environment) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, env);
      setEnvironmentState(env);
      console.log(`[Environment] Switched to ${env}`);
    } catch (error) {
      console.error('Failed to save environment:', error);
      throw error;
    }
  }, []);

  const resetToDefault = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setEnvironmentState(getDefaultEnvironment());
      console.log('[Environment] Reset to default');
    } catch (error) {
      console.error('Failed to reset environment:', error);
      throw error;
    }
  }, []);

  const config = ENVIRONMENTS[environment];
  const mcpServers = MCP_SERVERS[environment];

  return {
    environment,
    config,
    mcpServers,
    isLoading,
    setEnvironment,
    resetToDefault,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
  };
}

/**
 * Get current environment config synchronously
 * Use this when you can't use hooks (e.g., in API clients)
 *
 * Note: This returns the default environment, not the user's saved preference.
 * For user's preference, use the useEnvironment hook.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return ENVIRONMENTS[getDefaultEnvironment()];
}

/**
 * Get API base URL for current environment
 * Convenience function for API clients
 */
export function getApiBaseUrl(): string {
  return getEnvironmentConfig().apiGateway;
}

/**
 * Get AI Services URL for current environment
 */
export function getAiServicesUrl(): string {
  return getEnvironmentConfig().aiServices;
}
