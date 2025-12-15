/**
 * FertilizerInputWidget - Clean fertilizer recommendation input
 *
 * UX Design:
 * - Crop chips at top
 * - Location status (Ethiopia only)
 * - Single action button
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

const CROP_OPTIONS = [
  { value: 'wheat', label: 'Wheat', icon: 'leaf' },
  { value: 'maize', label: 'Maize', icon: 'leaf' },
];

// Ethiopia boundary check
const isInEthiopia = (lat, lon) => lat >= 3 && lat <= 15 && lon >= 33 && lon <= 48;

export default function FertilizerInputWidget({ onSubmit }) {
  const { theme, location, locationDetails, setLocation } = useApp();
  const [crop, setCrop] = useState('wheat');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const hasLocation = location?.latitude && location?.longitude;
  const inEthiopia = hasLocation && isInEthiopia(location.latitude, location.longitude);
  const locationName = locationDetails?.displayName ||
                       locationDetails?.level5City ||
                       (hasLocation ? `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°` : null);

  const handleEnableLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 'granted');
      }
    } catch (error) {
      console.log('Location error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!hasLocation || !inEthiopia) return;
    onSubmit({
      widget_type: 'fertilizer_input',
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        crop,
      },
    });
  };

  const canSubmit = hasLocation && inEthiopia;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Crop Selection */}
      <View style={styles.cropSection}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Select Crop</Text>
        <View style={styles.cropChips}>
          {CROP_OPTIONS.map((option) => {
            const isSelected = crop === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.cropChip,
                  { backgroundColor: isSelected ? theme.accent : theme.surfaceVariant }
                ]}
                onPress={() => setCrop(option.value)}
              >
                <AppIcon name={option.icon} size={16} color={isSelected ? '#FFFFFF' : theme.textMuted} />
                <Text style={[styles.cropText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Location Status */}
      <View style={styles.locationSection}>
        {hasLocation ? (
          <View style={styles.locationActive}>
            <AppIcon name="location" size={18} color={inEthiopia ? theme.success : theme.error} />
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {locationName}
            </Text>
            <Text style={[
              styles.regionBadge,
              {
                backgroundColor: inEthiopia ? theme.accentLight : theme.errorLight,
                color: inEthiopia ? theme.accent : theme.error
              }
            ]}>
              {inEthiopia ? 'Ethiopia' : 'Outside Ethiopia'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.enableLocationBtn, { backgroundColor: theme.accentLight }]}
            onPress={handleEnableLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <>
                <AppIcon name="location-outline" size={18} color={theme.accent} />
                <Text style={[styles.enableLocationText, { color: theme.accent }]}>
                  Enable Location
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Ethiopia Notice */}
      {hasLocation && !inEthiopia && (
        <View style={[styles.noticeBox, { backgroundColor: theme.errorLight }]}>
          <AppIcon name="alert-circle" size={16} color={theme.error} />
          <Text style={[styles.noticeText, { color: theme.error }]}>
            Fertilizer recommendations are only available for Ethiopia
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          {
            backgroundColor: canSubmit ? theme.accent : theme.surfaceVariant,
            opacity: canSubmit ? 1 : 0.5,
          }
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <AppIcon name="flask" size={20} color={canSubmit ? '#FFFFFF' : theme.textMuted} />
        <Text style={[styles.submitText, { color: canSubmit ? '#FFFFFF' : theme.textMuted }]}>
          Get Recommendations
        </Text>
      </TouchableOpacity>

      {/* Attribution */}
      <Text style={[styles.attribution, { color: theme.textMuted }]}>
        NextGen SSFR • Ethiopia
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cropSection: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cropChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cropChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  cropText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  locationSection: {
    minHeight: 44,
    justifyContent: 'center',
  },
  locationActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    flex: 1,
  },
  regionBadge: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semibold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  enableLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
  },
  enableLocationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  submitText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  attribution: {
    fontSize: 10,
    textAlign: 'center',
  },
});
