import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Image, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../contexts/AppContext';
import { t } from '../constants/strings';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import WeatherWidget from '../components/weather/WeatherWidget';
import ContentCarousel from '../components/content/ContentCarousel';
import QuickActions from '../components/home/QuickActions';
import NotificationBanner from '../components/notifications/NotificationBanner';

import { weatherService } from '../services/weather';
import { contentService } from '../services/content';

const logoImage = require('../assets/logo.png');

/**
 * HomeScreen - Main home screen with weather widget, quick actions, and content carousel
 */
export default function HomeScreen({ navigation }) {
  const { location, locationDetails, language, theme, isDark } = useApp();
  const insets = useSafeAreaInsets();

  // State
  const [weather, setWeather] = useState(null);
  const [content, setContent] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Load all home screen data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Only load weather if we have location
      if (location?.latitude && location?.longitude) {
        // Load weather and content in parallel
        const [weatherData, contentData, alertsData] = await Promise.all([
          weatherService.getCurrentAndForecast(
            location.latitude,
            location.longitude,
            language?.code || 'en'
          ),
          contentService.getFeed(
            location.latitude,
            location.longitude,
            language?.code || 'en'
          ),
          weatherService.getAlerts(location.latitude, location.longitude),
        ]);

        setWeather(weatherData);
        setContent(contentData);
        setAlerts(alertsData);
      } else {
        // No location - just load content
        const contentData = await contentService.getFeed(
          null,
          null,
          language?.code || 'en'
        );
        setContent(contentData);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, [location, language]);

  // Load data on mount and when location/language changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Handle content item press
   */
  const handleContentPress = (item) => {
    navigation.navigate('ContentDetail', { contentId: item.id || item._id });
  };

  /**
   * Handle "Ask Question" quick action - navigate to chat
   */
  const handleStartChat = () => {
    navigation.navigate('Chat');
  };

  /**
   * Handle "Diagnose Plant" quick action - navigate to chat with camera intent
   */
  const handleTakePhoto = () => {
    navigation.navigate('Chat', { openCamera: true });
  };

  /**
   * Handle "View History" quick action
   */
  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  /**
   * Dismiss a weather alert
   */
  const handleAlertDismiss = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        align="left"
        center={
          <Pressable style={styles.headerLeft}>
            <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {t('onboarding.appName') || 'FarmerChat'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {locationDetails?.displayName ||
                  locationDetails?.level5City ||
                  locationDetails?.level3District ||
                  (location?.latitude
                    ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`
                    : t('chat.setLocation') || 'Set your location')}
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
              accessibilityLabel={t('a11y.startNewChat') || 'Start a new chat'}
            />
            <IconButton
              icon="settings-outline"
              onPress={() => navigation.navigate('Settings')}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('a11y.openSettings') || 'Open settings'}
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
        {/* Persistent Weather Alert Banner */}
        {alerts.length > 0 && (
          <NotificationBanner
            alerts={alerts}
            onDismiss={handleAlertDismiss}
          />
        )}

        {/* Weather Widget */}
        <WeatherWidget
          data={weather}
          loading={loading && location?.latitude != null}
        />

        {/* Quick Actions */}
        <QuickActions
          onAskQuestion={handleStartChat}
          onTakePhoto={handleTakePhoto}
          onViewHistory={handleViewHistory}
        />

        {/* Content Feed */}
        <ContentCarousel
          title={t('content_for_you') || 'For You'}
          items={content}
          onItemPress={handleContentPress}
          onSeeAll={() => navigation.navigate('ContentFeed')}
          loading={loading}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
