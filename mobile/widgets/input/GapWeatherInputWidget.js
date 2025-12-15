/**
 * GapWeatherInputWidget - Clean GAP Weather input for Kenya
 *
 * UX Design:
 * - Forecast type tabs at top
 * - Location status (not complex picker)
 * - Duration chips (when applicable)
 * - Single action button
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Forecast types with their configurations
const FORECAST_TYPES = [
  { id: 'salient', label: 'Weather', icon: 'sunny', days: [3, 7, 14], defaultDays: 7, tool: 'get_gap_weather_forecast' },
  { id: 'cbam', label: 'Agricultural', icon: 'leaf', days: [3, 5, 10], defaultDays: 5, tool: 'get_cbam_daily_forecast' },
  { id: 'nowcast', label: 'Rain Alert', icon: 'rainy', days: null, tool: 'get_nowcast_precipitation' },
];

export default function GapWeatherInputWidget({ onSubmit }) {
  const { theme, location, locationDetails, setLocation } = useApp();
  const [forecastType, setForecastType] = useState('salient');
  const [days, setDays] = useState(7);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const currentConfig = FORECAST_TYPES.find(t => t.id === forecastType);
  const hasLocation = location?.latitude && location?.longitude;
  const locationName = locationDetails?.displayName ||
                       locationDetails?.level5City ||
                       (hasLocation ? `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°` : null);

  // Reset days when forecast type changes
  useEffect(() => {
    if (currentConfig?.days) {
      setDays(currentConfig.defaultDays);
    }
  }, [forecastType]);

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
      widget_type: 'gap_weather_input',
      data: {
        forecast_type: forecastType,
        tool: currentConfig.tool,
        latitude: location.latitude,
        longitude: location.longitude,
        days: currentConfig.days ? days : undefined,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Forecast Type Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FORECAST_TYPES.map((type) => {
            const isSelected = forecastType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.tab,
                  { backgroundColor: isSelected ? theme.accent : theme.surfaceVariant }
                ]}
                onPress={() => setForecastType(type.id)}
              >
                <AppIcon name={type.icon} size={16} color={isSelected ? '#FFFFFF' : theme.textMuted} />
                <Text style={[styles.tabText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                  {type.label}
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
            <AppIcon name="location" size={18} color={theme.success} />
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {locationName}
            </Text>
            <Text style={[styles.regionBadge, { backgroundColor: theme.accentLight, color: theme.accent }]}>
              Kenya
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

      {/* Duration Chips (for non-nowcast) */}
      {currentConfig?.days && (
        <View style={styles.durationSection}>
          <Text style={[styles.durationLabel, { color: theme.textMuted }]}>Duration</Text>
          <View style={styles.durationChips}>
            {currentConfig.days.map((d) => {
              const isSelected = days === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.surfaceVariant,
                      borderColor: isSelected ? theme.accent : theme.border,
                    }
                  ]}
                  onPress={() => setDays(d)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                    {d} Days
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Nowcast Info */}
      {forecastType === 'nowcast' && (
        <View style={[styles.infoBox, { backgroundColor: theme.infoLight || theme.accentLight }]}>
          <AppIcon name="time-outline" size={16} color={theme.info || theme.accent} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            Next 12 hours rain probability
          </Text>
        </View>
      )}

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
        <AppIcon name={currentConfig?.icon || 'sunny'} size={20} color={hasLocation ? '#FFFFFF' : theme.textMuted} />
        <Text style={[styles.submitText, { color: hasLocation ? '#FFFFFF' : theme.textMuted }]}>
          Get {currentConfig?.label || 'Forecast'}
        </Text>
      </TouchableOpacity>

      {/* Attribution */}
      <Text style={[styles.attribution, { color: theme.textMuted }]}>
        TomorrowNow GAP Platform
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
  tabsContainer: {
    marginHorizontal: -SPACING.xs,
  },
  tabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
  },
  tabText: {
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
  durationSection: {
    gap: SPACING.sm,
  },
  durationLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationChips: {
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
  },
  infoText: {
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
