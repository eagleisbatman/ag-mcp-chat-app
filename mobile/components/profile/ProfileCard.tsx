/**
 * ProfileCard — Shows user avatar, name, role, and completion bar.
 * Used at the top of SettingsScreen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { useProfile } from '../../contexts/app/ProfileContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import AppIcon from '../ui/AppIcon';

interface ProfileCardProps {
  onPress: () => void;
}

export default function ProfileCard({ onPress }: ProfileCardProps) {
  const { theme } = useApp();
  const { profile } = useProfile();

  const name = profile?.name || t('profile.setupProfile');
  const role = profile?.role || 'farmer';
  const completeness = profile?.profileCompleteness || 0;
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const roleLabel = role === 'extension_worker' ? t('profile.roleExtensionWorker') : t('profile.roleFarmer');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID="settings-profile"
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessibilityLabel={t('profile.editProfile')}
    >
      <View style={[styles.avatar, { backgroundColor: theme.accent + '20' }]}>
        <Text style={[styles.avatarText, { color: theme.accent }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.roleRow}>
          <View style={[styles.roleBadge, { backgroundColor: theme.accent + '15' }]}>
            <Text style={[styles.roleText, { color: theme.accent }]}>{roleLabel}</Text>
          </View>
        </View>
        {completeness < 100 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${completeness}%`, backgroundColor: theme.accent }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.textMuted }]}>{completeness}%</Text>
          </View>
        )}
      </View>
      <AppIcon name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
  },
  name: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
