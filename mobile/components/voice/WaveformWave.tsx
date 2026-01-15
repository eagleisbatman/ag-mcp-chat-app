import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

interface WaveformWaveProps {
  level: number;
  isSpeaking: boolean;
  accentColor: string;
  mutedColor: string;
  pointCount?: number;
}

export default function WaveformWave({
  level,
  isSpeaking,
  accentColor,
  mutedColor,
  pointCount = 48,
}: WaveformWaveProps): JSX.Element {
  const [tick, setTick] = useState(0);
  const smoothLevelRef = useRef(0);

  useEffect(() => {
    if (!isSpeaking) return;
    const interval = setInterval(() => setTick(prev => prev + 1), 60);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const weights = useMemo(() => {
    return Array.from({ length: pointCount }, (_, index) => {
      const phase = index / Math.max(1, pointCount - 1);
      return 0.4 + 0.6 * Math.sin(phase * Math.PI);
    });
  }, [pointCount]);

  const targetLevel = Math.max(0, Math.min(1, isSpeaking ? level : 0));
  smoothLevelRef.current = smoothLevelRef.current * 0.65 + targetLevel * 0.35;
  const amplitude = 6 + smoothLevelRef.current * 22;
  const color = isSpeaking ? accentColor : mutedColor;

  return (
    <View style={styles.container}>
      {weights.map((weight, index) => {
        const phase = (index / Math.max(1, pointCount - 1)) * Math.PI * 2;
        const wiggle = Math.sin(tick * 0.45 + phase);
        const y = wiggle * amplitude * weight;
        return (
          <View
            key={`wave-point-${index}`}
            style={[
              styles.point,
              {
                backgroundColor: color,
                opacity: isSpeaking ? 0.9 : 0.15,
                transform: [{ translateY: y }],
              },
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
    height: 72,
    gap: 2,
  },
  point: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
