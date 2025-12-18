import React from 'react';
import { Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING } from '../../constants/themes';
import AppIcon from './AppIcon';

export default function IconButton({
  icon,
  onPress,
  disabled = false,
  loading = false,
  size = 40,
  borderRadius,
  backgroundColor,
  color,
  style,
  hitSlop,
  accessibilityLabel,
}) {
  const { theme } = useApp();
  const resolvedBackground = backgroundColor ?? 'transparent';
  const resolvedColor = color ?? theme.text;
  const resolvedRadius = borderRadius ?? Math.round(size / 2);
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: resolvedRadius,
          backgroundColor: resolvedBackground,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={
        Platform.OS === 'android'
          ? {
              color: rippleColor,
              borderless: resolvedRadius >= Math.round(size / 2),
              radius: resolvedRadius >= Math.round(size / 2) ? Math.round(size / 2) : undefined,
            }
          : undefined
      }
      hitSlop={hitSlop ?? { top: SPACING.sm, bottom: SPACING.sm, left: SPACING.sm, right: SPACING.sm }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={resolvedColor} />
      ) : (
        <AppIcon name={icon} size={Math.round(size * 0.5)} color={resolvedColor} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
