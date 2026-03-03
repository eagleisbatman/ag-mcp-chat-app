import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import ListRow from '../components/ui/ListRow';
import AppIcon from '../components/ui/AppIcon';
import ProfileCard from '../components/profile/ProfileCard';
import { useNotifications } from '../contexts/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lookupLocation, deleteAccount } from '../services/db';
import { log } from '../utils/logger';
import { t } from '../constants/strings';
import type { RootStackParamList } from '../types';

interface SettingsScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
}

interface ThemeOption {
  value: string;
  label: string;
  icon: string;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { showSuccess, showWarning, showError } = useToast();
  const { farms, animals, profile } = useProfile();
  const { preferences, updatePreferences, isPermissionGranted, requestPermission } = useNotifications();
  const isEW = profile?.role === 'extension_worker';
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('tts_enabled').then((v) => {
      if (v !== null) setTtsEnabled(v !== 'false');
    });
  }, []);

  const handleToggleTts = async (value: boolean) => {
    setTtsEnabled(value);
    await AsyncStorage.setItem('tts_enabled', value ? 'true' : 'false');
  };
  const {
    theme,
    themeMode,
    setThemeMode,
    language,
    location,
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
        showWarning(t('settings.locationPermissionDenied'));
        return;
      }

      let loc = await Location.getLastKnownPositionAsync();
      if (!loc?.coords) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (!loc?.coords) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      }

      if (loc?.coords) {
        showSuccess(t('settings.gpsLocationUpdated'));
        await setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 'granted');
      } else {
        showWarning(t('settings.gpsFailed'));
        await fetchIPLocation();
      }
    } catch (error) {
      log('❌ [Settings] GPS error:', (error as Error).message);
      showWarning(t('settings.gpsFailed'));
      await fetchIPLocation();
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const fetchIPLocation = async () => {
    try {
      const result = await lookupLocation(null, null, 'auto');
      if (result.success && result.latitude && result.longitude) {
        await setLocation({ latitude: result.latitude, longitude: result.longitude }, 'granted');
        showSuccess(t('settings.ipLocationUpdated', { location: result.displayName || '' }));
      } else {
        showError(t('settings.locationUpdateFailed'));
      }
    } catch {
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

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccountTitle'),
      t('settings.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              t('settings.deleteAccountConfirmTitle'),
              t('settings.deleteAccountConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    const result = await deleteAccount();
                    if (result.success) {
                      showSuccess(t('settings.deleteAccountSuccess'));
                      await resetOnboarding();
                    } else {
                      showError(t('settings.deleteAccountFailed'));
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleToggleNotification = async (key: keyof typeof preferences, value: boolean) => {
    // If enabling any notification and permission not granted, request it first
    if (value && !isPermissionGranted) {
      const granted = await requestPermission();
      if (!granted) {
        showWarning(t('notifications.disabled'));
        return;
      }
    }
    await updatePreferences({ [key]: value });
  };

  const themeOptions: ThemeOption[] = [
    { value: 'light', label: t('settings.themeLight'), icon: 'sunny' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon' },
    { value: 'system', label: t('settings.themeSystem'), icon: 'phone-portrait-outline' },
  ];

  const locationTitle = isUpdatingLocation
    ? t('settings.updatingLocation')
    : locationDetails?.displayName ||
      (location?.latitude != null && location?.longitude != null
        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        : t('settings.locationNotSet'));

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
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

      {/* Profile Card */}
      <View style={styles.section}>
        <ProfileCard onPress={() => navigation.navigate('Profile')} />
      </View>

      {/* My Farms */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('farm.sectionMyFarms')}</Text>
        <Card>
          <ListRow
            title={farms.length > 0 ? t(farms.length > 1 ? 'farm.farmsCountPlural' : 'farm.farmsCount', { count: farms.length }) : t('farm.noFarms')}
            subtitle={
              farms.length > 0
                ? farms.map((f) => {
                    const plotCount = f.plots?.length || 0;
                    return `${f.name} (${t(plotCount !== 1 ? 'farm.plotCountPlural' : 'farm.plotCount', { count: plotCount })})`;
                  }).join(', ')
                : t('farm.noFarmsYetHint')
            }
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="leaf" size={18} color={theme.accent} />
              </View>
            }
            onPress={() => navigation.navigate('FarmList')}
            paddingHorizontal={SPACING.md}
            accessibilityLabel="Manage farms"
          />
        </Card>
      </View>

      {/* My Livestock */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('livestock.sectionMyLivestock')}</Text>
        <Card>
          <ListRow
            title={animals.length > 0 ? t(animals.length > 1 ? 'livestock.animalsCountPlural' : 'livestock.animalsCount', { count: animals.length }) : t('livestock.noLivestock')}
            subtitle={
              animals.length > 0
                ? (() => {
                    const byType: Record<string, number> = {};
                    for (const a of animals) {
                      const type = a.livestockName || 'Unknown';
                      byType[type] = (byType[type] || 0) + (a.trackingMode === 'herd' ? (a.herdSize || 1) : 1);
                    }
                    return Object.entries(byType).map(([type, count]) => `${type}: ${count}`).join(', ');
                  })()
                : t('livestock.noLivestockYetHint')
            }
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="paw" size={18} color={theme.warning} />
              </View>
            }
            onPress={() => navigation.navigate('LivestockList')}
            paddingHorizontal={SPACING.md}
            accessibilityLabel="Manage livestock"
          />
        </Card>
      </View>

      {/* Extension Worker Section — only for EWs */}
      {isEW && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('extensionWorker.sectionExtensionWorker')}</Text>
          <Card>
            <ListRow
              title={t('extensionWorker.myFarmers')}
              subtitle={t('extensionWorker.myFarmersHint')}
              left={
                <View style={styles.iconContainer}>
                  <AppIcon name="people" size={18} color={theme.accent} />
                </View>
              }
              onPress={() => navigation.navigate('MyFarmers')}
              paddingHorizontal={SPACING.md}
              divider
              accessibilityLabel="My farmers"
            />
            <ListRow
              title={t('extensionWorker.pendingRequests')}
              subtitle={t('extensionWorker.pendingRequestsHint')}
              left={
                <View style={styles.iconContainer}>
                  <AppIcon name="time" size={18} color={theme.warning} />
                </View>
              }
              onPress={() => navigation.navigate('PendingRequests')}
              paddingHorizontal={SPACING.md}
              accessibilityLabel="Pending requests"
            />
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionConversations')}</Text>
        <Card>
          <ListRow
            title={t('settings.chatHistory')}
            subtitle={t('settings.chatHistorySubtitle')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="chatbubbles" size={18} color={theme.accent} />
              </View>
            }
            onPress={() => navigation.navigate('History')}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.chatHistory')}
            testID="settings-history"
          />
        </Card>
      </View>

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
            testID="settings-mcp"
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionLocation')}</Text>
        <Card>
          <ListRow
            title={locationTitle}
            subtitle={location?.latitude != null && locationDetails?.formattedAddress ? locationDetails.formattedAddress : undefined}
            hint={!isUpdatingLocation ? t('settings.locationHint') : undefined}
            left={
              <View style={styles.iconContainer}>
                {isUpdatingLocation ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <AppIcon name="location" size={18} color={theme.accent} />
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
                color={theme.accent}
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionLanguage')}</Text>
        <Card>
          <ListRow
            title={language?.name || t('settings.language')}
            subtitle={language?.nativeName || ''}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="language" size={18} color={theme.accent} />
              </View>
            }
            onPress={handleChangeLanguage}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.sectionLanguage')}
            testID="settings-language"
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionAppearance')}</Text>
        <Card>
          {themeOptions.map((option, index) => (
            <ListRow
              key={option.value}
              title={option.label}
              titleColor={theme.text}
              left={
                <View style={styles.iconContainer}>
                  <AppIcon 
                    name={option.icon} 
                    size={18} 
                    color={themeMode === option.value ? theme.accent : theme.textMuted} 
                  />
                </View>
              }
              right={
                themeMode === option.value ? (
                  <AppIcon name="checkmark-circle" size={22} color={theme.accent} />
                ) : undefined
              }
              showChevron={false}
              divider={index < themeOptions.length - 1}
              paddingHorizontal={SPACING.md}
              onPress={() => setThemeMode(option.value as 'light' | 'dark' | 'system')}
              accessibilityLabel={t('a11y.themeMode', { mode: option.label })}
            />
          ))}
        </Card>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('notifications.title')}</Text>
        <Card>
          <ListRow
            title={t('notifications.weatherAlerts')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="cloud" size={18} color={theme.accent} />
              </View>
            }
            right={
              <Switch
                value={preferences.weatherAlerts}
                onValueChange={(v) => handleToggleNotification('weatherAlerts', v)}
                trackColor={{ false: theme.border, true: theme.accent + '80' }}
                thumbColor={preferences.weatherAlerts ? theme.accent : theme.textMuted}
              />
            }
            showChevron={false}
            divider
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('notifications.weatherAlerts')}
          />
          <ListRow
            title={t('notifications.contentUpdates')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="newspaper" size={18} color={theme.accent} />
              </View>
            }
            right={
              <Switch
                value={preferences.contentUpdates}
                onValueChange={(v) => handleToggleNotification('contentUpdates', v)}
                trackColor={{ false: theme.border, true: theme.accent + '80' }}
                thumbColor={preferences.contentUpdates ? theme.accent : theme.textMuted}
              />
            }
            showChevron={false}
            divider
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('notifications.contentUpdates')}
          />
          <ListRow
            title={t('notifications.engagement')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="bulb" size={18} color={theme.warning} />
              </View>
            }
            right={
              <Switch
                value={preferences.tipsAndReminders}
                onValueChange={(v) => handleToggleNotification('tipsAndReminders', v)}
                trackColor={{ false: theme.border, true: theme.accent + '80' }}
                thumbColor={preferences.tipsAndReminders ? theme.accent : theme.textMuted}
              />
            }
            showChevron={false}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('notifications.engagement')}
          />
        </Card>
      </View>

      {/* Text-to-Speech */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('settings.sectionAccessibility')}</Text>
        <Card>
          <ListRow
            title={t('settings.textToSpeech')}
            subtitle={t('settings.textToSpeechHint')}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="volume-2" size={18} color={theme.accent} />
              </View>
            }
            right={
              <Switch
                testID="settings-tts"
                value={ttsEnabled}
                onValueChange={handleToggleTts}
                trackColor={{ false: theme.border, true: theme.accent + '80' }}
                thumbColor={ttsEnabled ? theme.accent : theme.textMuted}
              />
            }
            showChevron={false}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.textToSpeech')}
          />
        </Card>
      </View>

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
            divider
            accessibilityLabel={t('settings.resetOnboarding')}
            testID="settings-reset"
          />
          <ListRow
            title={t('settings.deleteAccount')}
            subtitle={t('settings.deleteAccountSubtitle')}
            titleColor={theme.error}
            left={
              <View style={styles.iconContainer}>
                <AppIcon name="trash-2" size={18} color={theme.error} />
              </View>
            }
            onPress={handleDeleteAccount}
            paddingHorizontal={SPACING.md}
            accessibilityLabel={t('settings.deleteAccount')}
            testID="settings-delete-account"
          />
        </Card>
      </View>

      <View style={styles.appInfo}>
        <Text style={[styles.appInfoText, { color: theme.textMuted }]}>{t('settings.appInfoVersion')}</Text>
        <Text style={[styles.appInfoSubtext, { color: theme.textMuted }]}>{t('settings.appInfoPoweredBy')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: SPACING['3xl'] },
  section: { marginTop: SPACING['2xl'], paddingHorizontal: SPACING.lg },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: { alignItems: 'center', marginTop: SPACING['3xl'] + SPACING.lg, gap: SPACING.xs },
  appInfoText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium },
  appInfoSubtext: { fontSize: TYPOGRAPHY.sizes.xs },
});
