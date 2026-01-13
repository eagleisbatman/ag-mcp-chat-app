/**
 * Device information utility
 * Uses expo-device, expo-application, and expo-crypto for device identification
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { DeviceInfo } from '../types';
import { error as logError } from './logger';

const DEVICE_ID_KEY = '@ag_mcp_device_id';

type DeviceType = 'phone' | 'tablet' | 'desktop' | 'tv' | 'unknown';

/**
 * Generate a unique device ID
 * Uses native device identifiers when available, falls back to cryptographically secure UUID
 */
async function generateDeviceId(): Promise<string> {
  // Try to get a native identifier
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId();
    if (androidId) return `android_${androidId}`;
  }

  if (Platform.OS === 'ios') {
    const iosId = await Application.getIosIdForVendorAsync();
    if (iosId) return `ios_${iosId}`;
  }

  // Fallback: generate a cryptographically secure UUID using expo-crypto
  const uuid = Crypto.randomUUID();
  return `device_${uuid}`;
}

/**
 * Get or create a persistent device ID
 * @returns Device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Check if we already have a stored device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate and store a new one
      deviceId = await generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    logError('Error getting device ID:', error);
    // Return a temporary ID if storage fails
    return `temp_${Date.now()}`;
  }
}

/**
 * Get device type (phone/tablet/desktop/tv)
 */
function getDeviceType(): DeviceType {
  const deviceType = Device.deviceType;
  switch (deviceType) {
    case Device.DeviceType.PHONE:
      return 'phone';
    case Device.DeviceType.TABLET:
      return 'tablet';
    case Device.DeviceType.DESKTOP:
      return 'desktop';
    case Device.DeviceType.TV:
      return 'tv';
    default:
      return 'unknown';
  }
}

/**
 * Get comprehensive device information
 * @returns Device info object
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = await getDeviceId();

  return {
    deviceId,
    platform: Platform.OS as 'ios' | 'android' | 'web',
    osVersion: Device.osVersion || Platform.Version?.toString() || undefined,
    appVersion: Application.nativeApplicationVersion || '1.0.0',
    modelName: Device.modelName || Device.modelId || undefined,
    brand: Device.brand || undefined,
    deviceType: getDeviceType(),
  };
}

/**
 * Get extended device information (includes all available fields)
 */
export async function getExtendedDeviceInfo(): Promise<{
  deviceId: string;
  deviceName: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceOs: string;
  deviceOsVersion: string;
  appVersion: string;
  appBuildNumber: string;
  isDevice: boolean;
  deviceType: DeviceType;
}> {
  const deviceId = await getDeviceId();

  return {
    deviceId,
    deviceName: Device.deviceName || 'Unknown Device',
    deviceBrand: Device.brand || 'Unknown',
    deviceModel: Device.modelName || Device.modelId || 'Unknown',
    deviceOs: Platform.OS,
    deviceOsVersion: Device.osVersion || Platform.Version?.toString() || 'Unknown',
    appVersion: Application.nativeApplicationVersion || '1.0.0',
    appBuildNumber: Application.nativeBuildVersion || '1',
    isDevice: Device.isDevice,
    deviceType: getDeviceType(),
  };
}

/**
 * Check if device info is complete
 */
export function isDeviceInfoComplete(info: Partial<DeviceInfo> | null | undefined): boolean {
  return !!(info?.deviceId && info?.platform);
}

export default {
  getDeviceId,
  getDeviceInfo,
  getExtendedDeviceInfo,
  isDeviceInfoComplete,
};
