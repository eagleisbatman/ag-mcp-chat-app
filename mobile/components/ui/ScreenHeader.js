import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function ScreenHeader({
  title,
  subtitle,
  center,
  left,
  right,
  backgroundColor,
  borderColor,
  borderBottom = false,
  align = 'center', // 'center' | 'left'
  style,
}) {
  const { theme } = useApp();
  const resolvedBackground = backgroundColor ?? theme.background;
  const resolvedBorderColor = borderColor ?? theme.border;
  const sideMinWidth = left || right ? 44 : 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor: resolvedBackground,
          borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: resolvedBorderColor,
        },
      ]}
    >
      <View style={[styles.row, style]}>
        <View style={[styles.side, { minWidth: sideMinWidth }]}>{left}</View>
        <View style={[styles.center, align === 'left' ? styles.centerLeft : styles.centerCenter]}>
          {center ? (
            center
          ) : (
            <>
              <Text
                style={[styles.title, align === 'left' ? styles.titleLeft : styles.titleCenter, { color: theme.text }]}
                numberOfLines={align === 'left' ? 2 : 1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.subtitle, align === 'left' ? styles.subtitleLeft : styles.subtitleCenter, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <View style={[styles.sideRight, { minWidth: sideMinWidth }]}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  side: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  center: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  centerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -0.3,
  },
  titleCenter: {
    textAlign: 'center',
  },
  titleLeft: {
    textAlign: 'left',
  },
  subtitle: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  subtitleCenter: {
    textAlign: 'center',
  },
  subtitleLeft: {
    textAlign: 'left',
  },
});
