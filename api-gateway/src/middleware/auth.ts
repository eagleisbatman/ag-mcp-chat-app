/**
 * API Key Authentication Middleware
 * Validates API key from X-API-Key header
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Validate API key for protected routes
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth for health check
  if (req.path === '/health') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    logger.warn('Missing API key', { path: req.path, ip: req.ip });
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  if (apiKey !== config.auth.apiKey) {
    logger.warn('Invalid API key', { path: req.path, ip: req.ip });
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
    return;
  }

  next();
}

/**
 * Express-compatible authenticate middleware (legacy support)
 */
export const authenticate = apiKeyAuth;
