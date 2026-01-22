import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { t } from '../constants/strings';
import type { Theme, RootStackParamList } from '../types';

const logoImage: ImageSourcePropType = require('../assets/logo.png');

interface WelcomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  theme: Theme;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
  const bottomPadding = Math.max(insets.bottom + 24, 40);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: headerPaddingTop, paddingBottom: bottomPadding }]}>
      {/* Language Switcher - Top Right */}
      <View style={styles.languageSwitcherContainer}>
        <LanguageSwitcher compact />
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.iconContainer}>
          <Image 
            source={logoImage} 
            style={[styles.logoImage, { backgroundColor: 'transparent' }]} 
            resizeMode="contain" 
          />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>
          {t('onboarding.appName')}
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('onboarding.tagline')}
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <FeatureItem
          icon="sunny-outline"
          title={t('onboarding.features.weatherTitle')}
          description={t('onboarding.features.weatherDescription')}
          theme={theme}
        />
        <FeatureItem
          icon="leaf-outline"
          title={t('onboarding.features.diagnosisTitle')}
          description={t('onboarding.features.diagnosisDescription')}
          theme={theme}
        />
        <FeatureItem
          icon="mic-outline"
          title={t('onboarding.features.voiceTitle')}
          description={t('onboarding.features.voiceDescription')}
          theme={theme}
        />
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={t('onboarding.getStarted')}
          onPress={() => navigation.navigate('Location')}
          right={<AppIcon name="arrow-forward" size={20} color="#FFFFFF" />}
          accessibilityLabel={t('onboarding.getStarted')}
          style={styles.button}
        />
      </View>
    </View>
  );
}

function FeatureItem({ icon, title, description, theme }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <AppIcon name={icon} size={24} color={theme.accent} />
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
    paddingHorizontal: SPACING['2xl'],
  },
  languageSwitcherContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
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
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  buttonContainer: {
    paddingTop: 24,
    marginTop: 'auto', // Push to bottom
  },
  button: {
    paddingVertical: 16,
  },
});
