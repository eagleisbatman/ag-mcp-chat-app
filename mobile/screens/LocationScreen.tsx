import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { lookupLocation } from '../services/db';
import { log } from '../utils/logger';
import { t } from '../constants/strings';
import type { Theme, RootStackParamList, LocationDetails } from '../types';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

interface LocationScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Location'>;
}

interface BenefitItemProps {
  icon: string;
  text: string;
  theme: Theme;
}

export default function LocationScreen({ navigation }: LocationScreenProps) {
  const { theme, setLocation, detectedLocation, detectedCountry, detectedLanguage } = useApp();
  const { showWarning, showError } = useToast();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
  const bottomPadding = Math.max(insets.bottom + 24, 40);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const GPS_TIMEOUT_MS = 8000;

  // Display name for detected location
  const detectedLocationName = detectedLocation?.displayName || detectedLocation?.level5City || detectedLocation?.level3District || detectedLocation?.level2State || detectedCountry || null;

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    return await new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  };

  const requestLocation = async () => {
    log('📍 [LocationScreen] User tapped "Enable Location"');
    setIsLoading(true);
    setError(null);

    try {
      log('📍 [LocationScreen] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      log('📍 [LocationScreen] Permission status:', status);

      if (status !== 'granted') {
        // Permission denied - fall back to IP location
        log('📍 [LocationScreen] Permission denied, using IP location...');
        showWarning(t('onboarding.usingIpLocation'));
        await fetchIPLocationAndContinue();
        return;
      }

      log('📍 [LocationScreen] Getting current position...');
      try {
        // First try getLastKnownPositionAsync (instant, from cache)
        let loc = await Location.getLastKnownPositionAsync();
        log('📍 [LocationScreen] Last known position:', loc?.coords);

        // If no cached location, use getCurrentPositionAsync (active GPS request)
        if (!loc?.coords) {
          log('📍 [LocationScreen] No cached location, requesting fresh GPS fix...');
          loc = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            GPS_TIMEOUT_MS,
            'GPS balanced'
          );
          log('📍 [LocationScreen] getCurrentPositionAsync result:', loc?.coords);
        }

        // Final fallback: try with lower accuracy if high accuracy fails
        if (!loc?.coords) {
          log('📍 [LocationScreen] Balanced accuracy failed, trying low accuracy...');
          loc = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            GPS_TIMEOUT_MS,
            'GPS low'
          );
        }

        if (loc?.coords) {
          log('📍 [LocationScreen] Got GPS position:', {
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          });

          await setLocation(
            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
            'granted'
          );
          navigation.navigate('Language');
        } else {
          // No location from GPS - fall back to IP
          log('📍 [LocationScreen] GPS returned no coords, using IP location...');
          showWarning(t('onboarding.gpsFailed'));
          await fetchIPLocationAndContinue();
        }
      } catch (gpsError: any) {
        // GPS failed - fall back to IP location
        log('📍 [LocationScreen] GPS failed, using IP location...', gpsError.message);
        showWarning(t('onboarding.gpsFailed'));
        await fetchIPLocationAndContinue();
      }
    } catch (err: any) {
      setError(t('onboarding.locationError'));
      showError(t('onboarding.locationError'));
      log('❌ [LocationScreen] Location error:', err);
      setIsLoading(false);
    }
  };

  // Fetch location from IP and continue to next screen
  const fetchIPLocationAndContinue = async () => {
    try {
      log('🌐 [LocationScreen] Fetching IP-based location...');

      const result = await lookupLocation(null, null, 'auto');

      if (result.success && result.source !== 'none') {
        log('🌐 [LocationScreen] IP location lookup complete:', result.displayName);

        if (result.source === 'ip') {
          showWarning(t('onboarding.usingIpLocation'));
        }

        // Build location details from the result to avoid a redundant second API call
        const details: LocationDetails = {
          ...result,
          latitude: result.latitude ?? 0,
          longitude: result.longitude ?? 0,
          displayName: result.displayName || result.level5City || result.level3District || result.level2State || result.level1Country || 'Location set',
          source: (result.source as LocationDetails['source']) || 'ip',
        };

        await setLocation(
          { latitude: result.latitude ?? null, longitude: result.longitude ?? null },
          'granted',
          details
        );
        setIsLoading(false);
        navigation.navigate('Language');
      } else {
        // IP lookup returned no usable location — continue without coordinates
        log('⚠️ [LocationScreen] IP location returned no usable result, continuing without location');
        await setLocation({ latitude: null, longitude: null }, 'denied');
        setIsLoading(false);
        navigation.navigate('Language');
      }
    } catch (error: any) {
      log('❌ [LocationScreen] IP location error, continuing without location:', error.message);
      // Don't block the user — continue without coordinates
      await setLocation({ latitude: null, longitude: null }, 'denied');
      setIsLoading(false);
      navigation.navigate('Language');
    }
  };

  const skipLocation = async () => {
    // Skip button also uses IP-based location
    log('📍 [LocationScreen] User tapped Skip, using IP location...');
    setIsLoading(true);
    await fetchIPLocationAndContinue();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: headerPaddingTop, paddingBottom: bottomPadding }]}>
      {/* Language Switcher - Top Right */}
      <View style={styles.languageSwitcherContainer}>
        <LanguageSwitcher compact />
      </View>

      {/* Detected Location Card */}
      {detectedLocationName && (
        <View style={[styles.detectedCard, { backgroundColor: theme.accent + '15' }]}>
          <View style={styles.detectedCardContent}>
            <AppIcon name="location" size={20} color={theme.accent} />
            <View style={styles.detectedCardText}>
              <Text style={[styles.detectedLabel, { color: theme.textSecondary }]}>
                {t('onboarding.detectedLocation')}
              </Text>
              <Text style={[styles.detectedValue, { color: theme.text }]}>
                {detectedLocationName}
              </Text>
            </View>
          </View>
          <Text style={[styles.detectedHint, { color: theme.textMuted }]}>
            {t('onboarding.detectedLocationFrom')}
          </Text>
        </View>
      )}

      {/* Icon */}
      <View style={styles.iconSection}>
        <View style={styles.iconContainer}>
          <AppIcon name="navigate" size={64} color={theme.accent} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('onboarding.locationTitle')}
        </Text>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {t('onboarding.locationDescription')}
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <AppIcon name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {/* GPS Benefit highlight */}
        <View style={[styles.gpsHighlight, { backgroundColor: theme.inputBackground }]}>
          <AppIcon name="sparkles" size={20} color={theme.accent} />
          <Text style={[styles.gpsHighlightText, { color: theme.text }]}>
            {t('onboarding.gpsShareBenefit')}
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <BenefitItem
            icon="rainy-outline"
            text={t('onboarding.benefits.weather')}
            theme={theme}
          />
          <BenefitItem
            icon="earth-outline"
            text={t('onboarding.benefits.regionAdvice')}
            theme={theme}
          />
          <BenefitItem
            icon="analytics-outline"
            text={t('onboarding.benefits.soilData')}
            theme={theme}
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? t('common.loading') : t('onboarding.enableLocation')}
          onPress={requestLocation}
          disabled={isLoading}
          left={
            isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppIcon name="navigate" size={20} color="#FFFFFF" />
            )
          }
          accessibilityLabel={t('onboarding.enableLocation')}
          style={styles.primaryButton}
        />

        {detectedLocationName ? (
          <Button
            title={t('onboarding.continueWithDetected')}
            onPress={skipLocation}
            variant="secondary"
            accessibilityLabel={t('onboarding.continueWithDetected')}
            style={styles.secondaryButton}
            textStyle={[styles.secondaryButtonText, { color: theme.textSecondary }]}
          />
        ) : (
          <Button
            title={t('common.skipForNow')}
            onPress={skipLocation}
            variant="secondary"
            accessibilityLabel={t('common.skipForNow')}
            style={styles.secondaryButton}
            textStyle={[styles.secondaryButtonText, { color: theme.textSecondary }]}
          />
        )}
      </View>
    </View>
  );
}

function BenefitItem({ icon, text, theme }: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <AppIcon name={icon} size={20} color={theme.accent} />
      <Text style={[styles.benefitText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING['2xl'],
  },
  languageSwitcherContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  detectedCard: {
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  detectedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detectedCardText: {
    flex: 1,
  },
  detectedLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  detectedValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  detectedHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    marginLeft: 28,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.relaxed,
    marginBottom: SPACING.lg,
  },
  gpsHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  gpsHighlightText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.relaxed,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
  },
  benefits: {
    gap: SPACING.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  benefitText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  buttonContainer: {
    gap: SPACING.md,
  },
  primaryButton: {
    paddingVertical: SPACING.lg,
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
