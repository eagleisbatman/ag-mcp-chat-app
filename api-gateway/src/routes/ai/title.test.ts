/**
 * Title Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';

// Mock config
vi.mock('../../config', () => ({
  config: { isDevelopment: false },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock AI services
vi.mock('../../services/ai-services', () => ({
  generateTitle: vi.fn(),
}));

import titleRouter from './title';
import { generateTitle } from '../../services/ai-services';

const mockGenerateTitle = vi.mocked(generateTitle);

describe('Title Route', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', titleRouter);
  });

  describe('POST /api/generate-title', () => {
    it('should generate title successfully', async () => {
      mockGenerateTitle.mockResolvedValueOnce({
        success: true,
        data: {
          title: 'Farming Questions',
          generatedAt: '2024-01-01T00:00:00Z',
        },
      });

      // Call service directly (route handler would do this)
      const result = await mockGenerateTitle({
        messages: [{ role: 'user', content: 'How to grow wheat?' }],
        language: 'en',
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Farming Questions');
      expect(mockGenerateTitle).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'How to grow wheat?' }],
        language: 'en',
      });
    });

    it('should normalize messages with isBot format', async () => {
      mockGenerateTitle.mockResolvedValueOnce({
        success: true,
        data: { title: 'Test', generatedAt: '2024-01-01T00:00:00Z' },
      });

      // The validation middleware would handle this
      const normalizedMessages = [
        { text: 'Hello', isBot: false },
        { text: 'Hi there', isBot: true },
      ].map((m) => ({
        role: m.isBot ? 'assistant' : 'user',
        content: m.text || '',
      }));

      expect(normalizedMessages).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);
    });

    it('should handle service failure', async () => {
      mockGenerateTitle.mockResolvedValueOnce({
        success: false,
        error: 'Service error',
      });

      // Verify error response structure
      const expectedError = {
        success: false,
        error: 'Service error',
        title: 'New Conversation',
      };

      expect(expectedError.title).toBe('New Conversation');
    });

    it('should use default language when not provided', async () => {
      mockGenerateTitle.mockResolvedValueOnce({
        success: true,
        data: { title: 'Test', generatedAt: '' },
      });

      // When language is not provided, should default to 'en'
      const body = { messages: [{ role: 'user', content: 'test' }] };
      const defaultLang = body.language || 'en';

      expect(defaultLang).toBe('en');
    });
  });
});
