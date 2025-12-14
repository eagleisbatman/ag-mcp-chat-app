import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import api from '../services/api';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { t } from '../constants/strings';

// Icon mapping for features
const FEATURE_ICONS = {
  // Weather
  'thermometer': 'thermometer',
  'calendar': 'calendar-month',
  'water': 'water',
  'air': 'weather-windy',
  'calendar_month': 'calendar-month',
  'water_drop': 'water-outline',
  'grain': 'grain',
  'location_on': 'map-marker',
  // Agriculture
  'my_location': 'crosshairs-gps',
  'science': 'flask-outline',
  'grass': 'grass',
  'savings': 'cash-multiple',
  'pets': 'cow',
  'restaurant': 'food-apple',
  'balance': 'scale-balance',
  'attach_money': 'currency-usd',
  // Soil
  'terrain': 'terrain',
  'map': 'map',
  'layers': 'layers-triple',
  'public': 'earth',
  // AI
  'translate': 'translate',
  'speed': 'speedometer',
  'category': 'shape',
  'auto_fix_high': 'auto-fix',
  // Default
  'default': 'checkbox-blank-circle-outline',
};

// Server icons (same as list screen)
const SERVER_ICONS = {
  'agrivision': 'leaf-circle',
  'intent-classification': 'robot',
  'nextgen': 'flask-outline',
  'edacap': 'weather-cloudy-arrow-right',
  'feed-formulation': 'cow',
  'isda-soil': 'terrain',
  'accuweather': 'weather-partly-cloudy',
  'gap-weather': 'weather-lightning-rainy',
  'weatherapi': 'weather-sunny',
  'decision-tree': 'source-branch',
  'tips': 'lightbulb-on',
  'guardrails': 'shield-check',
  'user-preferences': 'cog',
  'profile-memory': 'account-circle',
  'content': 'book-open-page-variant',
};

