import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from './AppIcon';

export default function ListRow({
  title,
  subtitle,
  hint,
  titleColor,
  subtitleColor,
  hintColor,
  left,
  right,
  showChevron,
  onPress,
  onLongPress,
  delayLongPress,
  disabled = false,
  divider = false,
  paddingHorizontal = SPACING.lg,
  paddingVertical = SPACING.md,
  style,
  contentStyle,
  accessibilityLabel,
}) {
  const { theme } = useApp();
  const resolvedShowChevron = showChevron ?? Boolean(onPress);
  const resolvedTitleColor = titleColor ?? theme.text;
  const resolvedSubtitleColor = subtitleColor ?? theme.textMuted;
  const resolvedHintColor = hintColor ?? (theme.iconPrimary || theme.accent);
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={!onPress || disabled}
      android_ripple={
        Platform.OS === 'android' && onPress
          ? { color: rippleColor }
          : undefined
      }
      style={[
        styles.row,
        { paddingHorizontal, paddingVertical },
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        disabled && { opacity: 0.6 },
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <View style={styles.text}>
          <Text style={[styles.title, { color: resolvedTitleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: resolvedSubtitleColor }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {hint ? (
            <Text style={[styles.hint, { color: resolvedHintColor }]} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          {right}
          {resolvedShowChevron ? <AppIcon name="chevron-forward" size={20} color={theme.textMuted} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  left: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SPACING.radiusMd,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  subtitle: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
  },
  hint: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
