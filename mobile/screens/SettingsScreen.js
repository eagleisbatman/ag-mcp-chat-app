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
import { SPACING } from '../constants/themes';

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

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {themeOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < themeOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              onPress={() => setThemeMode(option.value)}
            >
              <View style={styles.optionLeft}>
                <Ionicons name={option.icon} size={22} color={theme.accent} />
                <Text style={[styles.optionText, { color: theme.text }]}>{option.label}</Text>
              </View>
              {themeMode === option.value && (
                <Ionicons name="checkmark" size={22} color={theme.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LANGUAGE</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={handleChangeLanguage}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="language" size={22} color={theme.accent} />
              <View>
                <Text style={[styles.optionText, { color: theme.text }]}>{language?.name}</Text>
                <Text style={[styles.optionSubtext, { color: theme.textMuted }]}>
                  {language?.nativeName}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Conversations Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CONVERSATIONS</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('History')}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="chatbubbles-outline" size={22} color={theme.accent} />
              <View>
                <Text style={[styles.optionText, { color: theme.text }]}>Chat History</Text>
                <Text style={[styles.optionSubtext, { color: theme.textMuted }]}>
                  View and continue past conversations
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LOCATION</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={handleUpdateLocation}
          disabled={isUpdatingLocation}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              {isUpdatingLocation ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons 
                  name={locationStatus === 'granted' ? 'location' : 'location-outline'} 
                  size={22} 
                  color={locationStatus === 'granted' ? theme.accent : theme.textMuted} 
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {locationDetails?.displayName || (locationStatus === 'granted' ? 'Location enabled' : 'Location disabled')}
                </Text>
                {location?.latitude && (
                  <Text style={[styles.optionSubtext, { color: theme.textMuted }]} numberOfLines={2}>
                    {locationDetails?.formattedAddress || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                  </Text>
                )}
                <Text style={[styles.optionHint, { color: theme.accent }]}>
                  Tap to update location
                </Text>
              </View>
            </View>
            <Ionicons 
              name="refresh" 
              size={22} 
              color={theme.accent} 
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Reset Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>RESET</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={handleResetOnboarding}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="refresh" size={22} color={theme.error} />
              <Text style={[styles.optionText, { color: theme.error }]}>
                Reset Onboarding
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appInfoText, { color: theme.textMuted }]}>
          Farm Assistant v2.0.0
        </Text>
        <Text style={[styles.appInfoText, { color: theme.textMuted }]}>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  optionHint: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 48,
    gap: 4,
  },
  appInfoText: {
    fontSize: 13,
  },
});

