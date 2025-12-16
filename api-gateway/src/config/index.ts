/**
 * Application Configuration
 * Validates environment variables at startup using Zod
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment variable schema
 */
const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  API_KEY: z.string().min(1, 'API_KEY is required'),

  // AI Services
  AI_SERVICES_URL: z.string().url().optional(),
  AI_SERVICES_KEY: z.string().optional(),

  // MCP Services
  INTENT_CLASSIFICATION_URL: z.string().url().optional(),
  AGRIVISION_URL: z.string().url().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Timeouts
  CHAT_TIMEOUT_MS: z.string().default('60000'),
  TTS_TIMEOUT_MS: z.string().default('60000'),
  TRANSCRIBE_TIMEOUT_MS: z.string().default('30000'),
  AGRIVISION_TIMEOUT_MS: z.string().default('45000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // CORS
  CORS_ORIGINS: z.string().optional(),
});

/**
 * Validate environment variables
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

const env = validateEnv();

/**
 * Application configuration
 */
export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',

  database: {
    url: env.DATABASE_URL,
  },

  auth: {
    apiKey: env.API_KEY,
  },

  aiServices: {
    url: env.AI_SERVICES_URL || 'https://ag-mcp-ai-services.up.railway.app',
    key: env.AI_SERVICES_KEY || '',
  },

  mcp: {
    intentClassificationUrl:
      env.INTENT_CLASSIFICATION_URL ||
      'https://intent-classification-mcp.up.railway.app',
    agrivisionUrl:
      env.AGRIVISION_URL || 'https://agrivision-mcp-server.up.railway.app',
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    isConfigured: Boolean(env.CLOUDINARY_CLOUD_NAME),
  },

  timeouts: {
    chat: parseInt(env.CHAT_TIMEOUT_MS, 10),
    tts: parseInt(env.TTS_TIMEOUT_MS, 10),
    transcribe: parseInt(env.TRANSCRIBE_TIMEOUT_MS, 10),
    agrivision: parseInt(env.AGRIVISION_TIMEOUT_MS, 10),
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  cors: {
    origins: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:8081'],
  },
};
