import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { t } from '../constants/strings';
import { log } from '../utils/logger';
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

interface LanguageScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Language'>;
}

export default function LanguageScreen({ navigation }: LanguageScreenProps) {
  const { theme, language, setLanguage, completeOnboarding, detectedLanguage, detectedCountry, suggestedLanguages, hasUserSelectedLanguage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  // Prefer detected language until user explicitly selects one.
  const initialLang = (!hasUserSelectedLanguage && detectedLanguage) ? detectedLanguage : language;
  const [selectedLang, setSelectedLang] = useState<Language>(initialLang);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const sectionListRef = useRef<SectionList<Language, LanguageSection>>(null);
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Check if selected language is the detected one
  const isDetectedLanguage = detectedLanguage && selectedLang.code === detectedLanguage.code;

  // Fixed heights for layout calculation
  const ITEM_HEIGHT = 72; // Language item height (padding 16*2 + content ~40)
  const SECTION_HEADER_HEIGHT = 48; // Section header height

  // Group languages by region or filter by search
  // When there are suggested languages, put them at the top
  const displayData = useMemo((): Language[] | LanguageSection[] => {
    if (searchQuery) {
      return searchLanguages(searchQuery) as Language[];
    }

    const regionSections = getLanguagesByRegion() as LanguageSection[];

    // If we have suggested languages, add them as the first section
    if (suggestedLanguages.length > 0) {
      const suggestedSection: LanguageSection = {
        title: t('onboarding.suggestedForYou'),
        data: suggestedLanguages,
      };
      return [suggestedSection, ...regionSections];
    }

    return regionSections;
  }, [searchQuery, suggestedLanguages]);

  // Calculate scroll offset for a given section and item
  const getScrollOffset = (sections: LanguageSection[], sectionIndex: number, itemIndex: number): number => {
    let offset = 0;
    for (let s = 0; s < sectionIndex; s++) {
      offset += SECTION_HEADER_HEIGHT; // Section header
      offset += sections[s].data.length * ITEM_HEIGHT; // All items in section
    }
    offset += SECTION_HEADER_HEIGHT; // Current section header
    offset += itemIndex * ITEM_HEIGHT; // Items before target
    return offset;
  };

  // Sync selection to detected language until the user makes a choice
  useEffect(() => {
    if (hasManualSelection || hasUserSelectedLanguage) return;
    if (detectedLanguage) {
      setSelectedLang(detectedLanguage);
    }
  }, [detectedLanguage, hasManualSelection, hasUserSelectedLanguage]);

  // Auto-scroll to selected language on mount
  useEffect(() => {
    if (searchQuery || !sectionListRef.current) return;

    const sections = displayData as LanguageSection[];
    let sectionIndex = -1;
    let itemIndex = -1;

    for (let s = 0; s < sections.length; s++) {
      const idx = sections[s].data.findIndex(lang => lang.code === selectedLang.code);
      if (idx !== -1) {
        sectionIndex = s;
        itemIndex = idx;
        break;
      }
    }

    if (sectionIndex !== -1 && itemIndex !== -1) {
      // Use scrollToOffset for more reliable scrolling
      const offset = getScrollOffset(sections, sectionIndex, itemIndex);
      setTimeout(() => {
        sectionListRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex,
          viewOffset: 150, // Center the item better
          animated: true,
        });
      }, 100);

      // Fallback: try native scroll if scrollToLocation fails
      setTimeout(() => {
        const nativeRef = sectionListRef.current?.getScrollResponder?.() as any;
        if (nativeRef?.scrollTo) {
          nativeRef.scrollTo({ y: Math.max(0, offset - 150), animated: true });
        }
      }, 400);
    }
  }, []); // Only on mount

  // Handle scroll failures gracefully
  const onScrollToIndexFailed = (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    log('⚠️ [LanguageScreen] Scroll failed, using fallback', info);
    // Retry with a delay
    setTimeout(() => {
      const sections = displayData as LanguageSection[];
      let sectionIndex = -1;
      let itemIndex = -1;
      for (let s = 0; s < sections.length; s++) {
        const idx = sections[s].data.findIndex(lang => lang.code === selectedLang.code);
        if (idx !== -1) { sectionIndex = s; itemIndex = idx; break; }
      }
      if (sectionIndex !== -1) {
        const offset = getScrollOffset(sections, sectionIndex, itemIndex);
        const nativeRef = sectionListRef.current?.getScrollResponder?.() as any;
        if (nativeRef?.scrollTo) {
          nativeRef.scrollTo({ y: Math.max(0, offset - 150), animated: true });
        }
      }
    }, 500);
  };

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLang(lang);
    setHasManualSelection(true);
  };

  const handleContinue = async () => {
    log('🌐 [LanguageScreen] User selected:', selectedLang.name, `(${selectedLang.code})`);
    await setLanguage(selectedLang);
    log('🌐 [LanguageScreen] Completing onboarding...');
    await completeOnboarding();
    log('✅ [LanguageScreen] Onboarding complete! App will navigate to Chat');
    // Navigation will auto-redirect to Chat via App.js
  };

  const renderLanguageItem: ListRenderItem<Language> & SectionListRenderItem<Language, LanguageSection> = ({ item }) => {
    const isSelected = selectedLang.code === item.code;
    const isSuggested = suggestedLanguages.some(l => l.code === item.code);
    const isDetected = detectedLanguage?.code === item.code;

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
          <View style={styles.languageNameRow}>
            <Text style={[styles.languageName, { color: theme.text }, isSelected && styles.languageNameSelected]}>
              {item.name}
            </Text>
            {isDetected && (
              <View style={[styles.detectedBadge, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[styles.detectedBadgeText, { color: theme.accent }]}>
                  {t('onboarding.detectedForYou')}
                </Text>
              </View>
            )}
            {!isDetected && isSuggested && (
              <View style={[styles.suggestedBadge, { backgroundColor: theme.textMuted + '30' }]}>
                <Text style={[styles.suggestedBadgeText, { color: theme.textSecondary }]}>
                  {t('onboarding.suggestedForYou')}
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
        subtitle={t('onboarding.languageSubtitle')}
        align="left"
      />

      {/* Detected Language Banner */}
      {detectedLanguage && (
        <View style={[styles.detectedBanner, { backgroundColor: theme.accent + '15' }]}>
          <AppIcon name="sparkles" size={20} color={theme.accent} />
          <Text style={[styles.detectedBannerText, { color: theme.text }]}>
            {detectedCountry
              ? t('onboarding.languageDetected', { country: detectedCountry })
              : t('onboarding.languageDetectedGeneric')}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
        <AppIcon name="search" size={20} color={theme.textMuted} />
        <TextInput
          testID="language-search"
          style={[
            styles.searchInput,
            { color: theme.text },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
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
          ref={sectionListRef}
          sections={displayData as LanguageSection[]}
          renderItem={renderLanguageItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
          onScrollToIndexFailed={onScrollToIndexFailed}
        />
      )}

      {/* Continue Button */}
      <View style={[styles.buttonContainer, { backgroundColor: theme.background }]}>
        <Button
          title={t('common.continue')}
          onPress={handleContinue}
          right={<AppIcon name="arrow-forward" size={20} color="#FFFFFF" />}
          accessibilityLabel={t('common.continue')}
          style={styles.button}
          testID="language-continue"
        />
      </View>
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
    marginHorizontal: 24,
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
    paddingHorizontal: 24,
    paddingBottom: 100,
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
  languageNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
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
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: 24,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  detectedBannerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
  },
  detectedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detectedBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  suggestedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestedBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING['2xl'],
    paddingBottom: 40,
  },
  button: {
    paddingVertical: SPACING.lg,
  },
});
