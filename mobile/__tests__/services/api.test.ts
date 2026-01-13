// Tests for API service
import { sendChatMessage, getActiveMcpServers, detectRegions } from '../../services/api';

// Mock fetchWithTimeout
jest.mock('../../utils/apiHelpers', () => ({
  fetchWithTimeout: jest.fn(),
  parseErrorMessage: jest.fn((err) => err?.message || 'Something went wrong'),
  isNetworkError: jest.fn(() => false),
  isServerError: jest.fn(() => false),
}));

// Mock deviceInfo
jest.mock('../../utils/deviceInfo', () => ({
  getDeviceId: jest.fn(() => Promise.resolve('test-device-id-123')),
}));

// Mock config
jest.mock('../../utils/config', () => ({
  API_BASE_URL: 'https://api.example.com',
  API_KEY: 'test-api-key',
  TIMEOUTS: { CHAT: 60000, DEFAULT: 30000 },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { fetchWithTimeout } from '../../utils/apiHelpers';

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendChatMessage', () => {
    it('sends a chat message and returns response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          response: 'Hello! How can I help you?',
          region: 'east_africa',
          language: 'en',
        }),
      };
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await sendChatMessage({
        message: 'Hello',
        latitude: 9.03,
        longitude: 38.74,
        language: 'en',
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('Hello! How can I help you?');
    });

    it('handles API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await sendChatMessage({
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles network errors', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('Network request failed'));

      const result = await sendChatMessage({
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network');
    });
  });

  describe('getActiveMcpServers', () => {
    it('fetches active MCP servers', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          global: [{ id: '1', name: 'Weather', slug: 'weather' }],
          regional: [{ id: '2', name: 'SSFR', slug: 'ssfr' }],
          totalActive: 2,
        }),
      };
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getActiveMcpServers({ lat: 9.03, lon: 38.74 });

      expect(result.success).toBe(true);
      expect(result.global).toHaveLength(1);
      expect(result.regional).toHaveLength(1);
      expect(result.totalActive).toBe(2);
    });

    it('returns empty arrays on error', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await getActiveMcpServers();

      expect(result.success).toBe(false);
      expect(result.global).toEqual([]);
      expect(result.regional).toEqual([]);
    });
  });

  describe('detectRegions', () => {
    it('detects regions for coordinates', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          regions: ['ethiopia', 'east_africa', 'africa'],
        }),
      };
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectRegions(9.03, 38.74);

      expect(result.success).toBe(true);
      expect(result.regions).toContain('ethiopia');
    });
  });
});
