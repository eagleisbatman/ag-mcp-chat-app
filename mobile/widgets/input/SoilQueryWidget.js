/**
 * SoilQueryWidget - Input widget for ISDA Soil queries
 *
 * Features:
 * - Location picker (map or coordinates)
 * - Depth selector: [0-20cm] [20-50cm] [Both]
 * - Quick actions for common queries
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import LocationPicker from '../shared/LocationPicker';
import ChipSelector from '../shared/ChipSelector';
import ActionButton from '../shared/ActionButton';

const DEPTH_OPTIONS = [
  { value: '0-20', label: '0-20 cm' },
  { value: '20-50', label: '20-50 cm' },
  { value: 'both', label: 'Both Depths' },
];

export default function SoilQueryWidget({ onSubmit, data = {} }) {
  const { theme, location: appLocation, locationDetails } = useApp();

  const [formData, setFormData] = useState({
    location: data.location || (appLocation?.latitude ? {
      latitude: appLocation.latitude,
      longitude: appLocation.longitude,
      displayName: locationDetails?.displayName,
    } : null),
    depth: data.depth || 'both',
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

  const handleDepthChange = (depth) => {
    setFormData(prev => ({ ...prev, depth }));
  };

  const handleSubmit = () => {
    if (!formData.location?.latitude) return;
    onSubmit({
      widget_type: 'soil_query_input',
      data: {
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        depth: formData.depth,
      },
    });
  };

  const isValid = formData.location?.latitude;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Soil Analysis</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Get soil properties for your location (Africa only)
      </Text>

      <View style={styles.form}>
        <LocationPicker
          label="Location"
          value={formData.location}
          onChange={handleLocationChange}
          placeholder="Select your farm location"
        />

        <ChipSelector
          label="Soil Depth"
          options={DEPTH_OPTIONS}
          selectedValue={formData.depth}
          onSelect={handleDepthChange}
        />

        <ActionButton
          label="Get Soil Profile"
          icon="layers"
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
