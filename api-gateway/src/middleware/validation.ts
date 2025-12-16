/**
 * Request Validation Middleware
 * Uses Zod for schema validation
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Chat request schema
 */
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  language: z.string().min(2).max(5).optional().default('en'),
  history: z
    .array(
      z.object({
        text: z.string(),
        isBot: z.boolean(),
      })
    )
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location: z
    .object({
      locality: z.string().optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      displayName: z.string().optional(),
    })
    .optional(),
  image: z.string().optional(),
});

/**
 * TTS request schema
 */
export const ttsRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long'),
  language: z.string().min(2).max(5).optional().default('en'),
  voice: z.string().optional(),
});

/**
 * Transcription request schema
 */
export const transcriptionRequestSchema = z.object({
  audio: z.string().min(1, 'Audio data is required'),
  language: z.string().min(2).max(5).optional().default('en'),
  mimeType: z.string().optional().default('audio/wav'),
});

/**
 * Title generation request schema
 */
export const titleRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string().optional(),
        isBot: z.boolean().optional(),
        content: z.string().optional(),
        text: z.string().optional(),
      })
    )
    .min(1, 'At least one message is required'),
  language: z.string().min(2).max(5).optional().default('en'),
});

/**
 * Location lookup request schema
 */
export const locationLookupSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  ipAddress: z.string().optional(),
});

/**
 * MCP servers filter schema
 */
export const mcpServersFilterSchema = z.object({
  region: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type TTSRequest = z.infer<typeof ttsRequestSchema>;
export type TranscriptionRequest = z.infer<typeof transcriptionRequestSchema>;
export type TitleRequest = z.infer<typeof titleRequestSchema>;
export type LocationLookupRequest = z.infer<typeof locationLookupSchema>;
export type McpServersFilterRequest = z.infer<typeof mcpServersFilterSchema>;

/**
 * Create validation middleware for a schema
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
      return;
    }

    // Replace body with validated and transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
      return;
    }

    req.query = result.data as typeof req.query;
    next();
  };
}
