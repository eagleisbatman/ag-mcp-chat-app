import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import AppIcon from './ui/AppIcon';
import { TYPOGRAPHY } from '../constants/themes';
import { t } from '../constants/strings';

/**
 * OfflineIndicator - Shows a banner when device is offline
 * Automatically subscribes to network state changes
 */
export default function OfflineIndicator(): JSX.Element | null {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(-50));

  useEffect(() => {
    // Settle time: wait a moment before starting to show the offline indicator
    let isSettled = false;
    const settleTimeout = setTimeout(() => {
      isSettled = true;
    }, 2000);

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = state.isConnected === false;

      if (isSettled || !offline) {
        setIsOffline(offline);

        Animated.spring(slideAnim, {
          toValue: offline ? 0 : -50,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(settleTimeout);
    };
  }, [slideAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.warning,
          paddingTop: Math.max(insets.top, 8),
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <AppIcon name="cloud-offline" size={18} color="#000000" />
      <Text style={styles.text}>{t('system.offline')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
  },
  text: {
    color: '#000000',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
