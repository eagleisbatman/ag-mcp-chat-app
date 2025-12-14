/**
 * DecisionTreeWidget - Input widget for TomorrowNow crop recommendations
 *
 * Features:
 * - Crop selection
 * - Growth stage selector
 * - Weather conditions input
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import DropdownSelector from '../shared/DropdownSelector';
import SliderInput from '../shared/SliderInput';
import ActionButton from '../shared/ActionButton';

const CROP_OPTIONS = [
  { value: 'maize', label: 'Maize' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'sorghum', label: 'Sorghum' },
  { value: 'teff', label: 'Teff' },
  { value: 'barley', label: 'Barley' },
];

const GROWTH_STAGE_OPTIONS = [
  { value: 'germination', label: 'Germination (0-10%)' },
  { value: 'vegetative', label: 'Vegetative (10-40%)' },
  { value: 'flowering', label: 'Flowering (40-60%)' },
  { value: 'grain_filling', label: 'Grain Filling (60-90%)' },
  { value: 'maturity', label: 'Maturity (90-100%)' },
];

export default function DecisionTreeWidget({ onSubmit, data = {} }) {
  const { theme, location: appLocation } = useApp();

  const [formData, setFormData] = useState({
    crop: data.crop || 'maize',
    growthStage: data.growthStage || 'vegetative',
    gdd: data.gdd || 500, // Growing Degree Days
    temperature: data.temperature || 25,
    humidity: data.humidity || 60,
  });

  const handleCropChange = (crop) => {
    setFormData(prev => ({ ...prev, crop }));
  };

  const handleStageChange = (growthStage) => {
    setFormData(prev => ({ ...prev, growthStage }));
  };

  const handleSubmit = () => {
    onSubmit({
      widget_type: 'decision_tree_input',
      data: {
        crop: formData.crop,
        growth_stage: formData.growthStage,
        gdd: formData.gdd,
        weather: {
          temperature: formData.temperature,
          humidity: formData.humidity,
        },
        latitude: appLocation?.latitude,
        longitude: appLocation?.longitude,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Crop Advisor</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Get recommendations based on crop stage and conditions
      </Text>

      <View style={styles.form}>
        <DropdownSelector
          label="Select Crop"
          options={CROP_OPTIONS}
          selectedValue={formData.crop}
          onSelect={handleCropChange}
        />

        <DropdownSelector
          label="Growth Stage"
          options={GROWTH_STAGE_OPTIONS}
          selectedValue={formData.growthStage}
          onSelect={handleStageChange}
        />

        <SliderInput
          label="Growing Degree Days (GDD)"
          value={formData.gdd}
          onValueChange={(v) => setFormData({ ...formData, gdd: Math.round(v) })}
          minimumValue={0}
          maximumValue={2000}
          step={50}
        />

        <View style={styles.weatherSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Current Weather
          </Text>
          <SliderInput
            label="Temperature"
            value={formData.temperature}
            onValueChange={(v) => setFormData({ ...formData, temperature: Math.round(v) })}
            minimumValue={0}
            maximumValue={45}
            step={1}
            unit="°C"
          />
          <SliderInput
            label="Humidity"
            value={formData.humidity}
            onValueChange={(v) => setFormData({ ...formData, humidity: Math.round(v) })}
            minimumValue={0}
            maximumValue={100}
            step={5}
            unit="%"
          />
        </View>

        <ActionButton
          label="Get Recommendations"
          icon="leaf"
          onPress={handleSubmit}
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
  weatherSection: {
    marginTop: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.sm,
  },
});
