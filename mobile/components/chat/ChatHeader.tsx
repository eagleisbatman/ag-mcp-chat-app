/**
 * Chat screen header with logo, location display, and action buttons
 */
import React, { memo } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import ScreenHeader from '../ui/ScreenHeader';
import IconButton from '../ui/IconButton';
import { t } from '../../constants/strings';

const logoImage = require('../../assets/logo.png');

interface ChatHeaderProps {
  onRefreshLocation: () => void;
  onNewSession: () => void;
  onOpenSettings: () => void;
  isRefreshing?: boolean;
}

function ChatHeader({
  onRefreshLocation,
  onNewSession,
  onOpenSettings,
  isRefreshing = false,
}: ChatHeaderProps): JSX.Element {
  const { theme, isDark, location, locationDetails } = useApp();

  // Build location display text
  const locationDisplayText = isRefreshing
    ? t('chat.updatingLocation')
    : locationDetails?.displayName ||
      locationDetails?.level5City ||
      locationDetails?.level3District ||
      locationDetails?.level2State ||
      (location?.latitude !== null && location?.longitude !== null
        ? `${location.latitude!.toFixed(2)}, ${location.longitude!.toFixed(2)}` 
        : t('chat.setLocation'));

  return (
    <ScreenHeader
      align="left"
      center={
        <Pressable 
          style={styles.headerLeft} 
          onPress={onRefreshLocation}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.refreshLocation')}
        >
          <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.headerTextContainer}>
            <Text 
              style={[styles.headerSubtitle, { color: theme.textMuted }]} 
              numberOfLines={1}
            >
              {locationDisplayText}
            </Text>
            {!isRefreshing && locationDetails?.source === 'ip' && (
              <Text style={[styles.accuracyNudge, { color: theme.warning }]}>
                {t('chat.lowAccuracy')} • {t('chat.tapToImprove')}
              </Text>
            )}
          </View>
        </Pressable>
      }
      right={
        <>
          <IconButton
            icon="location"
            onPress={onRefreshLocation}
            loading={isRefreshing}
            size={36}
            borderRadius={10}
            backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
            color={theme.icon}
            accessibilityLabel={t('a11y.refreshLocation')}
          />
          <IconButton
            icon="add"
            onPress={onNewSession}
            size={36}
            borderRadius={10}
            backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
            color={theme.icon}
            accessibilityLabel={t('a11y.newChat')}
          />
          <IconButton
            icon="menu"
            onPress={onOpenSettings}
            size={36}
            borderRadius={10}
            backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
            color={theme.icon}
            accessibilityLabel={t('a11y.openSettings')}
          />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    paddingRight: SPACING.md,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  accuracyNudge: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
});

export default memo(ChatHeader);
