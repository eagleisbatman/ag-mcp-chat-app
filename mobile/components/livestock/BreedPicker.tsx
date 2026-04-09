/**
 * BreedPicker — Searchable breed list filtered by livestock type.
 * Uses master data breeds from MasterLivestock.commonBreeds.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import AppIcon from '../ui/AppIcon';
import type { Breed } from '../../types';

interface BreedPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (breed: Breed) => void;
  breeds: Breed[];
  livestockName?: string;
}

export default function BreedPicker({ visible, onClose, onSelect, breeds, livestockName }: BreedPickerProps) {
  const { theme } = useApp();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return breeds;
    const q = search.toLowerCase();
    return breeds.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q)
    );
  }, [breeds, search]);

  const handleSelect = (breed: Breed) => {
    onSelect(breed);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {livestockName ? t('breedPicker.titleWithLivestock', { livestock: livestockName }) : t('breedPicker.title')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <AppIcon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: theme.surfaceVariant }]}>
            <AppIcon name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('breedPicker.searchPlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <AppIcon name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `${item.name}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
                style={styles.breedRow}
              >
                <View style={styles.breedInfo}>
                  <Text style={[styles.breedName, { color: theme.text }]}>{item.name}</Text>
                  {item.purpose && (
                    <Text style={[styles.breedPurpose, { color: theme.textMuted }]}>
                      {item.purpose}
                    </Text>
                  )}
                </View>
                <AppIcon name="check" size={18} color={theme.accent} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {breeds.length === 0 ? t('breedPicker.noBreedsAvailable') : t('breedPicker.noBreedsFound')}
                </Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    paddingVertical: 4,
  },
  listContent: {
    paddingBottom: SPACING['3xl'],
  },
  breedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  breedInfo: {
    flex: 1,
  },
  breedName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  breedPurpose: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  emptyList: {
    padding: SPACING['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
