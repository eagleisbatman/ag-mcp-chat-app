/**
 * AI Services Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendChatRequest, generateTts, transcribeAudio, generateTitle } from './ai-services';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AI Services Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendChatRequest', () => {
    it('should send chat request and return response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          response: 'Here is the answer',
          followUpQuestions: ['Question 1?'],
        }),
      });

      const result = await sendChatRequest({
        message: 'What fertilizer for wheat?',
        language: 'en',
      });

      expect(result.success).toBe(true);
      expect(result.data?.response).toBe('Here is the answer');
    });

    it('should include API key in headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await sendChatRequest({ message: 'test', language: 'en' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': expect.any(String),
          }),
        })
      );
    });

    it('should return error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      const result = await sendChatRequest({ message: 'test', language: 'en' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendChatRequest({ message: 'test', language: 'en' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('generateTts', () => {
    it('should send TTS request and return audio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          audioBase64: 'base64audio',
          duration: 5,
        }),
      });

      const result = await generateTts({
        text: 'Hello world',
        language: 'en',
      });

      expect(result.success).toBe(true);
      expect(result.data?.audioBase64).toBe('base64audio');
    });

    it('should call TTS endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await generateTts({ text: 'test', language: 'en' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts'),
        expect.any(Object)
      );
    });
  });

  describe('transcribeAudio', () => {
    it('should send transcription request and return text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          text: 'Transcribed text',
        }),
      });

      const result = await transcribeAudio({
        audio: 'base64audio',
        language: 'en',
      });

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe('Transcribed text');
    });

    it('should call transcribe endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await transcribeAudio({ audio: 'test', language: 'en' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transcribe'),
        expect.any(Object)
      );
    });
  });

  describe('generateTitle', () => {
    it('should send title request and return title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          title: 'Wheat Farming Help',
          generatedAt: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await generateTitle({
        messages: [{ role: 'user', content: 'Help with wheat' }],
        language: 'en',
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Wheat Farming Help');
    });

    it('should call title endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: 'Test' }),
      });

      await generateTitle({ messages: [], language: 'en' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate-title'),
        expect.any(Object)
      );
    });
  });
});
