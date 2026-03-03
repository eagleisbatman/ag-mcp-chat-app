/**
 * LanguageSwitcher component
 * Compact language selector for onboarding screens
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { LANGUAGES, Language, searchLanguages } from '../../constants/languages';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from './AppIcon';
import { t } from '../../constants/strings';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { theme, detectedLanguage, suggestedLanguages, language, setLanguage, hasUserSelectedLanguage } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Use detected language for display until the user explicitly selects one.
  const currentLang = (!hasUserSelectedLanguage && detectedLanguage) ? detectedLanguage : language;

  const handleSelectLanguage = async (lang: Language) => {
    await setLanguage(lang);
    setModalVisible(false);
  };

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = currentLang?.code === item.code;
    // Only show "Detected" badge for the primary detected language (first in suggested list)
    const isDetected = detectedLanguage?.code === item.code;

    return (
      <Pressable
        style={[styles.languageItem, { backgroundColor: 'transparent' }]}
        onPress={() => handleSelectLanguage(item)}
        android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
      >
        <View style={styles.languageInfo}>
          <View style={styles.languageNameRow}>
            <Text style={[styles.languageName, { color: theme.text }]}>
              {item.name}
            </Text>
            {isDetected && (
              <View style={[styles.suggestedBadge, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[styles.suggestedText, { color: theme.accent }]}>
                  {t('onboarding.detectedForYou')}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.nativeName, { color: theme.textSecondary }]}>
            {item.nativeName}
          </Text>
        </View>
        {isSelected && (
          <AppIcon name="checkmark-circle" size={24} color={theme.accent} />
        )}
      </Pressable>
    );
  };

  // Sort languages: suggested first, then alphabetically
  const sortedLanguages = [...LANGUAGES].sort((a, b) => {
    const aIsSuggested = suggestedLanguages.some(l => l.code === a.code);
    const bIsSuggested = suggestedLanguages.some(l => l.code === b.code);
    if (aIsSuggested && !bIsSuggested) return -1;
    if (!aIsSuggested && bIsSuggested) return 1;
    return a.name.localeCompare(b.name);
  });

  if (compact) {
    return (
      <>
        <Pressable
          style={[styles.compactButton, { backgroundColor: theme.inputBackground }]}
          onPress={() => setModalVisible(true)}
          android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
          testID="language-switcher"
        >
          <AppIcon name="globe-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.compactText, { color: theme.text }]}>
            {currentLang?.nativeName || 'English'}
          </Text>
          <AppIcon name="chevron-down" size={16} color={theme.textSecondary} />
        </Pressable>

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('onboarding.changeLanguage')}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={16}>
                <AppIcon name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={sortedLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Modal>
      </>
    );
  }

  return (
    <Pressable
      style={[styles.fullButton, { backgroundColor: theme.inputBackground }]}
      onPress={() => setModalVisible(true)}
      android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
    >
      <View style={styles.fullButtonContent}>
        <AppIcon name="globe-outline" size={20} color={theme.accent} />
        <View style={styles.fullButtonText}>
          <Text style={[styles.fullButtonLabel, { color: theme.textSecondary }]}>
            {t('onboarding.changeLanguage')}
          </Text>
          <Text style={[styles.fullButtonValue, { color: theme.text }]}>
            {currentLang?.nativeName || 'English'}
          </Text>
        </View>
      </View>
      <AppIcon name="chevron-forward" size={20} color={theme.textSecondary} />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('onboarding.changeLanguage')}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={16}>
              <AppIcon name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={sortedLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  compactText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: 12,
  },
  fullButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  fullButtonText: {
    gap: 2,
  },
  fullButtonLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  fullButtonValue: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING['2xl'],
    paddingTop: SPACING.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  listContent: {
    paddingHorizontal: SPACING['2xl'],
    paddingBottom: 40,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  languageInfo: {
    flex: 1,
  },
  languageNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  languageName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  nativeName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  suggestedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestedText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
