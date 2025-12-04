import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { LANGUAGES, REGIONS, searchLanguages } from '../constants/languages';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../constants/themes';

export default function LanguageScreen({ navigation }) {
  const { theme, language, setLanguage, completeOnboarding } = useApp();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState(language);

  // Group languages by region or filter by search
  const displayData = useMemo(() => {
    if (searchQuery) {
      return searchLanguages(searchQuery);
    }
    
    // Group by region for section list
    return REGIONS.map(region => ({
      title: region,
      data: LANGUAGES.filter(lang => lang.region === region),
    }));
  }, [searchQuery]);

  const handleSelectLanguage = (lang) => {
    setSelectedLang(lang);
  };

  const handleContinue = async () => {
    await setLanguage(selectedLang);
    await completeOnboarding();
    // Navigation will auto-redirect to Chat via App.js
  };

  const renderLanguageItem = ({ item }) => {
    const isSelected = selectedLang.code === item.code;
    
    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          { backgroundColor: isSelected ? theme.accentLight : theme.surface },
          { borderColor: isSelected ? theme.accent : theme.border },
        ]}
        onPress={() => handleSelectLanguage(item)}
        activeOpacity={0.7}
      >
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, { color: theme.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.nativeName, { color: theme.textSecondary }]}>
            {item.nativeName}
          </Text>
        </View>
        
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          Select Language
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose your preferred language for the assistant
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
        <Ionicons name="search" size={20} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search languages..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          </TouchableOpacity>
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
              <Ionicons name="search-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No languages found
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
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  nativeName: {
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

