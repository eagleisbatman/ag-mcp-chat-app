import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { t } from '../constants/strings';

export default function LocationScreen({ navigation }) {
  const { theme, setLocation } = useApp();
  const { showWarning, showError } = useToast();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
  const bottomPadding = Math.max(insets.bottom + 24, 40);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = async () => {
    console.log('📍 [LocationScreen] User tapped "Enable Location"');
    setIsLoading(true);
    setError(null);

    try {
      console.log('📍 [LocationScreen] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 [LocationScreen] Permission status:', status);

      if (status !== 'granted') {
        // Permission denied - fall back to IP location
        console.log('📍 [LocationScreen] Permission denied, using IP location...');
        showWarning(t('onboarding.usingIpLocation'));
        await fetchIPLocationAndContinue();
        return;
      }

      console.log('📍 [LocationScreen] Getting current position...');
      try {
        // First try getLastKnownPositionAsync (instant, from cache)
        let loc = await Location.getLastKnownPositionAsync();
        console.log('📍 [LocationScreen] Last known position:', loc?.coords);

        // If no cached location, use getCurrentPositionAsync (active GPS request)
        if (!loc?.coords) {
          console.log('📍 [LocationScreen] No cached location, requesting fresh GPS fix...');
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000,
          });
          console.log('📍 [LocationScreen] getCurrentPositionAsync result:', loc?.coords);
        }

        // Final fallback: try with lower accuracy if high accuracy fails
        if (!loc?.coords) {
          console.log('📍 [LocationScreen] Balanced accuracy failed, trying low accuracy...');
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 10000,
          });
        }

        if (loc?.coords) {
          console.log('📍 [LocationScreen] Got GPS position:', {
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
          console.log('📍 [LocationScreen] GPS returned no coords, using IP location...');
          showWarning(t('onboarding.gpsFailed'));
          await fetchIPLocationAndContinue();
        }
      } catch (gpsError) {
        // GPS failed - fall back to IP location
        console.log('📍 [LocationScreen] GPS failed, using IP location...', gpsError.message);
        showWarning(t('onboarding.gpsFailed'));
        await fetchIPLocationAndContinue();
      }
    } catch (err) {
      setError(t('onboarding.locationError'));
      showError(t('onboarding.locationError'));
      console.log('❌ [LocationScreen] Location error:', err);
      setIsLoading(false);
    }
  };

  // Fetch location from IP and continue to next screen
  const fetchIPLocationAndContinue = async () => {
    try {
      console.log('🌐 [LocationScreen] Fetching IP-based location...');
      const { lookupLocation } = require('../services/db');

      const result = await lookupLocation(null, null, 'auto');

      if (result.success && result.latitude && result.longitude) {
        console.log('🌐 [LocationScreen] IP location:', result.displayName);
        await setLocation(
          { latitude: result.latitude, longitude: result.longitude },
          'granted'
        );
        navigation.navigate('Language');
      } else {
        console.log('❌ [LocationScreen] IP location also failed:', result.error);
        setError(t('onboarding.locationError'));
        setIsLoading(false);
      }
    } catch (error) {
      console.log('❌ [LocationScreen] IP location error:', error.message);
      setError(t('onboarding.locationError'));
      setIsLoading(false);
    }
  };

  const skipLocation = async () => {
    // Skip button also uses IP-based location
    console.log('📍 [LocationScreen] User tapped Skip, using IP location...');
    setIsLoading(true);
    await fetchIPLocationAndContinue();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: headerPaddingTop, paddingBottom: bottomPadding }]}>
      {/* Icon */}
      <View style={styles.iconSection}>
        <View style={styles.iconContainer}>
          <AppIcon name="location" size={64} color={theme.accent} />
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

        <Button
          title={t('common.skipForNow')}
          onPress={skipLocation}
          variant="secondary"
          accessibilityLabel={t('common.skipForNow')}
          style={styles.secondaryButton}
          textStyle={[styles.secondaryButtonText, { color: theme.textSecondary }]}
        />
      </View>
    </View>
  );
}

function BenefitItem({ icon, text, theme }) {
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
  iconSection: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.relaxed,
    marginBottom: SPACING['3xl'],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING['2xl'],
    gap: SPACING.sm,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
  },
  benefits: {
    gap: SPACING.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  benefitText: {
    fontSize: TYPOGRAPHY.sizes.base,
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
