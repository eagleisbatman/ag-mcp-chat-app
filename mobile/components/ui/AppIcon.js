import React from 'react';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

// Feather icons - thin, clean aesthetic (like Claude's app)
const FEATHER_ICONS = {
  'plus': 'plus',
  'x': 'x',
  'mic': 'mic',
  'camera': 'camera',
  'image': 'image',
  'clock': 'clock',
  'send': 'send',
  'arrow-up': 'arrow-up',
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  'search': 'search',
  'settings': 'settings',
  'user': 'user',
  'map-pin': 'map-pin',
  'globe': 'globe',
  'check': 'check',
  'check-circle': 'check-circle',
  'x-circle': 'x-circle',
  'alert-circle': 'alert-circle',
  'info': 'info',
  // 'menu': 'menu', // Removed - use MCI version which renders more reliably
  'chevron-down': 'chevron-down',
  'chevron-right': 'chevron-right',
  'volume-2': 'volume-2',
  'stop-circle': 'stop-circle',
  'refresh-cw': 'refresh-cw',
  'message-circle': 'message-circle',
  'trash-2': 'trash-2',
  'edit-2': 'edit-2',
  'file-text': 'file-text',
};

const ION_TO_MCI = {
  'arrow-back': 'arrow-left',
  'arrow-forward': 'arrow-right',
  'chevron-forward': 'chevron-right',
  'chatbubbles': 'chat',
  'chatbubbles-outline': 'chat-outline',
  'extension-puzzle': 'puzzle',
  language: 'translate',
  'information-circle': 'information',
  'information-circle-outline': 'information-outline',
  warning: 'alert',
  'warning-outline': 'alert-outline',
  'alert-circle': 'alert-circle',
  'alert-circle-outline': 'alert-circle-outline',
  'checkmark-circle': 'check-circle',
  'checkmark-circle-outline': 'check-circle-outline',
  checkmark: 'check',
  close: 'close',
  'close-circle': 'close-circle',
  'close-circle-outline': 'close-circle-outline',
  'cloud-offline': 'cloud-off-outline',
  'cloud-offline-outline': 'cloud-off-outline',
  'globe-outline': 'earth',
  location: 'crosshairs-gps',
  refresh: 'refresh',
  mic: 'microphone',
  camera: 'camera',
  image: 'image',
  'arrow-up': 'arrow-up',
  menu: 'menu',
  'chevron-down': 'chevron-down',
  'volume-high': 'volume-high',
  'stop-circle': 'stop-circle',
  leaf: 'sprout',
  'leaf-outline': 'sprout-outline',
  // Diagnosis card icons
  sprout: 'sprout',
  target: 'target',
  flask: 'flask',
  signal: 'signal',
  'zoom-in': 'magnify-plus',
  move: 'cursor-move',
  sun: 'white-balance-sunny',
  'wifi-off': 'wifi-off',
  'alert-triangle': 'alert',
  percent: 'percent',
  seedling: 'sprout',
};

/**
 * Unified icon component supporting multiple icon sets
 * @param {string} name - Icon name
 * @param {number} size - Icon size
 * @param {string} color - Icon color
 * @param {string} prefer - Preferred icon set: 'feather' | 'mci' | 'ion'
 */
export default function AppIcon({ name, size, color, prefer = 'mci', ...rest }) {
  // Check Feather first if preferred or if icon exists in Feather set
  if (prefer === 'feather' || FEATHER_ICONS[name]) {
    const featherName = FEATHER_ICONS[name];
    if (featherName) {
      return <Feather name={featherName} size={size} color={color} {...rest} />;
    }
  }

  // Fall back to MCI mapping
  const mapped = ION_TO_MCI[name];
  if (prefer === 'mci' && mapped) {
    return <MaterialCommunityIcons name={mapped} size={size} color={color} {...rest} />;
  }

  // Default to Ionicons
  return <Ionicons name={name} size={size} color={color} {...rest} />;
}
