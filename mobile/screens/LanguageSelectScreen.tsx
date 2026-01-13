import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  SectionList,
  Platform,
  ListRenderItem,
  SectionListRenderItem,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { searchLanguages, getLanguagesByRegion } from '../constants/languages';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import { t } from '../constants/strings';
import type { RootStackParamList } from '../types';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  isRTL?: boolean;
}

interface LanguageSection {
  title: string;
  data: Language[];
}

interface LanguageSelectScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LanguageSelect'>;
}

export default function LanguageSelectScreen({ navigation }: LanguageSelectScreenProps) {
  const { theme, language, setLanguage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Group languages by region or filter by search
  const displayData = useMemo((): Language[] | LanguageSection[] => {
    if (searchQuery) {
      return searchLanguages(searchQuery) as Language[];
    }
    return getLanguagesByRegion() as LanguageSection[];
  }, [searchQuery]);

  const handleSelectLanguage = async (lang: Language) => {
    await setLanguage(lang);
    navigation.goBack();
  };

  const renderLanguageItem: ListRenderItem<Language> & SectionListRenderItem<Language, LanguageSection> = ({ item }) => {
    const isSelected = language.code === item.code;
    
    return (
      <Pressable
        style={[
          styles.languageItem,
          { backgroundColor: 'transparent' },
        ]}
        onPress={() => handleSelectLanguage(item)}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.selectLanguage', { name: item.name })}
        android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
      >
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, { color: theme.text }, isSelected && styles.languageNameSelected]}>
            {item.name}
          </Text>
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

  const renderSectionHeader = ({ section }: { section: LanguageSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        title={t('onboarding.languageTitle')}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={<View />}
      />

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
        <AppIcon name="search" size={20} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('onboarding.searchLanguages')}
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <IconButton
            icon="close-circle"
            onPress={() => setSearchQuery('')}
            size={32}
            borderRadius={0}
            backgroundColor="transparent"
            color={theme.textMuted}
            accessibilityLabel={t('a11y.clearSearch')}
          />
        )}
      </View>

      {/* Language List */}
      {searchQuery ? (
        <FlatList
          data={displayData as Language[]}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
          <View style={styles.emptyState}>
            <AppIcon name="search-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {t('onboarding.noLanguagesFound')}
            </Text>
          </View>
          }
        />
      ) : (
        <SectionList
          sections={displayData as LanguageSection[]}
          renderItem={renderLanguageItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 8,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 2,
  },
  languageNameSelected: {
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  nativeName: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
});
