/**
 * Geocoding Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocode, lookupIpLocation, lookupLocation } from './geocoding';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Geocoding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reverseGeocode', () => {
    it('should return location data from Nominatim', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          address: {
            city: 'Addis Ababa',
            state: 'Addis Ababa',
            country: 'Ethiopia',
          },
        }),
      });

      const result = await reverseGeocode(9.0, 38.7);

      expect(result).not.toBeNull();
      expect(result?.city).toBe('Addis Ababa');
      expect(result?.country).toBe('Ethiopia');
    });

    it('should fallback to town when city not present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          address: {
            town: 'Hawassa',
            state: 'SNNPR',
            country: 'Ethiopia',
          },
        }),
      });

      const result = await reverseGeocode(7.0, 38.5);

      expect(result?.city).toBe('Hawassa');
    });

    it('should return null on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await reverseGeocode(9.0, 38.7);
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await reverseGeocode(9.0, 38.7);
      expect(result).toBeNull();
    });

    it('should call Nominatim with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: {} }),
      });

      await reverseGeocode(9.0, 38.7);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('lat=9'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
    });

    it('should return null on Nominatim error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          error: 'Unable to geocode',
        }),
      });

      const result = await reverseGeocode(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('lookupIpLocation', () => {
    it('should return location data from IP-API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          lat: 9.0,
          lon: 38.7,
          city: 'Addis Ababa',
          regionName: 'Addis Ababa',
          country: 'Ethiopia',
          countryCode: 'ET',
        }),
      });

      const result = await lookupIpLocation('41.186.0.1');

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(9.0);
      expect(result?.lon).toBe(38.7);
      expect(result?.city).toBe('Addis Ababa');
      expect(result?.country).toBe('Ethiopia');
    });

    it('should return null for local IP addresses', async () => {
      const result = await lookupIpLocation('127.0.0.1');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null for private IP addresses', async () => {
      const result = await lookupIpLocation('192.168.1.1');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null on failed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'fail',
          message: 'reserved range',
        }),
      });

      const result = await lookupIpLocation('10.0.0.1');
      expect(result).toBeNull();
    });

    it('should return null on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await lookupIpLocation('8.8.8.8');
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await lookupIpLocation('8.8.8.8');
      expect(result).toBeNull();
    });

    it('should call IP-API with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'fail' }),
      });

      await lookupIpLocation('8.8.8.8');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ip-api.com/json/8.8.8.8'),
        expect.any(Object)
      );
    });
  });

  describe('lookupLocation', () => {
    it('should use coordinates when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          address: {
            city: 'Nairobi',
            state: 'Nairobi',
            country: 'Kenya',
          },
        }),
      });

      const result = await lookupLocation(-1.3, 36.8);

      expect(result.success).toBe(true);
      expect(result.source).toBe('coordinates');
      expect(result.level5City).toBe('Nairobi');
    });

    it('should fallback to IP when no coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          city: 'Nairobi',
          country: 'Kenya',
          countryCode: 'KE',
          regionName: 'Nairobi',
          lat: -1.3,
          lon: 36.8,
        }),
      });

      const result = await lookupLocation(undefined, undefined, '41.186.0.1');

      expect(result.success).toBe(true);
      expect(result.source).toBe('ip');
    });

    it('should return failure when no location found', async () => {
      const result = await lookupLocation();

      expect(result.success).toBe(false);
      expect(result.source).toBe('none');
    });
  });
});
