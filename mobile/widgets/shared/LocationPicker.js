/**
 * LocationPicker - Location selection component
 *
 * Allows users to use current location or enter coordinates manually.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import AppIcon from '../../components/ui/AppIcon';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function LocationPicker({
  label,
  value, // { latitude, longitude }
  onChange,
  placeholder = 'Select location...',
  showManualInput = true,
  disabled = false,
}) {
  const { theme, location: appLocation, locationDetails } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState(value?.latitude?.toString() || '');
  const [manualLon, setManualLon] = useState(value?.longitude?.toString() || '');

  const handleUseCurrentLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      // First try using app's stored location
      if (appLocation?.latitude && appLocation?.longitude) {
        onChange({
          latitude: appLocation.latitude,
          longitude: appLocation.longitude,
          source: 'app',
          displayName: locationDetails?.displayName,
        });
        setIsLoading(false);
        return;
      }

      // Otherwise request fresh location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied - show manual input
        setShowManual(true);
        setIsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      onChange({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        source: 'device',
      });
    } catch (error) {
      console.log('Location error:', error);
      setShowManual(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({
        latitude: lat,
        longitude: lon,
        source: 'manual',
      });
      setShowManual(false);
    }
  };

  const formatLocation = () => {
    if (!value?.latitude || !value?.longitude) return placeholder;
    if (value.displayName) return value.displayName;
    return `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}

      {/* Current location display */}
      <View style={[styles.locationBox, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="location" size={20} color={value?.latitude ? theme.accent : theme.textMuted} />
        <Text
          style={[
            styles.locationText,
            { color: value?.latitude ? theme.text : theme.textMuted },
          ]}
          numberOfLines={1}
        >
          {formatLocation()}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={handleUseCurrentLocation}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <AppIcon name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Use My Location</Text>
            </>
          )}
        </Pressable>

        {showManualInput && (
          <Pressable
            style={[styles.buttonOutline, { borderColor: theme.accent }]}
            onPress={() => setShowManual(!showManual)}
            disabled={disabled}
          >
            <AppIcon name="create" size={16} color={theme.accent} />
            <Text style={[styles.buttonOutlineText, { color: theme.accent }]}>
              Enter Manually
            </Text>
          </Pressable>
        )}
      </View>

      {/* Manual input fields */}
      {showManual && (
        <View style={styles.manualInputs}>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Latitude</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBackground, color: theme.text },
                ]}
                value={manualLat}
                onChangeText={setManualLat}
                placeholder="-90 to 90"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Longitude</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBackground, color: theme.text },
                ]}
                value={manualLon}
                onChangeText={setManualLon}
                placeholder="-180 to 180"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Pressable
            style={[styles.applyButton, { backgroundColor: theme.accent }]}
            onPress={handleManualSubmit}
          >
            <Text style={styles.buttonText}>Apply Coordinates</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.sm,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.base,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.radiusMd,
    gap: SPACING.xs,
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.radiusMd,
    borderWidth: 1,
    gap: SPACING.xs,
    flex: 1,
  },
  buttonOutlineText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  manualInputs: {
    marginTop: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.xs,
  },
  input: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.radiusMd,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  applyButton: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
  },
});
