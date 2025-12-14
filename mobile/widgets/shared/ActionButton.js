/**
 * ActionButton - Primary action button for widget forms
 *
 * Used for submit/calculate buttons in widgets
 */
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import AppIcon from '../../components/ui/AppIcon';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function ActionButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary', // 'primary', 'secondary', 'outline'
  fullWidth = true,
}) {
  const { theme } = useApp();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: theme.surfaceVariant,
          text: theme.text,
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: theme.accent,
          border: theme.accent,
        };
      default:
        return {
          bg: theme.accent,
          text: '#FFFFFF',
        };
    }
  };

  const variantStyles = getStyles();

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border || 'transparent',
          borderWidth: variantStyles.border ? 1 : 0,
          opacity: disabled || loading ? 0.6 : 1,
        },
        fullWidth && styles.fullWidth,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.text} />
      ) : (
        <>
          {icon && <AppIcon name={icon} size={20} color={variantStyles.text} />}
          <Text style={[styles.label, { color: variantStyles.text }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: SPACING.radiusMd,
    gap: SPACING.sm,
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
