/**
 * SoilQueryWidget - Clean ISDA Soil query input
 *
 * UX Design:
 * - Location status (not complex picker)
 * - Depth chips
 * - Single action button
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

const DEPTH_OPTIONS = [
  { value: '0-20', label: '0-20 cm' },
  { value: '20-50', label: '20-50 cm' },
  { value: 'both', label: 'Both' },
];

export default function SoilQueryWidget({ onSubmit }) {
  const { theme, location, locationDetails, setLocation } = useApp();
  const [depth, setDepth] = useState('both');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const hasLocation = location?.latitude && location?.longitude;
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
    if (!hasLocation) return;
    onSubmit({
      widget_type: 'soil_query_input',
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        depth,
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
            <Text style={[styles.regionBadge, { backgroundColor: theme.accentLight, color: theme.accent }]}>
              Africa
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

      {/* Depth Chips */}
      <View style={styles.depthSection}>
        <Text style={[styles.depthLabel, { color: theme.textMuted }]}>Soil Depth</Text>
        <View style={styles.depthChips}>
          {DEPTH_OPTIONS.map((option) => {
            const isSelected = depth === option.value;
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
                onPress={() => setDepth(option.value)}
              >
                <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
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
        <AppIcon name="layers" size={20} color={hasLocation ? '#FFFFFF' : theme.textMuted} />
        <Text style={[styles.submitText, { color: hasLocation ? '#FFFFFF' : theme.textMuted }]}>
          Get Soil Profile
        </Text>
      </TouchableOpacity>

      {/* Attribution */}
      <Text style={[styles.attribution, { color: theme.textMuted }]}>
        iSDAsoil • 30m Resolution
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
  depthSection: {
    gap: SPACING.sm,
  },
  depthLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  depthChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.sm,
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
  attribution: {
    fontSize: 10,
    textAlign: 'center',
  },
});
