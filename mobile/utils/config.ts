/**
 * Configuration utility
 * Centralizes environment variable access with validation
 * Uses expo-constants as fallback for production builds
 */

import Constants from 'expo-constants';

declare const __DEV__: boolean;

// Get extra config from expo-constants (set in app.config.js)
const expoExtra = Constants.expoConfig?.extra || {};

/**
 * Get a required environment variable
 * Checks process.env first, then falls back to expo-constants extra
 * Throws an error if the variable is not set
 * @param key - Environment variable key
 * @param extraKey - Optional key in expo extra config
 * @returns Environment variable value
 */
export const getRequiredEnv = (key: string, extraKey?: string): string => {
  // First try process.env (works in dev and when bundled with env vars)
  let value = process.env[key];

  // Fallback to expo-constants extra (set in app.config.js)
  if (!value && extraKey) {
    value = expoExtra[extraKey];
  }

  if (!value) {
    // In development, provide helpful error message
    if (__DEV__) {
      console.error(`Missing required environment variable: ${key}`);
      console.error('Please check your .env file or app.config.js extra config');
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Get an optional environment variable with a default value
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @param extraKey - Optional key in expo extra config
 * @returns Environment variable value or default
 */
export const getOptionalEnv = (key: string, defaultValue: string, extraKey?: string): string => {
  let value = process.env[key];
  if (!value && extraKey) {
    value = expoExtra[extraKey];
  }
  return value || defaultValue;
};

// API Configuration - use expo extra as fallback
export const API_BASE_URL = getRequiredEnv('EXPO_PUBLIC_API_BASE_URL', 'apiBaseUrl');
export const API_KEY = getRequiredEnv('EXPO_PUBLIC_API_KEY', 'apiKey');
export const AI_SERVICES_URL = getOptionalEnv('EXPO_PUBLIC_AI_SERVICES_URL', API_BASE_URL, 'aiServicesUrl');

// Timeout configurations (in milliseconds)
export const TIMEOUTS = {
  CHAT: 60000,      // 60s for chat (auto-retry handles cold starts)
  DEFAULT: 30000,   // 30s for other endpoints
  DB: 30000,        // 30s for database operations
  WEATHER: 30000,   // 30s for weather endpoints
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;

export default {
  API_BASE_URL,
  API_KEY,
  AI_SERVICES_URL,
  TIMEOUTS,
  getRequiredEnv,
  getOptionalEnv,
};