function StatusBadge({ status, theme }) {
  const statusConfig = {
    healthy: { label: 'Active', color: theme.success, icon: 'checkmark-circle' },
    unhealthy: { label: 'Issues', color: theme.warning, icon: 'warning' },
    not_deployed: { label: 'Coming Soon', color: theme.info, icon: 'time' },
    unknown: { label: 'Checking...', color: theme.textMuted, icon: 'help-circle' },
  };

  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
      <AppIcon name={config.icon} size={14} color={config.color} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

function FeatureCard({ feature, theme }) {
  const iconName = FEATURE_ICONS[feature.icon] || FEATURE_ICONS.default;

  return (
    <View style={[styles.featureCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.featureIconContainer, { backgroundColor: theme.accent + '15' }]}>
        <MaterialCommunityIcons name={iconName} size={22} color={theme.accent} />
      </View>
      <Text style={[styles.featureTitle, { color: theme.text }]}>
        {feature.title}
      </Text>
      <Text style={[styles.featureDescription, { color: theme.textMuted }]}>
        {feature.description}
      </Text>
    </View>
  );
}

function UseCaseItem({ useCase, theme, index }) {
  return (
    <View style={styles.useCaseItem}>
      <View style={[styles.useCaseBullet, { backgroundColor: theme.accent }]}>
        <Text style={styles.useCaseBulletText}>{index + 1}</Text>
      </View>
      <Text style={[styles.useCaseText, { color: theme.text }]}>
        {useCase}
      </Text>
    </View>
  );
}

export default function McpServerDetailScreen({ navigation, route }) {
  const { slug } = route.params;
  const { theme } = useApp();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [server, setServer] = useState(null);
  const [error, setError] = useState(null);

  const fetchServerDetails = useCallback(async () => {
    try {
      setError(null);
      const response = await api.getMcpServer(slug);

      if (response.success) {
        setServer(response.server);
      } else {
        throw new Error(response.error || 'Failed to fetch server details');
      }
    } catch (err) {
      console.error('Fetch MCP server error:', err);
      setError(err.message);
      showError('Could not load service details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, showError]);

  useEffect(() => {
    fetchServerDetails();
  }, [fetchServerDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServerDetails();
  }, [fetchServerDetails]);

  const serverIcon = SERVER_ICONS[slug] || 'puzzle';
  const heroColor = server?.heroColor || server?.color || theme.accent;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        title=""
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={<View />}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AppIcon name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <Button
            title={t('common.retry')}
            onPress={fetchServerDetails}
            style={styles.retryButton}
          />
        </View>
      ) : server ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
        >
          {/* Hero Section */}
          <View style={[styles.heroSection, { backgroundColor: heroColor + '12' }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: heroColor + '25' }]}>
              <MaterialCommunityIcons name={serverIcon} size={48} color={heroColor} />
            </View>

            <Text style={[styles.heroTitle, { color: theme.text }]}>
              {server.name?.replace(' MCP', '').replace(' Server', '')}
            </Text>

            {server.tagline && (
              <Text style={[styles.heroTagline, { color: theme.textMuted }]}>
                {server.tagline}
              </Text>
            )}

            <View style={styles.heroBadges}>
              <StatusBadge status={server.healthStatus} theme={theme} />
              {server.isGlobal && (
                <View style={[styles.globalBadge, { backgroundColor: theme.info + '20' }]}>
                  <AppIcon name="globe-outline" size={12} color={theme.info} />
                  <Text style={[styles.globalBadgeText, { color: theme.info }]}>Global</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {server.longDescription && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
              <Text style={[styles.descriptionText, { color: theme.textMuted }]}>
                {server.longDescription}
              </Text>
            </Card>
          )}

          {/* Features Grid */}
          {server.features && server.features.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: SPACING.lg }]}>
                Features
              </Text>
              <View style={styles.featuresGrid}>
                {server.features.map((feature, index) => (
                  <FeatureCard key={index} feature={feature} theme={theme} />
                ))}
              </View>
            </View>
          )}

          {/* Use Cases */}
          {server.useCases && server.useCases.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>What You Can Do</Text>
              <View style={styles.useCasesList}>
                {server.useCases.map((useCase, index) => (
                  <UseCaseItem key={index} useCase={useCase} theme={theme} index={index} />
                ))}
              </View>
            </Card>
          )}

          {/* Supported Regions */}
          {server.supportedRegions && server.supportedRegions.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Available In</Text>
              <View style={styles.regionsList}>
                {server.supportedRegions.map((region, index) => (
                  <View key={index} style={[styles.regionTag, { backgroundColor: theme.accent + '15' }]}>
                    <AppIcon name="location" size={12} color={theme.accent} />
                    <Text style={[styles.regionTagText, { color: theme.accent }]}>{region}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Supported Crops */}
          {server.supportedCrops && server.supportedCrops.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supported Crops</Text>
              <View style={styles.cropsList}>
                {server.supportedCrops.map((crop, index) => (
                  <View key={index} style={[styles.cropTag, { backgroundColor: theme.success + '15' }]}>
                    <MaterialCommunityIcons name="sprout" size={12} color={theme.success} />
                    <Text style={[styles.cropTagText, { color: theme.success }]}>{crop}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Data Source Footer */}
          {server.dataSource && (
            <View style={styles.footer}>
              <MaterialCommunityIcons name="database" size={14} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                Powered by {server.dataSource}
              </Text>
            </View>
          )}

          {/* Response Time */}
          {server.responseTime && (
            <View style={styles.responseTime}>
              <MaterialCommunityIcons name="speedometer" size={14} color={theme.textMuted} />
              <Text style={[styles.responseTimeText, { color: theme.textMuted }]}>
                Response time: {server.responseTime}ms
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
    gap: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: SPACING['2xl'],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: SPACING['3xl'],
  },

  // Hero Section
  heroSection: {
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  heroTagline: {
    fontSize: TYPOGRAPHY.sizes.md,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sizes.md * 1.4,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  globalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
  },
  globalBadgeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },

  // Sections
  section: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.md,
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.6,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  featureCard: {
    width: '47%',
    padding: SPACING.md,
    borderRadius: 12,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: TYPOGRAPHY.sizes.xs * 1.4,
  },

  // Use Cases
  useCasesList: {
    gap: SPACING.md,
  },
  useCaseItem: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  useCaseBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useCaseBulletText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  useCaseText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * 1.5,
  },

  // Regions & Crops
  regionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  regionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 20,
  },
  regionTagText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  cropsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  cropTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cropTagText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  responseTimeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});
