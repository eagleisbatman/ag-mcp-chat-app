import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
};

export default function AppIcon({ name, size, color, prefer = 'mci', ...rest }) {
  const mapped = ION_TO_MCI[name];

  if (prefer === 'mci' && mapped) {
    return <MaterialCommunityIcons name={mapped} size={size} color={color} {...rest} />;
  }

  return <Ionicons name={name} size={size} color={color} {...rest} />;
}
