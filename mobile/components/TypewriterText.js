import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'react-native';

/**
 * TypewriterText - Displays text with a typewriter animation effect
 * @param {string} text - The full text to display
 * @param {number} speed - Characters per second (default: 30)
 * @param {function} onComplete - Callback when animation completes
 * @param {boolean} animate - Whether to animate (false = show all instantly)
 * @param {object} style - Text style
 */
export default function TypewriterText({ 
  text, 
  speed = 30, 
  onComplete,
  animate = true,
  style,
  ...textProps 
}) {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);
  const [isComplete, setIsComplete] = useState(!animate);
  const intervalRef = useRef(null);
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
        clearInterval(intervalRef.current);
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
  const skipAnimation = () => {
    if (!isComplete && animate) {
      clearInterval(intervalRef.current);
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

