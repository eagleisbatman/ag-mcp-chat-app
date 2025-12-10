import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../constants/themes';

export default function WelcomeScreen({ navigation }) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: headerPaddingTop }]}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
          <Ionicons name="leaf" size={64} color={theme.accent} />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>
          Farm Assistant
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your AI-powered farming companion
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <FeatureItem
          icon="sunny-outline"
          title="Weather Forecasts"
          description="Get accurate weather predictions for your farm"
          theme={theme}
        />
        <FeatureItem
          icon="leaf-outline"
          title="Crop Diagnosis"
          description="Identify plant diseases with photos"
          theme={theme}
        />
        <FeatureItem
          icon="mic-outline"
          title="Voice Support"
          description="Speak naturally in your language"
          theme={theme}
        />
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate('Location')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureItem({ icon, title, description, theme }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: theme.accentLight }]}>
        <Ionicons name={icon} size={24} color={theme.accent} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  features: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
  },
  buttonContainer: {
    paddingTop: 24,
    marginTop: 'auto', // Push to bottom
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

