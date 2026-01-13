// Tests for deviceInfo utility
import { getDeviceId, getDeviceInfo, getDevicePlatform, getAppVersion } from '../../utils/deviceInfo';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock expo modules
jest.mock('expo-device', () => ({
  brand: 'TestBrand',
  manufacturer: 'TestManufacturer',
  modelName: 'TestModel',
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234-5678-90ab-cdef'),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('deviceInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceId', () => {
    it('returns cached device ID if available', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('cached-device-id-123');

      const deviceId = await getDeviceId();

      expect(deviceId).toBe('cached-device-id-123');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('device_id');
    });

    it('generates and stores new device ID if not cached', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const deviceId = await getDeviceId();

      expect(deviceId).toBeDefined();
      expect(deviceId.length).toBeGreaterThan(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('device_id', expect.any(String));
    });
  });

  describe('getDeviceInfo', () => {
    it('returns complete device information', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-device-id');

      const info = await getDeviceInfo();

      expect(info).toHaveProperty('deviceId');
      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('appVersion');
    });
  });

  describe('getDevicePlatform', () => {
    it('returns platform information', () => {
      const platform = getDevicePlatform();

      expect(platform).toBeDefined();
      expect(typeof platform).toBe('string');
    });
  });

  describe('getAppVersion', () => {
    it('returns app version string', () => {
      const version = getAppVersion();

      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });
  });
});
