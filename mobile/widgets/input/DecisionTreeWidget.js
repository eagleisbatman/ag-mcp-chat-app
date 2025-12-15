/**
 * DecisionTreeWidget - Clean crop advisor input
 *
 * UX Design:
 * - Crop chips at top
 * - Growth stage chips
 * - Location status (Kenya focus)
 * - Single action button
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

const CROP_OPTIONS = [
  { value: 'maize', label: 'Maize', icon: 'leaf' },
  { value: 'wheat', label: 'Wheat', icon: 'leaf' },
  { value: 'sorghum', label: 'Sorghum', icon: 'leaf' },
  { value: 'beans', label: 'Beans', icon: 'leaf' },
];

const GROWTH_STAGES = [
  { value: 'germination', label: 'Germination' },
  { value: 'vegetative', label: 'Vegetative' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'grain_filling', label: 'Grain Fill' },
  { value: 'maturity', label: 'Maturity' },
];

// Kenya boundary check (TomorrowNow coverage)
const isInKenya = (lat, lon) => lat >= -5 && lat <= 5 && lon >= 33 && lon <= 42;

export default function DecisionTreeWidget({ onSubmit }) {
  const { theme, location, locationDetails, setLocation } = useApp();
  const [crop, setCrop] = useState('maize');
  const [growthStage, setGrowthStage] = useState('vegetative');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const hasLocation = location?.latitude && location?.longitude;
  const inKenya = hasLocation && isInKenya(location.latitude, location.longitude);
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
    if (!hasLocation || !inKenya) return;
    onSubmit({
      widget_type: 'decision_tree_input',
      data: {
        crop,
        growth_stage: growthStage,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
  };

  const canSubmit = hasLocation && inKenya;

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
                <AppIcon name={option.icon} size={14} color={isSelected ? '#FFFFFF' : theme.textMuted} />
                <Text style={[styles.cropText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Growth Stage */}
      <View style={styles.stageSection}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Growth Stage</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageScroll}>
          {GROWTH_STAGES.map((stage) => {
            const isSelected = growthStage === stage.value;
            return (
              <TouchableOpacity
                key={stage.value}
                style={[
                  styles.stageChip,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surfaceVariant,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }
                ]}
                onPress={() => setGrowthStage(stage.value)}
              >
                <Text style={[styles.stageText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                  {stage.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Location Status */}
      <View style={styles.locationSection}>
        {hasLocation ? (
          <View style={styles.locationActive}>
            <AppIcon name="location" size={18} color={inKenya ? theme.success : theme.error} />
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {locationName}
            </Text>
            <Text style={[
              styles.regionBadge,
              {
                backgroundColor: inKenya ? theme.accentLight : theme.errorLight,
                color: inKenya ? theme.accent : theme.error
              }
            ]}>
              {inKenya ? 'Kenya' : 'Outside Coverage'}
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

      {/* Coverage Notice */}
      {hasLocation && !inKenya && (
        <View style={[styles.noticeBox, { backgroundColor: theme.errorLight }]}>
          <AppIcon name="alert-circle" size={16} color={theme.error} />
          <Text style={[styles.noticeText, { color: theme.error }]}>
            Crop recommendations are only available for Kenya
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
        <AppIcon name="leaf" size={20} color={canSubmit ? '#FFFFFF' : theme.textMuted} />
        <Text style={[styles.submitText, { color: canSubmit ? '#FFFFFF' : theme.textMuted }]}>
          Get Recommendations
        </Text>
      </TouchableOpacity>

      {/* Attribution */}
      <Text style={[styles.attribution, { color: theme.textMuted }]}>
        TomorrowNow GAP • Kenya
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
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  cropText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  stageSection: {
    gap: SPACING.sm,
  },
  stageScroll: {
    gap: SPACING.sm,
  },
  stageChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  stageText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
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
