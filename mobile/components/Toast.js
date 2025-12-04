import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';

/**
 * Toast notification component
 * Displays at top of screen, auto-dismisses
 */
export default function Toast({ 
  visible, 
  message, 
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  duration = 3000,
  onDismiss,
  action = null, // { label: string, onPress: () => void }
}) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Haptic feedback based on type
      if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, duration, type]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', bg: theme.success, bgLight: theme.successLight };
      case 'error':
        return { icon: 'alert-circle', bg: theme.error, bgLight: theme.errorLight };
      case 'warning':
        return { icon: 'warning', bg: theme.warning, bgLight: theme.warningLight };
      default:
        return { icon: 'information-circle', bg: theme.accent, bgLight: theme.accentLight };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: config.bgLight,
          borderLeftColor: config.bg,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.content} 
        onPress={dismiss}
        activeOpacity={0.9}
      >
        <Ionicons name={config.icon} size={22} color={config.bg} />
        <Text style={[styles.message, { color: theme.text }]} numberOfLines={3}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity 
            onPress={() => { action.onPress(); dismiss(); }}
            style={[styles.actionButton, { backgroundColor: config.bg }]}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

