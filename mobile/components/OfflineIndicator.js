import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import AppIcon from './ui/AppIcon';
import { TYPOGRAPHY } from '../constants/themes';
import { t } from '../constants/strings';

/**
 * OfflineIndicator - Shows a banner when device is offline
 * Automatically subscribes to network state changes
 */
export default function OfflineIndicator() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    // Settle time: wait a moment before starting to show the offline indicator
    // This avoids the 'yellow flicker' during initial app launch probe
    let isSettled = false;
    const settleTimeout = setTimeout(() => {
      isSettled = true;
    }, 1500);

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      // FIX: state.isConnected and state.isInternetReachable can be 'null' during initial probe.
      // We only want to show the offline banner if they are EXPLICITLY false.
      const offline = state.isConnected === false || state.isInternetReachable === false;
      
      // Only set offline if we've settled OR it's a transition from online to offline
      if (isSettled || offline) {
        setIsOffline(offline);
        
        // Animate in/out
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
