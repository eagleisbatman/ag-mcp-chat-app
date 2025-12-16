/**
 * Error Handler Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../config', () => ({
  config: {
    isDevelopment: false,
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

import {
  AppError,
  Errors,
  notFoundHandler,
  errorHandler,
  asyncHandler,
} from './error-handler';

describe('Error Handler Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      path: '/api/test',
      method: 'GET',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(400, 'BAD_REQUEST', 'Invalid input', { field: 'name' });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'name' });
      expect(error.name).toBe('AppError');
    });
  });

  describe('Errors helpers', () => {
    it('should create badRequest error', () => {
      const error = Errors.badRequest('Invalid data', { field: 'email' });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid data');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create unauthorized error', () => {
      const error = Errors.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });

    it('should create unauthorized error with custom message', () => {
      const error = Errors.unauthorized('Token expired');

      expect(error.message).toBe('Token expired');
    });

    it('should create forbidden error', () => {
      const error = Errors.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });

    it('should create notFound error', () => {
      const error = Errors.notFound('User');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('should create conflict error', () => {
      const error = Errors.conflict('Username already exists');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should create tooManyRequests error', () => {
      const error = Errors.tooManyRequests();

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT');
    });

    it('should create internal error', () => {
      const error = Errors.internal();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should create serviceUnavailable error', () => {
      const error = Errors.serviceUnavailable();

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should create gatewayTimeout error', () => {
      const error = Errors.gatewayTimeout();

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('GATEWAY_TIMEOUT');
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with path', () => {
      mockReq.path = '/unknown';

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: '/unknown',
      });
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError', () => {
      const error = new AppError(400, 'BAD_REQUEST', 'Invalid input');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input',
        code: 'BAD_REQUEST',
      });
    });

    it('should handle Prisma errors', () => {
      const error = new Error('Database error');
      error.name = 'PrismaClientKnownRequestError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
      });
    });

    it('should handle unknown errors in production', () => {
      const error = new Error('Something secret went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('asyncHandler', () => {
    it('should call handler on success', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(handler);

      wrapped(mockReq, mockRes, mockNext);
      await new Promise((r) => setTimeout(r, 0));

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should call next on error', async () => {
      const error = new Error('Async error');
      const handler = vi.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(handler);

      wrapped(mockReq, mockRes, mockNext);
      await new Promise((r) => setTimeout(r, 0));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
