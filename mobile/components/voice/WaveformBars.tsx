import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../constants/themes';

interface WaveformBarsProps {
  level: number;
  isSpeaking: boolean;
  accentColor: string;
  mutedColor: string;
  barCount?: number;
}

export default function WaveformBars({
  level,
  isSpeaking,
  accentColor,
  mutedColor,
  barCount = 24,
}: WaveformBarsProps): JSX.Element {
  const weights = useMemo(() => {
    return Array.from({ length: barCount }, (_, index) => {
      const phase = index / Math.max(1, barCount - 1);
      return 0.35 + 0.65 * Math.sin(phase * Math.PI);
    });
  }, [barCount]);

  const clampedLevel = Math.max(0, Math.min(1, isSpeaking ? level : 0));
  const barColor = isSpeaking ? accentColor : mutedColor;

  return (
    <View style={styles.container}>
      {weights.map((weight, index) => {
        const height = 4 + clampedLevel * 38 * weight;
        return (
          <View
            key={`wave-bar-${index}`}
            style={[
              styles.bar,
              { height, backgroundColor: barColor, opacity: isSpeaking ? 0.9 : 0.2 },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: 60,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
