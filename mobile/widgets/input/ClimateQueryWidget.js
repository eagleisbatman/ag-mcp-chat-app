/**
 * ClimateQueryWidget - Input widget for EDACaP climate forecasts
 *
 * Features:
 * - Location picker or weather station selector
 * - Forecast type: [Climate] [Crop Yield]
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import LocationPicker from '../shared/LocationPicker';
import ChipSelector from '../shared/ChipSelector';
import ActionButton from '../shared/ActionButton';

const FORECAST_TYPE_OPTIONS = [
  { value: 'climate', label: 'Climate Forecast' },
  { value: 'crop', label: 'Crop Yield' },
];

export default function ClimateQueryWidget({ onSubmit, data = {} }) {
  const { theme, location: appLocation, locationDetails } = useApp();

  const [formData, setFormData] = useState({
    location: data.location || (appLocation?.latitude ? {
      latitude: appLocation.latitude,
      longitude: appLocation.longitude,
      displayName: locationDetails?.displayName,
    } : null),
    forecastType: data.forecastType || 'climate',
  });

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

  const handleTypeChange = (forecastType) => {
    setFormData(prev => ({ ...prev, forecastType }));
  };

  const handleSubmit = () => {
    if (!formData.location?.latitude) return;
    onSubmit({
      widget_type: 'climate_query_input',
      data: {
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        forecastType: formData.forecastType,
      },
    });
  };

  const isValid = formData.location?.latitude;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Seasonal Forecast</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Get seasonal climate outlook for Ethiopia
      </Text>

      <View style={styles.form}>
        <ChipSelector
          label="Forecast Type"
          options={FORECAST_TYPE_OPTIONS}
          selectedValue={formData.forecastType}
          onSelect={handleTypeChange}
        />

        <LocationPicker
          label="Location"
          value={formData.location}
          onChange={handleLocationChange}
          placeholder="Select your location"
        />

        <ActionButton
          label="Get Forecast"
          icon="calendar"
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
