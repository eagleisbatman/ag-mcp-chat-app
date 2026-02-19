/**
 * FarmListScreen — Shows all farms with an add button.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import FarmCard from '../components/farm/FarmCard';
import { t } from '../constants/strings';
import type { RootStackParamList, Farm } from '../types';

interface FarmListScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FarmList'>;
}

export default function FarmListScreen({ navigation }: FarmListScreenProps) {
  const { theme } = useApp();
  const { farms } = useProfile();

  const renderFarm = ({ item }: { item: Farm }) => (
    <FarmCard
      farm={item}
      onPress={() => navigation.navigate('FarmDetail', { farmId: item.id })}
    />
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <AppIcon name="sprout" size={48} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('farm.noFarms')}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
        {t('farm.noFarmsHint')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('farm.myFarms')}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={
          <IconButton
            icon="plus"
            onPress={() => navigation.navigate('FarmEdit', {})}
            backgroundColor={theme.accent}
            color="#fff"
            accessibilityLabel={t('farm.addFarm')}
            size={36}
          />
        }
      />

      <FlatList
        data={farms}
        keyExtractor={(item) => item.id}
        renderItem={renderFarm}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.list,
          farms.length === 0 && styles.listEmpty,
        ]}
      />
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
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
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
