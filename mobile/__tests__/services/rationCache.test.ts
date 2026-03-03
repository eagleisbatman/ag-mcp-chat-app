// Tests for rationCache service
import {
  cacheDietResult,
  getCachedDiet,
  clearDietCache,
} from '../../services/rationCache';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('rationCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleDiet = {
    feeds: [
      { name: 'Maize silage', quantity_kg: 10, cost: 50 },
      { name: 'Dairy meal', quantity_kg: 3, cost: 120 },
    ],
    totalCost: 170,
    currency: 'KES',
  };

  describe('cacheDietResult', () => {
    it('stores diet result with correct key structure', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await cacheDietResult('user-123', 'cow-456', sampleDiet);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(key).toBe('ration_diet_cache:user-123:cow-456');
      const parsed = JSON.parse(value);
      expect(parsed.feeds).toEqual(sampleDiet.feeds);
      expect(parsed.totalCost).toBe(170);
      expect(parsed.currency).toBe('KES');
      expect(parsed.cachedAt).toBeDefined();
      expect(typeof parsed.cachedAt).toBe('number');
    });

    it('silently handles AsyncStorage write errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      // Should not throw
      await expect(
        cacheDietResult('user-123', 'cow-456', sampleDiet)
      ).resolves.toBeUndefined();
    });

    it('uses different keys for different cows', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await cacheDietResult('user-1', 'cow-A', sampleDiet);
      await cacheDietResult('user-1', 'cow-B', sampleDiet);

      const key1 = (AsyncStorage.setItem as jest.Mock).mock.calls[0][0];
      const key2 = (AsyncStorage.setItem as jest.Mock).mock.calls[1][0];
      expect(key1).toBe('ration_diet_cache:user-1:cow-A');
      expect(key2).toBe('ration_diet_cache:user-1:cow-B');
      expect(key1).not.toBe(key2);
    });

    it('uses different keys for different users', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await cacheDietResult('user-1', 'cow-A', sampleDiet);
      await cacheDietResult('user-2', 'cow-A', sampleDiet);

      const key1 = (AsyncStorage.setItem as jest.Mock).mock.calls[0][0];
      const key2 = (AsyncStorage.setItem as jest.Mock).mock.calls[1][0];
      expect(key1).not.toBe(key2);
    });
  });

  describe('getCachedDiet', () => {
    it('returns null when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getCachedDiet('user-123', 'cow-456');

      expect(result).toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('ration_diet_cache:user-123:cow-456');
    });

    it('returns cached diet with isCached flag', async () => {
      const cached = { ...sampleDiet, cachedAt: Date.now() };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cached));

      const result = await getCachedDiet('user-123', 'cow-456');

      expect(result).not.toBeNull();
      expect(result!.isCached).toBe(true);
      expect(result!.feeds).toEqual(sampleDiet.feeds);
      expect(result!.totalCost).toBe(170);
      expect(result!.currency).toBe('KES');
    });

    it('returns null and removes expired cache (>7 days)', async () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const cached = { ...sampleDiet, cachedAt: eightDaysAgo };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cached));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await getCachedDiet('user-123', 'cow-456');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('ration_diet_cache:user-123:cow-456');
    });

    it('returns valid cache that is within TTL (6 days old)', async () => {
      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
      const cached = { ...sampleDiet, cachedAt: sixDaysAgo };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cached));

      const result = await getCachedDiet('user-123', 'cow-456');

      expect(result).not.toBeNull();
      expect(result!.isCached).toBe(true);
    });

    it('returns null on invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupt-data');

      const result = await getCachedDiet('user-123', 'cow-456');

      expect(result).toBeNull();
    });

    it('returns null on AsyncStorage read error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getCachedDiet('user-123', 'cow-456');

      expect(result).toBeNull();
    });
  });

  describe('clearDietCache', () => {
    it('removes all cache entries for a specific user', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'ration_diet_cache:user-123:cow-1',
        'ration_diet_cache:user-123:cow-2',
        'ration_diet_cache:user-456:cow-1',
        'some_other_key',
      ]);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await clearDietCache('user-123');

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'ration_diet_cache:user-123:cow-1',
        'ration_diet_cache:user-123:cow-2',
      ]);
    });

    it('does not call multiRemove when no matching keys', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'ration_diet_cache:user-456:cow-1',
        'some_other_key',
      ]);

      await clearDietCache('user-123');

      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    it('silently handles errors', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(clearDietCache('user-123')).resolves.toBeUndefined();
    });

    it('handles empty storage', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      await clearDietCache('user-123');

      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });
  });
});
