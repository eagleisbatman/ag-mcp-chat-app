/**
 * CropPicker — Searchable crop list bottom sheet.
 * Groups crops by category. Used in PlotEditScreen.
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
import { useProfile } from '../../contexts/app/ProfileContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import AppIcon from '../ui/AppIcon';
import type { MasterCrop } from '../../types';

interface CropPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (crop: MasterCrop) => void;
  excludeIds?: string[];
}

export default function CropPicker({ visible, onClose, onSelect, excludeIds = [] }: CropPickerProps) {
  const { theme } = useApp();
  const { masterCrops } = useProfile();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const available = masterCrops.filter((c) => !excludeIds.includes(c.id));
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.translatedName?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  }, [masterCrops, search, excludeIds]);

  // Group by category
  const sections = useMemo(() => {
    const groups: Record<string, MasterCrop[]> = {};
    for (const crop of filtered) {
      const cat = crop.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(crop);
    }
    // Flatten into list with section headers
    const items: Array<{ type: 'header'; title: string } | { type: 'crop'; crop: MasterCrop }> = [];
    for (const [category, crops] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
      items.push({ type: 'header', title: category });
      for (const crop of crops) {
        items.push({ type: 'crop', crop });
      }
    }
    return items;
  }, [filtered]);

  const handleSelect = (crop: MasterCrop) => {
    onSelect(crop);
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
            <Text style={[styles.title, { color: theme.text }]}>{t('cropPicker.title')}</Text>
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
              placeholder={t('cropPicker.searchPlaceholder')}
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
            data={sections}
            keyExtractor={(item, i) => (item.type === 'header' ? `h-${item.title}` : `c-${item.crop.id}-${i}`)}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                    {item.title}
                  </Text>
                );
              }
              const { crop } = item;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(crop)}
                  activeOpacity={0.7}
                  style={styles.cropRow}
                >
                  <View style={styles.cropInfo}>
                    <Text style={[styles.cropName, { color: theme.text }]}>
                      {crop.translatedName || crop.name}
                    </Text>
                    {crop.translatedName && crop.translatedName !== crop.name && (
                      <Text style={[styles.cropNameEn, { color: theme.textMuted }]}>
                        {crop.name}
                      </Text>
                    )}
                  </View>
                  <AppIcon name="plus" size={18} color={theme.accent} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {masterCrops.length === 0 ? t('cropPicker.loadingCrops') : t('cropPicker.noCropsFound')}
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
  sectionHeader: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  cropNameEn: {
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
