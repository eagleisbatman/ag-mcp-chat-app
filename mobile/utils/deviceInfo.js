// Device information utility
// Uses expo-device and expo-application for device identification

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@ag_mcp_device_id';

/**
 * Generate a unique device ID
 * Uses native device identifiers when available, falls back to UUID
 */
async function generateDeviceId() {
  // Try to get a native identifier
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId();
    if (androidId) return `android_${androidId}`;
  }
  
  if (Platform.OS === 'ios') {
    const iosId = await Application.getIosIdForVendorAsync();
    if (iosId) return `ios_${iosId}`;
  }
  
  // Fallback: generate a UUID-like string
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `device_${timestamp}_${random}`;
}

/**
 * Get or create a persistent device ID
 * @returns {Promise<string>} Device ID
 */
export async function getDeviceId() {
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
    console.error('Error getting device ID:', error);
    // Return a temporary ID if storage fails
    return `temp_${Date.now()}`;
  }
}

/**
 * Get comprehensive device information
 * @returns {Promise<object>} Device info object
 */
export async function getDeviceInfo() {
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
 * Get device type (phone/tablet/desktop/tv)
 */
function getDeviceType() {
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
 * Check if device info is complete
 */
export function isDeviceInfoComplete(info) {
  return !!(info?.deviceId && info?.deviceOs);
}

