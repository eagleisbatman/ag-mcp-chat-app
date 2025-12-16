/**
 * Validation Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validate,
  validateQuery,
  chatRequestSchema,
  ttsRequestSchema,
  transcriptionRequestSchema,
  titleRequestSchema,
  locationLookupSchema,
  mcpServersFilterSchema,
} from './validation';

describe('Validation Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { body: {}, query: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('chatRequestSchema', () => {
    it('should validate valid chat request', () => {
      mockReq.body = { message: 'Hello' };

      const middleware = validate(chatRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.language).toBe('en');
    });

    it('should reject empty message', () => {
      mockReq.body = { message: '' };

      const middleware = validate(chatRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate with all optional fields', () => {
      mockReq.body = {
        message: 'Hello',
        language: 'fr',
        latitude: 9.0,
        longitude: 38.7,
        history: [{ text: 'Hi', isBot: false }],
        location: { city: 'Addis Ababa', country: 'Ethiopia' },
        image: 'base64image',
      };

      const middleware = validate(chatRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid latitude', () => {
      mockReq.body = { message: 'Hello', latitude: 100 };

      const middleware = validate(chatRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid longitude', () => {
      mockReq.body = { message: 'Hello', longitude: 200 };

      const middleware = validate(chatRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('ttsRequestSchema', () => {
    it('should validate valid TTS request', () => {
      mockReq.body = { text: 'Hello world' };

      const middleware = validate(ttsRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.language).toBe('en');
    });

    it('should reject empty text', () => {
      mockReq.body = { text: '' };

      const middleware = validate(ttsRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should accept voice parameter', () => {
      mockReq.body = { text: 'Hello', voice: 'Aoede' };

      const middleware = validate(ttsRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('transcriptionRequestSchema', () => {
    it('should validate valid transcription request', () => {
      mockReq.body = { audio: 'base64audiodata' };

      const middleware = validate(transcriptionRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.language).toBe('en');
      expect(mockReq.body.mimeType).toBe('audio/wav');
    });

    it('should reject empty audio', () => {
      mockReq.body = { audio: '' };

      const middleware = validate(transcriptionRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('titleRequestSchema', () => {
    it('should validate valid title request', () => {
      mockReq.body = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const middleware = validate(titleRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject empty messages array', () => {
      mockReq.body = { messages: [] };

      const middleware = validate(titleRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('locationLookupSchema', () => {
    it('should validate coordinates', () => {
      mockReq.body = { latitude: 9.0, longitude: 38.7 };

      const middleware = validate(locationLookupSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate IP address', () => {
      mockReq.body = { ipAddress: '8.8.8.8' };

      const middleware = validate(locationLookupSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate empty object', () => {
      mockReq.body = {};

      const middleware = validate(locationLookupSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('mcpServersFilterSchema', () => {
    it('should validate with region filter', () => {
      mockReq.body = { region: 'ethiopia' };

      const middleware = validate(mcpServersFilterSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate with category filter', () => {
      mockReq.body = { category: 'weather' };

      const middleware = validate(mcpServersFilterSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate with isActive filter', () => {
      mockReq.body = { isActive: true };

      const middleware = validate(mcpServersFilterSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      mockReq.query = { region: 'ethiopia' };

      const middleware = validateQuery(mcpServersFilterSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error for invalid query', () => {
      mockReq.query = { latitude: 200 };

      const middleware = validateQuery(locationLookupSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          error: 'Invalid query parameters',
        })
      );
    });
  });

  describe('error details', () => {
    it('should include field details in error response', () => {
      mockReq.body = { message: '', latitude: 200 };

      const middleware = validate(chatRequestSchema);
      middleware(mockReq, mockRes, mockNext);

      const errorResponse = mockRes.json.mock.calls[0][0];
      expect(errorResponse.details).toBeDefined();
      expect(Array.isArray(errorResponse.details)).toBe(true);
      expect(errorResponse.details[0]).toHaveProperty('field');
      expect(errorResponse.details[0]).toHaveProperty('message');
    });
  });
});
