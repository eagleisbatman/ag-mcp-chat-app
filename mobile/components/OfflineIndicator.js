import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

/**
 * OfflineIndicator - Shows a banner when device is offline
 * Automatically subscribes to network state changes
 */
export default function OfflineIndicator() {
  const { theme } = useApp();
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      
      // Animate in/out
      Animated.spring(slideAnim, {
        toValue: offline ? 0 : -50,
        useNativeDriver: true,
        friction: 8,
      }).start();
    });

    return () => unsubscribe();
  }, [slideAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.warning,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Ionicons name="cloud-offline" size={18} color="#FFFFFF" />
      <Text style={styles.text}>No internet connection</Text>
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

