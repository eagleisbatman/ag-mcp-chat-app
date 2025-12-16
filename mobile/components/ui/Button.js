import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { withAlpha } from '../../utils/color';

function getRipple({ theme, backgroundColor }) {
  if (Platform.OS !== 'android') return undefined;
  const isDark = theme.name === 'dark';
  const base = isDark ? '#FFFFFF' : '#000000';
  const color = withAlpha(base, 0.12);
  return { color, borderless: false };
}

export default function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary', // 'primary' | 'secondary' | 'tonal' | 'danger'
  left,
  right,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const { theme } = useApp();

  const resolved = (() => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: 'transparent', textColor: theme.textSecondary };
      case 'tonal':
        return { backgroundColor: 'transparent', textColor: theme.accent };
      case 'danger':
        return { backgroundColor: 'transparent', textColor: theme.error };
      case 'primary':
      default:
        return { backgroundColor: theme.accent, textColor: '#FFFFFF' };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={disabled}
      android_ripple={getRipple({ theme, backgroundColor: resolved.backgroundColor })}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: resolved.backgroundColor, opacity: disabled ? 0.6 : 1 },
        Platform.OS === 'ios' && pressed && !disabled ? styles.pressedIOS : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {left ? <View style={styles.side}>{left}</View> : null}
        <Text style={[styles.text, { color: resolved.textColor }, textStyle]} numberOfLines={1}>
          {title}
        </Text>
        {right ? <View style={styles.side}>{right}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedIOS: {
    opacity: 0.8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  side: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.2,
  },
});
