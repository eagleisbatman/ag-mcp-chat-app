/**
 * WeatherInputWidget - Input widget for weather forecast requests
 *
 * Features:
 * - Location picker (current location or manual)
 * - Days selector (1-15 day forecast)
 * - Quick action buttons: "Today", "5-Day", "This Week"
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import LocationPicker from '../shared/LocationPicker';
import ChipSelector from '../shared/ChipSelector';
import ActionButton from '../shared/ActionButton';

const QUICK_OPTIONS = [
  { value: 1, label: 'Today' },
  { value: 5, label: '5-Day' },
  { value: 7, label: 'This Week' },
  { value: 15, label: '15-Day' },
];

export default function WeatherInputWidget({ onSubmit, data = {} }) {
  const { theme, location: appLocation, locationDetails } = useApp();

  // Form state with defaults from app location
  const [formData, setFormData] = useState({
    location: data.location || (appLocation?.latitude ? {
      latitude: appLocation.latitude,
      longitude: appLocation.longitude,
      displayName: locationDetails?.displayName,
    } : null),
    days: data.days || 5,
  });

  // Update location when app location changes
  useEffect(() => {
    if (appLocation?.latitude && !formData.location) {
      setFormData(prev => ({
        ...prev,
        location: {
          latitude: appLocation.latitude,
          longitude: appLocation.longitude,
          displayName: locationDetails?.displayName,
        },
      }));
    }
  }, [appLocation, locationDetails]);

  const handleLocationChange = (location) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const handleDaysChange = (days) => {
    setFormData(prev => ({ ...prev, days }));
  };

  const handleSubmit = () => {
    if (!formData.location?.latitude) {
      return; // Location required
    }
    onSubmit({
      widget_type: 'weather_input',
      data: {
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        days: formData.days,
      },
    });
  };

  const isValid = formData.location?.latitude && formData.days > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Weather Forecast</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Get the weather forecast for your location
      </Text>

      <View style={styles.form}>
        <LocationPicker
          label="Location"
          value={formData.location}
          onChange={handleLocationChange}
          placeholder="Select your location"
        />

        <ChipSelector
          label="Forecast Period"
          options={QUICK_OPTIONS}
          selectedValue={formData.days}
          onSelect={handleDaysChange}
        />

        <ActionButton
          label="Get Weather Forecast"
          icon="cloud"
          onPress={handleSubmit}
          disabled={!isValid}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    borderRadius: SPACING.radiusMd,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginBottom: SPACING.lg,
  },
  form: {
    gap: SPACING.md,
  },
});
