import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useApp } from '../contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function LocationScreen({ navigation }) {
  const { theme, setLocation } = useApp();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Location permission denied');
        setLocation({ latitude: null, longitude: null }, 'denied');
        setIsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await setLocation(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        'granted'
      );

      navigation.navigate('Language');
    } catch (err) {
      setError('Could not get location. Please try again.');
      console.log('Location error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const skipLocation = async () => {
    // Use default location (Nairobi, Kenya)
    await setLocation({ latitude: -1.2864, longitude: 36.8172 }, 'denied');
    navigation.navigate('Language');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Math.max(insets.top + 20, 60) }]}>
      {/* Icon */}
      <View style={styles.iconSection}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
          <Ionicons name="location" size={64} color={theme.accent} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Enable Location
        </Text>
        
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Share your location to get accurate weather forecasts and region-specific farming advice.
        </Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="alert-circle" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Benefits */}
        <View style={styles.benefits}>
          <BenefitItem
            icon="rainy-outline"
            text="Local weather forecasts"
            theme={theme}
          />
          <BenefitItem
            icon="earth-outline"
            text="Region-specific crop advice"
            theme={theme}
          />
          <BenefitItem
            icon="analytics-outline"
            text="Soil data for your area"
            theme={theme}
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          onPress={requestLocation}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Enable Location</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.border }]}
          onPress={skipLocation}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BenefitItem({ icon, text, theme }) {
  return (
    <View style={styles.benefitItem}>
      <Ionicons name={icon} size={20} color={theme.accent} />
      <Text style={[styles.benefitText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    flex: 1,
  },
  benefits: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

