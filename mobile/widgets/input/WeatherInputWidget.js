/**
 * WeatherInputWidget - Clean, minimal weather forecast input
 *
 * UX Design:
 * - Shows current location status (not a picker)
 * - Simple period selection chips
 * - Single action button
 * - No redundant text
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

const FORECAST_OPTIONS = [
  { value: 1, label: 'Today' },
  { value: 3, label: '3 Days' },
  { value: 5, label: '5 Days' },
];

export default function WeatherInputWidget({ onSubmit }) {
  const { theme, location, locationDetails, setLocation } = useApp();
  const [days, setDays] = useState(5);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const hasLocation = location?.latitude && location?.longitude;
  const locationName = locationDetails?.displayName ||
                       locationDetails?.level5City ||
                       locationDetails?.level3District ||
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
    if (!hasLocation) return;
    onSubmit({
      widget_type: 'weather_input',
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        days,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Location Status */}
      <View style={styles.locationSection}>
        {hasLocation ? (
          <View style={styles.locationActive}>
            <AppIcon name="location" size={18} color={theme.success} />
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {locationName}
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

      {/* Forecast Period */}
      <View style={styles.periodSection}>
        <Text style={[styles.periodLabel, { color: theme.textMuted }]}>Forecast</Text>
        <View style={styles.periodChips}>
          {FORECAST_OPTIONS.map((option) => {
            const isSelected = days === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surfaceVariant,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }
                ]}
                onPress={() => setDays(option.value)}
              >
                <Text style={[
                  styles.chipText,
                  { color: isSelected ? '#FFFFFF' : theme.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          {
            backgroundColor: hasLocation ? theme.accent : theme.surfaceVariant,
            opacity: hasLocation ? 1 : 0.5,
          }
        ]}
        onPress={handleSubmit}
        disabled={!hasLocation}
      >
        <AppIcon name="cloud" size={20} color={hasLocation ? '#FFFFFF' : theme.textMuted} />
        <Text style={[
          styles.submitText,
          { color: hasLocation ? '#FFFFFF' : theme.textMuted }
        ]}>
          Get Forecast
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.lg,
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
  periodSection: {
    gap: SPACING.sm,
  },
  periodLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
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
});
