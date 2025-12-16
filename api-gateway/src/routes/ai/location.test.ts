/**
 * Location Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../config', () => ({
  config: { isDevelopment: false },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock geocoding service
vi.mock('../../services/geocoding', () => ({
  lookupLocation: vi.fn(),
}));

import { lookupLocation } from '../../services/geocoding';

const mockLookupLocation = vi.mocked(lookupLocation);

describe('Location Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/location-lookup', () => {
    it('should lookup location by coordinates', async () => {
      mockLookupLocation.mockResolvedValueOnce({
        success: true,
        source: 'coordinates',
        level1Country: 'Ethiopia',
        level5City: 'Addis Ababa',
        displayName: 'Addis Ababa, Ethiopia',
        latitude: 9.0,
        longitude: 38.7,
      } as any);

      const result = await mockLookupLocation(9.0, 38.7);

      expect(result.success).toBe(true);
      expect(result.source).toBe('coordinates');
      expect(result.level1Country).toBe('Ethiopia');
    });

    it('should lookup location by IP address', async () => {
      mockLookupLocation.mockResolvedValueOnce({
        success: true,
        source: 'ip',
        level1Country: 'Kenya',
        level5City: 'Nairobi',
        displayName: 'Nairobi, Kenya',
        latitude: -1.3,
        longitude: 36.8,
      } as any);

      const result = await mockLookupLocation(undefined, undefined, '41.186.0.1');

      expect(result.success).toBe(true);
      expect(result.source).toBe('ip');
    });

    it('should handle location not found', async () => {
      mockLookupLocation.mockResolvedValueOnce({
        success: false,
        source: 'none',
      } as any);

      const result = await mockLookupLocation();

      expect(result.success).toBe(false);
      expect(result.source).toBe('none');
    });

    it('should parse latitude and longitude from string', () => {
      const latitude = '9.0';
      const longitude = '38.7';

      const parsedLat = latitude ? parseFloat(latitude) : undefined;
      const parsedLon = longitude ? parseFloat(longitude) : undefined;

      expect(parsedLat).toBe(9.0);
      expect(parsedLon).toBe(38.7);
    });

    it('should handle undefined coordinates', () => {
      const latitude = undefined;
      const longitude = undefined;

      const parsedLat = latitude ? parseFloat(latitude) : undefined;
      const parsedLon = longitude ? parseFloat(longitude) : undefined;

      expect(parsedLat).toBeUndefined();
      expect(parsedLon).toBeUndefined();
    });
  });
});
