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
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { LANGUAGES, REGIONS, searchLanguages, getLanguagesWithSuggestions } from '../constants/languages';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { t } from '../constants/strings';

export default function LanguageScreen({ navigation }) {
  const { theme, language, setLanguage, completeOnboarding, locationDetails } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState(language);
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Get country from location details for smart suggestions
  const countryName = locationDetails?.level1Country || null;

  // Group languages by region or filter by search
  // Shows "Suggested for You" at top based on user's location
  const displayData = useMemo(() => {
    if (searchQuery) {
      return searchLanguages(searchQuery);
    }

    // Use smart ordering with location-based suggestions
    return getLanguagesWithSuggestions(countryName, selectedLang?.code);
  }, [searchQuery, countryName, selectedLang?.code]);

  const handleSelectLanguage = (lang) => {
    setSelectedLang(lang);
  };

  const handleContinue = async () => {
    console.log('🌐 [LanguageScreen] User selected:', selectedLang.name, `(${selectedLang.code})`);
    await setLanguage(selectedLang);
    console.log('🌐 [LanguageScreen] Completing onboarding...');
    await completeOnboarding();
    console.log('✅ [LanguageScreen] Onboarding complete! App will navigate to Chat');
    // Navigation will auto-redirect to Chat via App.js
  };

  const renderLanguageItem = ({ item }) => {
    const isSelected = selectedLang.code === item.code;
    
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

  const renderSectionHeader = ({ section }) => {
    // Translate special section titles
    let title = section.title;
    if (section.title === 'Suggested for You') {
      title = t('onboarding.suggestedForYou');
    } else if (section.title === 'Current') {
      title = t('onboarding.currentLanguage');
    }

    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          {title}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        title={t('onboarding.languageTitle')}
        subtitle={t('onboarding.languageSubtitle')}
        align="left"
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
          data={displayData}
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
          sections={displayData}
          renderItem={renderLanguageItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
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
