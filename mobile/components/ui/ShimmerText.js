/**
 * ShimmerText - Animated text with a wave/shimmer gradient effect
 * Used for loading states like "Thinking..." with a polished look
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { TYPOGRAPHY } from '../../constants/themes';

/**
 * ShimmerText component
 * @param {string} text - The text to display
 * @param {object} style - Additional text styles
 * @param {number} fontSize - Font size (default: TYPOGRAPHY.sizes.sm)
 */
export default function ShimmerText({ text, style, fontSize = TYPOGRAPHY.sizes.sm }) {
  const { theme, isDark } = useApp();
  const shimmerProgress = useSharedValue(0);

  // Start the shimmer animation on mount
  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, []);

  // Animated style for the shimmer overlay
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-100, 100]
    );

    return {
      transform: [{ translateX }],
    };
  });

  // Colors for shimmer based on theme
  const shimmerColors = isDark
    ? ['transparent', 'rgba(48, 209, 88, 0.3)', 'transparent'] // Green glow for dark
    : ['transparent', 'rgba(27, 138, 46, 0.25)', 'transparent']; // Green tint for light

  const baseColor = isDark ? theme.textSecondary : theme.textMuted;

  return (
    <View style={styles.container}>
      {/* Base text layer */}
      <Text
        style={[
          styles.text,
          { color: baseColor, fontSize },
          style,
        ]}
        numberOfLines={2}
      >
        {text}
      </Text>

      {/* Shimmer gradient overlay */}
      <View style={[styles.shimmerContainer, StyleSheet.absoluteFill]} pointerEvents="none">
        <Animated.View style={[styles.shimmerGradient, shimmerStyle]}>
          <LinearGradient
            colors={shimmerColors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          />
        </Animated.View>
      </View>

      {/* Overlay text that pulses for extra effect */}
      <Animated.Text
        style={[
          styles.text,
          styles.overlayText,
          { color: isDark ? theme.accent : theme.accentDark, fontSize },
          style,
          useAnimatedStyle(() => ({
            opacity: interpolate(
              shimmerProgress.value,
              [0, 0.3, 0.7, 1],
              [0.3, 0.6, 0.6, 0.3]
            ),
          })),
        ]}
        numberOfLines={2}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  text: {
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  overlayText: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: '200%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
});
