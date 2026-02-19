/**
 * LivestockListScreen — Shows all animals grouped by livestock type.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import AnimalCard from '../components/livestock/AnimalCard';
import type { RootStackParamList, Animal } from '../types';

interface LivestockListScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LivestockList'>;
}

export default function LivestockListScreen({ navigation }: LivestockListScreenProps) {
  const { theme } = useApp();
  const { animals } = useProfile();

  const sections = useMemo(() => {
    const groups: Record<string, Animal[]> = {};
    for (const animal of animals) {
      const type = animal.livestockName || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(animal);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [animals]);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <AppIcon name="paw" size={48} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No livestock yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
        Add your first animal to track health and events
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="My Livestock"
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel="Back"
          />
        }
        right={
          <IconButton
            icon="plus"
            onPress={() => navigation.navigate('LivestockEdit', {})}
            backgroundColor={theme.accent}
            color="#fff"
            accessibilityLabel="Add animal"
            size={36}
          />
        }
      />

      {animals.length === 0 ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
                {data.length}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <AnimalCard
              animal={item}
              onPress={() => navigation.navigate('LivestockDetail', { animalId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  sectionCount: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
