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

// Server display info with string keys for localization
const SERVER_INFO = {
  'agrivision': {
    stringKey: 'mcp.services.agrivision',
    icon: 'leaf-circle',
    color: '#4CAF50',
    featureKeys: ['diseaseDetection', 'pestIdentification', 'nutrientAnalysis', 'treatmentAdvice'],
    coverageKeys: ['worldwide'],
    cropKeys: ['all'],
  },
  'isda-soil': {
    stringKey: 'mcp.services.isdaSoil',
    icon: 'terrain',
    color: '#8B4513',
    featureKeys: ['soilPh', 'nitrogen', 'phosphorus', 'potassium'],
    coverageKeys: ['africa'],
  },
  'accuweather': {
    stringKey: 'mcp.services.accuweather',
    icon: 'weather-partly-cloudy',
    color: '#2196F3',
    featureKeys: ['currentWeather', 'temperature', 'humidity', 'forecast'],
    coverageKeys: ['worldwide'],
  },
  'gap-weather': {
    stringKey: 'mcp.services.gapWeather',
    icon: 'weather-lightning-rainy',
    color: '#1565C0',
    featureKeys: ['precipitation', 'evapotranspiration', 'solarRadiation', 'wind'],
    coverageKeys: ['kenya', 'eastAfrica'],
  },
  'edacap': {
    stringKey: 'mcp.services.edacap',
    icon: 'weather-cloudy-arrow-right',
    color: '#0D47A1',
    featureKeys: ['seasonalOutlook', 'rainfallProbability', 'temperatureTrend', 'cropForecasts'],
    coverageKeys: ['ethiopia'],
  },
  'weatherapi': {
    stringKey: 'mcp.services.weatherapi',
    icon: 'weather-sunny',
    color: '#FF9800',
    featureKeys: ['currentWeather', 'forecast', 'historical', 'astronomy'],
    coverageKeys: ['worldwide'],
  },
  'tomorrow-io': {
    stringKey: 'mcp.services.tomorrowIo',
    icon: 'cloud-sync',
    color: '#673AB7',
    featureKeys: ['nowcast', 'forecasts', 'alerts', 'historical'],
    coverageKeys: ['worldwide'],
  },
  'feed-formulation': {
    stringKey: 'mcp.services.feedFormulation',
    icon: 'cow',
    color: '#4CAF50',
    featureKeys: ['dietOptimization', 'nutrientBalance', 'localFeeds', 'costCalculation'],
    coverageKeys: ['ethiopia'],
  },
  'nextgen': {
    stringKey: 'mcp.services.nextgen',
    icon: 'flask-outline',
    color: '#E91E63',
    featureKeys: ['organicFertilizers', 'inorganicFertilizers', 'expectedYield', 'siteSpecific'],
    coverageKeys: ['ethiopia'],
    cropKeys: ['wheat', 'maize'],
  },
  'decision-tree': {
    stringKey: 'mcp.services.decisionTree',
    icon: 'source-branch',
    color: '#009688',
    featureKeys: ['growthStage', 'recommendations', 'weatherBased', 'actions'],
    coverageKeys: ['kenya'],
    cropKeys: ['maize', 'beans'],
  },
  'gap-agriculture': {
    stringKey: 'mcp.services.gapAgriculture',
    icon: 'sprout',
    color: '#8BC34A',
    featureKeys: ['cropAdvice', 'bestPractices', 'seasonalTips', 'localKnowledge'],
    coverageKeys: ['eastAfrica'],
  },
};

function FeatureItem({ featureKey, theme, color }) {
  // Get localized feature name from string key
  const featureName = t(`mcp.features.${featureKey}`);

  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name="check" size={16} color={color} />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{featureName}</Text>
      </View>
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
        throw new Error(response.error || t('mcp.failedToFetch'));
      }
    } catch (err) {
      console.error('Fetch MCP server error:', err);
      setError(err.message);
      showError(t('mcp.couldNotLoadDetails'));
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

  // Get display info from our config or fallback to API data
  const serverConfig = SERVER_INFO[slug];
  const info = serverConfig ? {
    name: t(`${serverConfig.stringKey}.name`),
    tagline: t(`${serverConfig.stringKey}.tagline`),
    description: t(`${serverConfig.stringKey}.description`),
    icon: serverConfig.icon,
    color: serverConfig.color,
    featureKeys: serverConfig.featureKeys || [],
    // Resolve coverageKeys to localized region names
    coverage: (serverConfig.coverageKeys || []).map(key => t(`mcp.regions.${key}`)),
    // Resolve cropKeys to localized crop names
    crops: (serverConfig.cropKeys || []).map(key => t(`mcp.crops.${key}`)),
  } : {
    name: server?.name?.replace(' MCP', '').replace(' Server', '') || slug,
    tagline: server?.description || t('mcp.fallback.service'),
    description: server?.longDescription || t('mcp.fallback.description'),
    icon: 'puzzle',
    color: theme.accent,
    featureKeys: [],
    coverage: [],
    crops: [],
  };

  const isActive = server?.healthStatus === 'healthy';
  const displayColor = info.color || theme.accent;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('mcp.loadingDetails')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AppIcon name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <Button title={t('common.retry')} onPress={fetchServerDetails} style={styles.retryButton} />
        </View>
      ) : (
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
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={[styles.iconContainer, { backgroundColor: displayColor + '15' }]}>
              <MaterialCommunityIcons name={info.icon} size={40} color={displayColor} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{info.name}</Text>
            <Text style={[styles.tagline, { color: theme.textMuted }]}>{info.tagline}</Text>

            {/* Status */}
            <View style={[styles.statusBadge, { backgroundColor: isActive ? theme.success + '20' : theme.textMuted + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.textMuted }]} />
              <Text style={[styles.statusText, { color: isActive ? theme.success : theme.textMuted }]}>
                {isActive ? t('mcp.statusActive') : t('mcp.statusUnavailable')}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('mcp.sectionAbout')}</Text>
            <Text style={[styles.descriptionText, { color: theme.textMuted }]}>{info.description}</Text>
          </Card>

          {/* Features */}
          {info.featureKeys && info.featureKeys.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('mcp.sectionFeatures')}</Text>
              <View style={styles.featuresList}>
                {info.featureKeys.map((featureKey, index) => (
                  <FeatureItem key={index} featureKey={featureKey} theme={theme} color={displayColor} />
                ))}
              </View>
            </Card>
          )}

          {/* Coverage */}
          {info.coverage && info.coverage.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('mcp.sectionAvailableIn')}</Text>
              <View style={styles.tagsList}>
                {info.coverage.map((region, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: theme.accent + '15' }]}>
                    <AppIcon name="location" size={12} color={theme.accent} />
                    <Text style={[styles.tagText, { color: theme.accent }]}>{region}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Supported Crops */}
          {info.crops && info.crops.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('mcp.sectionSupportedCrops')}</Text>
              <View style={styles.tagsList}>
                {info.crops.map((crop, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: theme.success + '15' }]}>
                    <MaterialCommunityIcons name="sprout" size={12} color={theme.success} />
                    <Text style={[styles.tagText, { color: theme.success }]}>{crop}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
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
  headerSection: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  section: {
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.md,
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.6,
  },
  featuresList: {
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  featureDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
