import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, ViewStyle, TextStyle, PressableAndroidRippleConfig } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY, ThemeColors } from '../../constants/themes';
import { withAlpha } from '../../utils/color';

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  left?: ReactNode;
  right?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  accessibilityLabel?: string;
}

function getRipple({ theme }: { theme: ThemeColors }): PressableAndroidRippleConfig | undefined {
  if (Platform.OS !== 'android') return undefined;
  const color = withAlpha(theme.text, 0.12);
  return { color, borderless: false };
}

export default function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  left,
  right,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps): JSX.Element {
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
      android_ripple={getRipple({ theme })}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: resolved.backgroundColor, opacity: disabled ? 0.6 : 1 },
        Platform.OS === 'ios' && pressed && !disabled ? styles.pressedIOS : null,
        style as ViewStyle,
      ]}
    >
      <View style={styles.content}>
        {left ? <View style={styles.side}>{left}</View> : null}
        <Text style={[styles.text, { color: resolved.textColor }, textStyle as TextStyle]} numberOfLines={1}>
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
