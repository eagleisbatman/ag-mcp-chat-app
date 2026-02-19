/**
 * FarmCard — Displays a farm summary with plot count and crop tags.
 * Used in FarmListScreen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import type { Farm } from '../../types';

interface FarmCardProps {
  farm: Farm;
  onPress: () => void;
}

export default function FarmCard({ farm, onPress }: FarmCardProps) {
  const { theme } = useApp();

  const plotCount = farm.plots?.length || 0;
  const cropNames = farm.plots
    ?.flatMap((p) => p.cropAllocations?.map((c) => c.cropName || 'Crop') || [])
    .filter(Boolean);
  const uniqueCrops = [...new Set(cropNames)].slice(0, 4);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.surfaceVariant }]}
      accessibilityLabel={`Farm: ${farm.name}`}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: theme.accent + '20' }]}>
          <AppIcon name="sprout" size={20} color={theme.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {farm.name}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {plotCount} {plotCount === 1 ? 'plot' : 'plots'}
            {farm.totalAreaHectares ? ` · ${farm.totalAreaHectares} ha` : ''}
          </Text>
        </View>
        <AppIcon name="chevron-forward" size={20} color={theme.textMuted} />
      </View>

      {uniqueCrops.length > 0 && (
        <View style={styles.cropRow}>
          {uniqueCrops.map((crop) => (
            <View
              key={crop}
              style={[styles.cropTag, { backgroundColor: theme.accent + '15' }]}
            >
              <Text style={[styles.cropTagText, { color: theme.accent }]}>
                {crop}
              </Text>
            </View>
          ))}
          {cropNames.length > 4 && (
            <Text style={[styles.moreCrops, { color: theme.textMuted }]}>
              +{cropNames.length - 4}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
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
  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
  },
  name: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  meta: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  cropRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  cropTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cropTagText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  moreCrops: {
    fontSize: TYPOGRAPHY.sizes.xs,
    alignSelf: 'center',
    marginLeft: 2,
  },
});
