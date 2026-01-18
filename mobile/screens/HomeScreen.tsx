import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Image, Pressable, Text, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { useApp } from '../contexts/AppContext';
import { t } from '../constants/strings';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import WeatherWidget from '../components/weather/WeatherWidget';
import ContentCarousel from '../components/content/ContentCarousel';
import QuickActions from '../components/home/QuickActions';
import NotificationBanner from '../components/notifications/NotificationBanner';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { weatherService } from '../services/weather';
import { contentService } from '../services/content';
import { error as logError, log } from '../utils/logger';
import type { RootStackParamList, WeatherData } from '../types';

const SERVICE_PREFS_KEY = '@service_preferences';

const logoImage: ImageSourcePropType = require('../assets/logo.png');

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

interface ContentItem {
  id?: string;
  _id?: string;
  title?: string;
  [key: string]: any;
}

interface Alert {
  id: string;
  [key: string]: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { location, locationDetails, language, theme, isDark } = useApp();
  const insets = useSafeAreaInsets();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherProvider, setWeatherProvider] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setWeatherError(false);

      // Load weather provider preference
      let weatherPref = 'google-weather';
      try {
        const stored = await AsyncStorage.getItem(SERVICE_PREFS_KEY);
        if (stored) {
          const prefs = JSON.parse(stored);
          weatherPref = prefs.weather || 'google-weather';
        }
      } catch (e) {
        log('[HomeScreen] Failed to load weather pref:', e);
      }

      log('[HomeScreen] Loading weather with:', {
        provider: weatherPref,
        lat: location?.latitude,
        lon: location?.longitude
      });

      if (location?.latitude !== null && location?.longitude !== null) {
        const lat = location.latitude as number;
        const lon = location.longitude as number;

        // Fetch weather separately to handle errors independently
        let weatherData: WeatherData | null = null;
        try {
          weatherData = await weatherService.getCurrentAndForecast(lat, lon, language?.code || 'en', weatherPref) as WeatherData;

          // Debug: Log what we're setting to state
          log('[HomeScreen] Weather data received:', {
            provider: weatherPref,
            hasCurrent: !!(weatherData as any)?.current,
            currentTemp: (weatherData as any)?.current?.temperature,
            hasForecast: !!(weatherData as any)?.forecast,
          });

          setWeather(weatherData);
          setWeatherProvider((weatherData as any).provider || weatherPref);
        } catch (weatherErr) {
          logError('[HomeScreen] Weather fetch failed:', weatherErr);
          setWeatherError(true);
          setWeather(null);
        }

        // Fetch other data in parallel (don't let weather failure block these)
        const [contentData, alertsData] = await Promise.all([
          contentService.getFeed(lat, lon, language?.code || 'en'),
          weatherService.getAlerts(lat, lon),
        ]);

        setContent(contentData);
        setAlerts(alertsData);
      } else {
        const contentData = await contentService.getFeed(null, null, language?.code || 'en');
        setContent(contentData);
      }
    } catch (error) {
      logError('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, [location, language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-fetch when screen gains focus (e.g., after changing weather provider)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleContentPress = (item: ContentItem) => {
    const id = item.id || item._id;
    if (id) {
      navigation.navigate('ContentDetail', { contentId: id });
    }
  };

  const handleStartChat = () => {
    navigation.navigate('Chat');
  };

  const handleTakePhoto = () => {
    navigation.navigate('Chat', { openCamera: true });
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleAlertDismiss = (alertId: string | number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const locationText = locationDetails?.displayName ||
    locationDetails?.level5City ||
    locationDetails?.level3District ||
    (location?.latitude !== null && location?.longitude !== null
      ? `${location.latitude!.toFixed(2)}, ${location.longitude!.toFixed(2)}`
      : t('chat.setLocation'));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        align="left"
        center={
          <Pressable style={styles.headerLeft}>
            <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {t('onboarding.appName')}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          </Pressable>
        }
        right={
          <>
            <IconButton
              icon="chatbubble-ellipses"
              onPress={handleStartChat}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('a11y.startNewChat')}
            />
            <IconButton
              icon="settings-outline"
              onPress={() => navigation.navigate('Settings')}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('a11y.openSettings')}
            />
          </>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {alerts.length > 0 && (
          <NotificationBanner
            alerts={alerts}
            onDismiss={handleAlertDismiss}
          />
        )}

        <WeatherWidget
          data={weather}
          loading={loading && location?.latitude !== null}
          error={weatherError}
          provider={weatherProvider || undefined}
        />

        <QuickActions
          onAskQuestion={handleStartChat}
          onTakePhoto={handleTakePhoto}
          onViewHistory={handleViewHistory}
        />

        <ContentCarousel
          title={t('content.forYou')}
          items={content}
          onItemPress={handleContentPress}
          onSeeAll={() => {}}
          loading={loading}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerLogo: { width: 32, height: 32 },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.xs },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
