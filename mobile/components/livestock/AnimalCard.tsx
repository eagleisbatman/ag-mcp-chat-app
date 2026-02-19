/**
 * AnimalCard — Displays an animal summary with type, breed, and status.
 * Used in LivestockListScreen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import type { Animal } from '../../types';

interface AnimalCardProps {
  animal: Animal;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#30D158',
  sold: '#FF9F0A',
  deceased: '#FF453A',
  transferred: '#0A84FF',
};

export default function AnimalCard({ animal, onPress }: AnimalCardProps) {
  const { theme } = useApp();

  const displayName = animal.name || animal.livestockName || 'Animal';
  const subtitle = [
    animal.breed,
    animal.trackingMode === 'herd' && animal.herdSize ? `Herd of ${animal.herdSize}` : null,
    animal.gender,
  ]
    .filter(Boolean)
    .join(' · ');

  const statusColor = STATUS_COLORS[animal.status] || theme.textMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.surfaceVariant }]}
      accessibilityLabel={`Animal: ${displayName}`}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: theme.accent + '20' }]}>
          <AppIcon name="paw" size={20} color={theme.accent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightCol}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {animal.status}
          </Text>
        </View>
        <AppIcon name="chevron-forward" size={18} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'capitalize',
  },
});
