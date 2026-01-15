import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  barCount = 28,
}: WaveformBarsProps): JSX.Element {
  const [tick, setTick] = useState(0);
  const smoothLevelRef = useRef(0);

  useEffect(() => {
    if (!isSpeaking) return;
    const interval = setInterval(() => setTick(prev => prev + 1), 80);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const weights = useMemo(() => {
    return Array.from({ length: barCount }, (_, index) => {
      const phase = index / Math.max(1, barCount - 1);
      return 0.35 + 0.65 * Math.sin(phase * Math.PI);
    });
  }, [barCount]);

  const targetLevel = Math.max(0, Math.min(1, isSpeaking ? level : 0));
  smoothLevelRef.current = smoothLevelRef.current * 0.6 + targetLevel * 0.4;
  const clampedLevel = smoothLevelRef.current;
  const barColor = isSpeaking ? accentColor : mutedColor;

  return (
    <View style={styles.container}>
      {weights.map((weight, index) => {
        const phase = (index / Math.max(1, barCount - 1)) * Math.PI * 2;
        const wiggle = 0.75 + 0.25 * Math.sin(tick * 0.35 + phase);
        const height = 6 + clampedLevel * 44 * weight * wiggle;
        return (
          <View
            key={`wave-bar-${index}`}
            style={[
              styles.bar,
              { height, backgroundColor: barColor, opacity: isSpeaking ? 0.9 : 0.15 },
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
    gap: 4,
    height: 70,
  },
  bar: {
    width: 4,
    borderRadius: 3,
  },
});
