/**
 * TypingIndicator - Animated typing dots with shimmer text
 * Shows a polished "thinking" state with pulsing dots and gradient text
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import ShimmerText from './ShimmerText';

/**
 * Single animated dot component
 */
function PulsingDot({ delay, color }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    // Pulsing animation with staggered delay
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) })
        ),
        -1, // Infinite
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: 300, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

/**
 * TypingIndicator component
 * @param {string} text - The thinking/status text to display
 */
export default function TypingIndicator({ text }) {
  const { theme } = useApp();

  return (
    <View style={styles.container}>
      {/* Animated dots with staggered timing */}
      <View style={styles.dotsContainer}>
        <PulsingDot delay={0} color={theme.accent} />
        <PulsingDot delay={150} color={theme.accent} />
        <PulsingDot delay={300} color={theme.accent} />
      </View>

      {/* Shimmer text */}
      <ShimmerText
        text={text}
        style={styles.text}
        fontSize={TYPOGRAPHY.sizes.sm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    marginLeft: SPACING.xs,
    flex: 1,
  },
});
