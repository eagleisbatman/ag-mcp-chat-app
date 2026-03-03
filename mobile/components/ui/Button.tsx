import React, { ReactNode } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

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
  testID?: string;
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
  testID,
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
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: resolved.backgroundColor, opacity: disabled ? 0.6 : 1 },
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
    </TouchableOpacity>
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
