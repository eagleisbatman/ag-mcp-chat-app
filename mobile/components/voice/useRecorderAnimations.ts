import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface RecorderAnimationsOptions {
  isRecording: boolean;
  onStart: () => void;
  onCleanup: () => void;
}

export function useRecorderAnimations({
  isRecording,
  onStart,
  onCleanup,
}: RecorderAnimationsOptions) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    onStart();

    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(textOpacity, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    return () => {
      onCleanup();
    };
  }, [onCleanup, onStart, slideAnim, textOpacity]);

  useEffect(() => {
    if (!isRecording) return;
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();
  }, [isRecording, pulseAnim]);

  return { slideAnim, pulseAnim, textOpacity };
}
