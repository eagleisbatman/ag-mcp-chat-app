/**
 * Auth Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../config', () => ({
  config: {
    auth: { apiKey: 'valid-api-key' },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { warn: vi.fn() },
}));

import { apiKeyAuth, authenticate } from './auth';

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      path: '/api/chat',
      headers: {},
      ip: '127.0.0.1',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('apiKeyAuth', () => {
    it('should skip auth for health check endpoint', () => {
      mockReq.path = '/health';

      apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without API key', () => {
      apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'MISSING_API_KEY',
      });
    });

    it('should reject request with invalid API key', () => {
      mockReq.headers['x-api-key'] = 'invalid-key';

      apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    });

    it('should allow request with valid API key', () => {
      mockReq.headers['x-api-key'] = 'valid-api-key';

      apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should be case-sensitive for API keys', () => {
      mockReq.headers['x-api-key'] = 'VALID-API-KEY';

      apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authenticate alias', () => {
    it('should be same function as apiKeyAuth', () => {
      expect(authenticate).toBe(apiKeyAuth);
    });
  });
});
