import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';

interface DateSeparatorProps {
  date: Date | string;
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('chat.today');
  if (diffDays === 1) return t('chat.yesterday');
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined });
}

function DateSeparator({ date }: DateSeparatorProps): JSX.Element {
  const { theme } = useApp();
  const d = new Date(date);

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: theme.inputBorder }]} />
      <Text style={[styles.label, { color: theme.textMuted }]}>
        {formatDateLabel(d)}
      </Text>
      <View style={[styles.line, { backgroundColor: theme.inputBorder }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    paddingHorizontal: SPACING.md,
  },
});

export default memo(DateSeparator);
