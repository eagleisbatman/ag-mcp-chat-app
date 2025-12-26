import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { t } from '../constants/strings';

/**
 * Compact summary of a previous diagnosis (Screen 13)
 * Provides context for follow-up conversations
 */
export default function DiagnosisSummary({ crop, status, issue }) {
  const { theme, isDark } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
      <View style={styles.header}>
        <AppIcon name="search" size={14} color={theme.textMuted} prefer="feather" />
        <Text style={[styles.headerText, { color: theme.textMuted }]}>
          {t('chat.previousDiagnosis') || 'PREVIOUS DIAGNOSIS'}
        </Text>
      </View>
      <Text style={[styles.bodyText, { color: theme.textSecondary }]} numberOfLines={1}>
        {crop}{status ? ` · ${status}` : ''}{issue ? ` · ${issue}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.md,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
