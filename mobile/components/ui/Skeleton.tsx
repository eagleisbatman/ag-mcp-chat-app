/**
 * Skeleton loading component for placeholder content
 * Creates animated shimmer effect while content is loading
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton placeholder component
 */
function Skeleton({ width = '100%', height = 16, borderRadius = 4, style }: SkeletonProps): JSX.Element {
  const { isDark } = useApp();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const baseColor = isDark ? '#2a2a2a' : '#e0e0e0';
  const highlightColor = isDark ? '#3a3a3a' : '#f5f5f5';

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', highlightColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  lastLineWidth?: DimensionValue;
  style?: ViewStyle;
}

/**
 * Text skeleton - for text placeholders
 */
export function SkeletonText({ lines = 1, lineHeight = 16, spacing = 8, lastLineWidth = '60%', style }: SkeletonTextProps): JSX.Element {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
          style={index > 0 ? { marginTop: spacing } : undefined}
        />
      ))}
    </View>
  );
}

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Circle skeleton - for avatars/icons
 */
export function SkeletonCircle({ size = 40, style }: SkeletonCircleProps): JSX.Element {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

interface SkeletonCardProps {
  height?: number;
  style?: ViewStyle;
}

/**
 * Card skeleton - for card-shaped placeholders
 */
export function SkeletonCard({ height = 120, style }: SkeletonCardProps): JSX.Element {
  return <Skeleton height={height} borderRadius={12} style={style} />;
}

interface SkeletonMessageProps {
  isBot?: boolean;
  style?: ViewStyle;
}

/**
 * Message skeleton - resembles a chat message
 */
export function SkeletonMessage({ isBot = true, style }: SkeletonMessageProps): JSX.Element {
  return (
    <View style={[styles.messageContainer, style]}>
      <Skeleton width={80} height={12} borderRadius={2} style={{ marginBottom: 8 }} />
      <SkeletonText lines={isBot ? 3 : 1} lineHeight={14} spacing={6} lastLineWidth="40%" />
    </View>
  );
}

interface SkeletonWeatherProps {
  style?: ViewStyle;
}

/**
 * Weather widget skeleton
 */
export function SkeletonWeather({ style }: SkeletonWeatherProps): JSX.Element {
  return (
    <View style={[styles.weatherContainer, style]}>
      <View style={styles.weatherRow}>
        <SkeletonCircle size={48} />
        <View style={styles.weatherInfo}>
          <Skeleton width={60} height={24} borderRadius={4} />
          <Skeleton width={100} height={14} borderRadius={2} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

interface SkeletonSessionItemProps {
  style?: ViewStyle;
}

/**
 * Session list item skeleton
 */
export function SkeletonSessionItem({ style }: SkeletonSessionItemProps): JSX.Element {
  return (
    <View style={[styles.sessionItem, style]}>
      <View style={styles.sessionContent}>
        <Skeleton width="70%" height={16} borderRadius={4} />
        <Skeleton width="40%" height={12} borderRadius={2} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  textContainer: {
    flexDirection: 'column',
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  weatherContainer: {
    padding: 16,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherInfo: {
    marginLeft: 12,
  },
  sessionItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionContent: {
    flex: 1,
  },
});

export default Skeleton;
