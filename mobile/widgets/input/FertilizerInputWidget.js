/**
 * FertilizerInputWidget - Input widget for NextGen fertilizer recommendations
 *
 * Features:
 * - Crop selector: [Wheat] [Maize]
 * - Location picker (Ethiopia boundary validation)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import LocationPicker from '../shared/LocationPicker';
import ChipSelector from '../shared/ChipSelector';
import ActionButton from '../shared/ActionButton';

const CROP_OPTIONS = [
  { value: 'wheat', label: 'Wheat' },
  { value: 'maize', label: 'Maize' },
];

// Ethiopia boundary check (simplified)
const isInEthiopia = (lat, lon) => {
  return lat >= 3 && lat <= 15 && lon >= 33 && lon <= 48;
};

export default function FertilizerInputWidget({ onSubmit, data = {} }) {
  const { theme, location: appLocation, locationDetails } = useApp();

  const [formData, setFormData] = useState({
    location: data.location || (appLocation?.latitude ? {
      latitude: appLocation.latitude,
      longitude: appLocation.longitude,
      displayName: locationDetails?.displayName,
    } : null),
    crop: data.crop || 'wheat',
  });
  const [boundaryError, setBoundaryError] = useState(false);

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
    if (location?.latitude) {
      setBoundaryError(!isInEthiopia(location.latitude, location.longitude));
    } else {
      setBoundaryError(false);
    }
  };

  const handleCropChange = (crop) => {
    setFormData(prev => ({ ...prev, crop }));
  };

  const handleSubmit = () => {
    if (!formData.location?.latitude || boundaryError) return;
    onSubmit({
      widget_type: 'fertilizer_input',
      data: {
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        crop: formData.crop,
      },
    });
  };

  const isValid = formData.location?.latitude && !boundaryError;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Fertilizer Advisor</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Get site-specific fertilizer recommendations (Ethiopia only)
      </Text>

      <View style={styles.form}>
        <ChipSelector
          label="Select Crop"
          options={CROP_OPTIONS}
          selectedValue={formData.crop}
          onSelect={handleCropChange}
        />

        <LocationPicker
          label="Farm Location"
          value={formData.location}
          onChange={handleLocationChange}
          placeholder="Select your farm location"
        />

        {boundaryError && (
          <View style={[styles.errorBox, { backgroundColor: theme.errorLight }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>
              Location must be within Ethiopia for fertilizer recommendations
            </Text>
          </View>
        )}

        <ActionButton
          label="Get Recommendations"
          icon="flask"
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
  errorBox: {
    padding: SPACING.md,
    borderRadius: SPACING.radiusSm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
