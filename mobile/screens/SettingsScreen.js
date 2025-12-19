import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import ListRow from '../components/ui/ListRow';
import AppIcon from '../components/ui/AppIcon';
import { t } from '../constants/strings';

export default function SettingsScreen({ navigation }) {
  const { showSuccess, showWarning, showError } = useToast();
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
      console.log('📍 [Settings] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 [Settings] Permission status:', status);

      if (status !== 'granted') {
        showWarning(t('settings.locationPermissionDenied'));
        return;
      }

      console.log('📍 [Settings] Getting current position...');

      // First try getLastKnownPositionAsync (instant, from cache)
      let loc = await Location.getLastKnownPositionAsync();
      console.log('📍 [Settings] Last known position:', loc?.coords);

      // If no cached location, use getCurrentPositionAsync (active GPS request)
      if (!loc?.coords) {
        console.log('📍 [Settings] No cached location, requesting fresh GPS fix...');
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
        console.log('📍 [Settings] getCurrentPositionAsync result:', loc?.coords);
      }

      // Final fallback: try with lower accuracy if high accuracy fails
      if (!loc?.coords) {
        console.log('📍 [Settings] Balanced accuracy failed, trying low accuracy...');
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeout: 10000,
        });
      }

      if (loc?.coords) {
        console.log('📍 [Settings] Got position:', loc.coords);
        showSuccess(t('settings.gpsLocationUpdated'));
        await setLocation(
          { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          'granted'
        );
      } else {
        // GPS failed, fall back to IP-based location
        console.log('📍 [Settings] GPS unavailable, falling back to IP location...');
        showWarning(t('settings.gpsFailed'));
        await fetchIPLocation();
      }
    } catch (error) {
      console.log('❌ [Settings] GPS error:', error.message);
      // Fall back to IP-based location
      showWarning(t('settings.gpsFailed'));
      await fetchIPLocation();
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Fetch location based on IP address
  const fetchIPLocation = async () => {
    try {
      console.log('🌐 [Settings] Fetching IP-based location...');
      const { lookupLocation } = require('../services/db');

      // Call API with ipAddress='auto' to trigger IP-based lookup
      const result = await lookupLocation(null, null, 'auto');

      if (result.success && result.latitude && result.longitude) {
        console.log('🌐 [Settings] IP location result:', result.displayName);
        await setLocation(
          { latitude: result.latitude, longitude: result.longitude },
          'granted'
        );
        showSuccess(t('settings.ipLocationUpdated', { location: result.displayName || 'your region' }));
      } else {
        console.log('❌ [Settings] IP location also failed:', result.error);
        showError(t('settings.locationUpdateFailed'));
      }
    } catch (error) {
      console.log('❌ [Settings] IP location error:', error.message);
      showError(t('settings.locationUpdateFailed'));
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.resetOnboarding'), 
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
          }
        },
      ]
    );
  };

  const themeOptions = [
    { value: 'light', label: t('settings.themeLight'), icon: 'sunny' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon' },
    { value: 'system', label: t('settings.themeSystem'), icon: 'phone-portrait-outline' },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <ScreenHeader
        title={t('settings.title')}
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

      {/* 1. Chat History Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionConversations')}</Text>
        <Card>
          <ListRow
            title={t('settings.chatHistory')}
            subtitle={t('settings.chatHistorySubtitle')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="chatbubbles" size={18} color={theme.iconAccent || theme.info || theme.accent} />
              </View>
            }
            onPress={() => navigation.navigate('History')}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.chatHistory')}
          />
        </Card>
      </View>

      {/* 1.5. AI Services Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionAiServices')}</Text>
        <Card>
          <ListRow
            title={t('settings.aiServices')}
            subtitle={t('settings.aiServicesSubtitle')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="extension-puzzle" size={18} color={theme.warning} />
              </View>
            }
            onPress={() => navigation.navigate('McpServers')}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.aiServices')}
          />
        </Card>
      </View>

      {/* 2. Location Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionLocation')}</Text>
        <Card>
          <ListRow
            title={
              isUpdatingLocation
                ? t('settings.updatingLocation')
                : locationDetails?.displayName ||
                  (location?.latitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : t('settings.locationNotSet'))
            }
            subtitle={
              location?.latitude && locationDetails?.formattedAddress
                ? locationDetails.formattedAddress
                : null
            }
            hint={!isUpdatingLocation ? t('settings.locationHint') : null}
            left={
              <View style={styles.iconContainer}>
                {isUpdatingLocation ? (
                  <ActivityIndicator size="small" color={theme.iconPrimary || theme.accent} />
                ) : (
                  <AppIcon name="location" size={18} color={theme.iconPrimary || theme.accent} />
                )}
              </View>
            }
            right={
              <IconButton
                icon="refresh"
                onPress={handleUpdateLocation}
                loading={isUpdatingLocation}
                size={32}
                backgroundColor="transparent"
                color={theme.iconPrimary || theme.accent}
                accessibilityLabel={t('common.refresh')}
              />
            }
            showChevron={false}
            onPress={handleUpdateLocation}
            disabled={isUpdatingLocation}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.locationHint')}
          />
        </Card>
      </View>

      {/* 3. Language Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionLanguage')}</Text>
        <Card>
          <ListRow
            title={language?.name || t('settings.language')}
            subtitle={language?.nativeName || ' '}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="language" size={18} color={theme.iconAccent || theme.info || theme.accent} />
              </View>
            }
            onPress={handleChangeLanguage}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.sectionLanguage')}
          />
        </Card>
      </View>

      {/* 4. Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionAppearance')}</Text>
        <Card>
          {themeOptions.map((option, index) => (
            <ListRow
              key={option.value}
              title={option.label}
              titleColor={theme.text}
              left={
                <View style={[
                  styles.iconContainer, 
                  { backgroundColor: 'transparent' }
                ]}>
                  <AppIcon 
                    name={option.icon} 
                    size={18} 
                    color={themeMode === option.value ? (theme.iconPrimary || theme.accent) : theme.textMuted} 
                  />
                </View>
              }
              right={
                themeMode === option.value ? (
                  <AppIcon name="checkmark-circle" size={22} color={theme.iconPrimary || theme.accent} />
                ) : null
              }
              showChevron={false}
              divider={index < themeOptions.length - 1}
              paddingHorizontal={SPACING.md}
              onPress={() => setThemeMode(option.value)}
              accessibilityLabel={`${t('settings.sectionAppearance')}: ${option.label}`}
            />
          ))}
        </Card>
      </View>

      {/* 5. Reset Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionDanger')}</Text>
        <Card>
          <ListRow
            title={t('settings.resetOnboarding')}
            subtitle={t('settings.resetOnboardingSubtitle')}
            titleColor={theme.error}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="refresh" size={18} color={theme.error} />
              </View>
            }
            onPress={handleResetOnboarding}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.resetOnboarding')}
          />
        </Card>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appInfoText, { color: theme.textMuted }]}>
          {t('settings.appInfoVersion')}
        </Text>
        <Text style={[styles.appInfoSubtext, { color: theme.textMuted }]}>
          {t('settings.appInfoPoweredBy')}
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
