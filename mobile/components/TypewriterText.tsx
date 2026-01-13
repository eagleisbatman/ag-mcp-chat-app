import React, { useState, useEffect, useRef } from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';

interface TypewriterTextProps extends TextProps {
  /**
   * The full text to display
   */
  text: string;
  /**
   * Characters per second (default: 30)
   */
  speed?: number;
  /**
   * Callback when animation completes
   */
  onComplete?: () => void;
  /**
   * Whether to animate (false = show all instantly)
   */
  animate?: boolean;
  /**
   * Text style
   */
  style?: StyleProp<TextStyle>;
}

/**
 * TypewriterText - Displays text with a typewriter animation effect
 */
export default function TypewriterText({ 
  text, 
  speed = 30, 
  onComplete,
  animate = true,
  style,
  ...textProps 
}: TypewriterTextProps): JSX.Element {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);
  const [isComplete, setIsComplete] = useState(!animate);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    // Reset when text changes
    if (animate) {
      setDisplayedText('');
      setIsComplete(false);
      indexRef.current = 0;
    } else {
      setDisplayedText(text);
      setIsComplete(true);
    }
  }, [text, animate]);

  useEffect(() => {
    if (!animate || isComplete) return;

    // Calculate interval based on speed (chars per second)
    const intervalMs = 1000 / speed;

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        // Add next character(s) - add 2-3 chars at a time for smoother effect
        const charsToAdd = Math.min(2, text.length - indexRef.current);
        setDisplayedText(text.slice(0, indexRef.current + charsToAdd));
        indexRef.current += charsToAdd;
      } else {
        // Animation complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, animate, isComplete, onComplete]);

  // Skip animation on user interaction (scroll/tap)
  const skipAnimation = (): void => {
    if (!isComplete && animate) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setDisplayedText(text);
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <Text 
      style={style} 
      onPress={skipAnimation}
      {...textProps}
    >
      {displayedText}
      {!isComplete && animate && <Text style={{ opacity: 0.7 }}>●</Text>}
    </Text>
  );
}
