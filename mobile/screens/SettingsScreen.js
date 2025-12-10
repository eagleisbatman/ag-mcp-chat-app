import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
  const { showSuccess, showError } = useToast();
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const { 
    theme, 
    themeMode, 
    setThemeMode,
    language, 
    location, 
    locationStatus,
    locationDetails,
    setLocation,
    resetOnboarding 
  } = useApp();

  const handleChangeLanguage = () => {
    navigation.navigate('LanguageSelect');
  };

  const handleUpdateLocation = async () => {
    setIsUpdatingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Location permission denied');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      await setLocation(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        'granted'
      );
      
      showSuccess('Location updated successfully!');
    } catch (error) {
      console.log('Location update error:', error);
      showError('Could not update location. Please try again.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Setup',
      'This will restart the onboarding process. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
          }
        },
      ]
    );
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: 'sunny' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 1. Chat History Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CONVERSATIONS</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.navigate('History')}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.infoLight || theme.accentLight }]}>
                <Ionicons name="chatbubbles" size={18} color={theme.iconAccent || theme.info || theme.accent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, { color: theme.text }]}>Chat History</Text>
                <Text style={[styles.optionSubtext, { color: theme.textMuted }]}>
                  View and continue past conversations
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 1.5. AI Services Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>AI SERVICES</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.navigate('McpServers')}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.warningLight }]}>
                <Ionicons name="extension-puzzle" size={18} color={theme.warning} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, { color: theme.text }]}>Active Services</Text>
                <Text style={[styles.optionSubtext, { color: theme.textMuted }]}>
                  View AI services active for your region
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Location Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LOCATION</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleUpdateLocation}
          disabled={isUpdatingLocation}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.successLight }]}>
                {isUpdatingLocation ? (
                  <ActivityIndicator size="small" color={theme.iconPrimary || theme.accent} />
                ) : (
                  <Ionicons name="location" size={18} color={theme.iconPrimary || theme.accent} />
                )}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, { color: theme.text }]} numberOfLines={1}>
                  {locationDetails?.displayName || (locationStatus === 'granted' ? 'Location enabled' : 'Tap to enable')}
                </Text>
                {location?.latitude && (
                  <Text style={[styles.optionSubtext, { color: theme.textMuted }]} numberOfLines={1}>
                    {locationDetails?.formattedAddress || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                  </Text>
                )}
                <Text style={[styles.optionHint, { color: theme.iconPrimary || theme.accent }]}>
                  Tap to update location
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: theme.accentLight }]}
              onPress={handleUpdateLocation}
              disabled={isUpdatingLocation}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={theme.iconPrimary || theme.accent} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. Language Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LANGUAGE</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleChangeLanguage}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.infoLight || theme.accentLight }]}>
                <Ionicons name="language" size={18} color={theme.iconAccent || theme.info || theme.accent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, { color: theme.text }]}>{language?.name}</Text>
                <Text style={[styles.optionSubtext, { color: theme.textMuted }]}>
                  {language?.nativeName}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {themeOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < themeOptions.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border },
              ]}
              onPress={() => setThemeMode(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <View style={[
                  styles.iconContainer, 
                  { backgroundColor: themeMode === option.value ? theme.accentLight : theme.surfaceVariant }
                ]}>
                  <Ionicons 
                    name={option.icon} 
                    size={18} 
                    color={themeMode === option.value ? (theme.iconPrimary || theme.accent) : theme.textMuted} 
                  />
                </View>
                <Text style={[
                  styles.optionText, 
                  { 
                    color: theme.text,
                    fontWeight: themeMode === option.value ? TYPOGRAPHY.weights.semibold : TYPOGRAPHY.weights.medium,
                  }
                ]}>
                  {option.label}
                </Text>
              </View>
              {themeMode === option.value && (
                <Ionicons name="checkmark-circle" size={22} color={theme.iconPrimary || theme.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. Reset Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DANGER ZONE</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleResetOnboarding}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.errorLight }]}>
                <Ionicons name="refresh" size={18} color={theme.error} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, { color: theme.error }]}>Reset Onboarding</Text>
                <Text style={[styles.optionSubtext, { color: theme.textMuted }]}>
                  Start fresh with setup wizard
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appInfoText, { color: theme.textMuted }]}>
          Farm Assistant v2.0.0
        </Text>
        <Text style={[styles.appInfoSubtext, { color: theme.textMuted }]}>
          Powered by Gemini AI
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: SPACING['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -0.3,
  },
  section: {
    marginTop: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: SPACING.radiusMd,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: SPACING.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  optionSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
  },
  optionHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: SPACING.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: SPACING['3xl'] + SPACING.lg,
    gap: SPACING.xs,
  },
  appInfoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  appInfoSubtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});
