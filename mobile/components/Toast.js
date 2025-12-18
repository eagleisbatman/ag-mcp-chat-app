import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Platform, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { ELEVATION } from '../constants/elevation';
import AppIcon from './ui/AppIcon';
import { TYPOGRAPHY } from '../constants/themes';
import { t } from '../constants/strings';

/**
 * Toast notification component
 * Displays near bottom of screen, auto-dismisses
 */
export default function Toast({
  toastId,
  visible,
  message,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  duration = 3000,
  onDismiss,
  action = null, // { label: string, onPress: () => void }
  queueCount = 0,
  dismissToken = 0,
}) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

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
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 140,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (toastId != null) onDismiss?.(toastId);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!visible) return false;
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);
        return absY > 6 && absY > absX;
      },
      onPanResponderMove: (_, gesture) => {
        const clamped = Math.max(0, Math.min(80, gesture.dy));
        dragY.setValue(clamped);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 40 || gesture.vy > 1.2) {
          dismiss();
          return;
        }
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(100);
      dragY.setValue(0);
      opacity.setValue(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId, visible, duration, type]);

  useEffect(() => {
    if (visible && dismissToken > 0) {
      dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissToken]);

  // Early return AFTER all hooks
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 12,
          backgroundColor: config.bgLight,
          borderLeftColor: config.bg,
          transform: [{ translateY: Animated.add(translateY, dragY) }],
          opacity,
        },
      ]}
      accessibilityRole="alert"
      {...panResponder.panHandlers}
    >
      <View style={styles.content}>
        <Pressable
          style={styles.body}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.dismissNotification')}
          android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
        >
          <AppIcon name={config.icon} size={22} color={config.bg} />
          <Text
            style={[styles.message, { color: theme.text }]}
            numberOfLines={3}
            accessibilityLiveRegion="polite"
          >
            {message}
          </Text>
        </Pressable>
        {action && (
          <Pressable
            onPress={() => { action.onPress(); dismiss(); }}
            style={[styles.actionButton, { backgroundColor: config.bg }]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.12)' } : undefined}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        )}
        {queueCount > 0 ? (
          <Text style={[styles.queueCount, { color: theme.textMuted }]} accessibilityLabel={t('a11y.moreNotifications', { count: queueCount })}>
            +{queueCount}
          </Text>
        ) : null}
        <Pressable
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.dismiss')}
          android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: true } : undefined}
        >
          <AppIcon name="close" size={20} color={theme.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
    ...ELEVATION.md,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  queueCount: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
