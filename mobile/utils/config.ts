/**
 * Configuration utility
 * Centralizes environment variable access with validation
 */

declare const __DEV__: boolean;

/**
 * Get a required environment variable
 * Throws an error if the variable is not set
 * @param key - Environment variable key
 * @returns Environment variable value
 */
export const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    // In development, provide helpful error message
    if (__DEV__) {
      console.error(`Missing required environment variable: ${key}`);
      console.error('Please check your .env file or app.json extra config');
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Get an optional environment variable with a default value
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
export const getOptionalEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

// API Configuration
export const API_BASE_URL = getRequiredEnv('EXPO_PUBLIC_API_BASE_URL');
export const API_KEY = getRequiredEnv('EXPO_PUBLIC_API_KEY');

// Timeout configurations (in milliseconds)
export const TIMEOUTS = {
  CHAT: 60000,      // 60s for chat (includes MCP calls)
  DEFAULT: 30000,   // 30s for other endpoints
  DB: 30000,        // 30s for database operations
  WEATHER: 30000,   // 30s for weather endpoints
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;

export default {
  API_BASE_URL,
  API_KEY,
  TIMEOUTS,
  getRequiredEnv,
  getOptionalEnv,
};
