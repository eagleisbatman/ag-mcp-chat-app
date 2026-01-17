/**
 * Traveling Bars Waveform Visualizer
 *
 * Creates a scrolling timeline effect where:
 * - New bars enter from the right based on current audio level
 * - Bars travel/scroll to the left over time
 * - Bar height represents voice intensity at that moment
 * - Creates a visual history of recent audio levels
 * - Bars fall flat when user is not speaking
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';

interface WaveformTravelingBarsProps {
  /** Current audio level (0-1) */
  level: number;
  /** Whether user is currently speaking */
  isSpeaking: boolean;
  /** Color when speaking */
  accentColor: string;
  /** Color when silent */
  mutedColor: string;
  /** Number of bars to display */
  barCount?: number;
  /** Update interval in ms (lower = smoother but more CPU) */
  updateInterval?: number;
  /** Minimum bar height when silent */
  minBarHeight?: number;
  /** Maximum bar height when speaking loudly */
  maxBarHeight?: number;
}

/** Internal bar data with height and animation state */
interface BarData {
  height: number;
  opacity: number;
}

export default function WaveformTravelingBars({
  level,
  isSpeaking,
  accentColor,
  mutedColor,
  barCount = 32,
  updateInterval = 50,
  minBarHeight = 4,
  maxBarHeight = 56,
}: WaveformTravelingBarsProps): JSX.Element {
  // Store bar heights as they travel across the timeline
  const [bars, setBars] = useState<BarData[]>(() =>
    Array(barCount).fill({ height: minBarHeight, opacity: 0.2 })
  );

  // Smooth the audio level for more natural visualization
  const smoothLevelRef = useRef(0);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Color based on speaking state
  const barColor = isSpeaking ? accentColor : mutedColor;

  // Calculate bar height from audio level with some randomness for visual interest
  const calculateBarHeight = useCallback(
    (audioLevel: number, addVariation: boolean = true): number => {
      const normalizedLevel = Math.max(0, Math.min(1, audioLevel));

      // Add slight random variation for more organic look when speaking
      const variation = addVariation && normalizedLevel > 0.1 ? (Math.random() - 0.5) * 0.15 : 0;
      const adjustedLevel = Math.max(0, Math.min(1, normalizedLevel + variation));

      // Map level to height range with easing for more dramatic effect
      const easedLevel = Math.pow(adjustedLevel, 0.7); // Slight easing
      return minBarHeight + easedLevel * (maxBarHeight - minBarHeight);
    },
    [minBarHeight, maxBarHeight]
  );

  // Main animation loop - shifts bars left and adds new bar on right
  useEffect(() => {
    const tick = () => {
      // Smooth the incoming level
      const targetLevel = isSpeaking ? level : 0;
      smoothLevelRef.current = smoothLevelRef.current * 0.5 + targetLevel * 0.5;

      setBars((prevBars) => {
        // Create new array by shifting everything left (removing first bar)
        const newBars = [...prevBars.slice(1)];

        // Add new bar on the right based on current smoothed level
        const newHeight = calculateBarHeight(smoothLevelRef.current, isSpeaking);
        const newOpacity = isSpeaking ? 0.85 + Math.random() * 0.15 : 0.2;

        newBars.push({ height: newHeight, opacity: newOpacity });

        return newBars;
      });
    };

    // Start animation loop
    animationRef.current = setInterval(tick, updateInterval);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [level, isSpeaking, calculateBarHeight, updateInterval]);

  // Fade all bars to minimum when speaking state changes to silent
  useEffect(() => {
    if (!isSpeaking) {
      // Gradually fade bars to minimum over several ticks
      const fadeInterval = setInterval(() => {
        setBars((prevBars) =>
          prevBars.map((bar) => ({
            height: bar.height * 0.85 + minBarHeight * 0.15,
            opacity: bar.opacity * 0.9 + 0.2 * 0.1,
          }))
        );
      }, 30);

      // Stop fading after a short duration
      const timeout = setTimeout(() => clearInterval(fadeInterval), 300);

      return () => {
        clearInterval(fadeInterval);
        clearTimeout(timeout);
      };
    }
  }, [isSpeaking, minBarHeight]);

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {bars.map((bar, index) => (
          <View
            key={`traveling-bar-${index}`}
            style={[
              styles.bar,
              {
                height: bar.height,
                backgroundColor: barColor,
                opacity: bar.opacity,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
