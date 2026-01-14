import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import api from '../services/api';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { error as logError } from '../utils/logger';
import { t } from '../constants/strings';
import type { Theme, RootStackParamList, McpServer } from '../types';

// Tomorrow.io logos for light/dark mode
const TOMORROW_IO_LOGO_LIGHT: ImageSourcePropType = require('../assets/logos/Powered_by_Tomorrow-Black.png');
const TOMORROW_IO_LOGO_DARK: ImageSourcePropType = require('../assets/logos/Powered_by_Tomorrow-White.png');

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ServerInfoConfig {
  name: string;
  stringKey: string;
  icon: MaterialIconName;
  logo: ImageSourcePropType | string | null;
  color: string;
  featureKeys?: string[];
  coverageKeys?: string[];
  cropKeys?: string[];
}

// Server display info
const SERVER_INFO: { [key: string]: ServerInfoConfig } = {
  'agrivision': {
    name: 'AgriVision',
    stringKey: 'mcp.services.agrivision',
    icon: 'leaf-circle',
    logo: null,
    color: '#4CAF50',
    featureKeys: ['diseaseDetection', 'pestIdentification', 'nutrientAnalysis', 'treatmentAdvice'],
    coverageKeys: ['worldwide'],
    cropKeys: ['all'],
  },
  'plantix': {
    name: 'Plantix',
    stringKey: 'mcp.services.plantix',
    icon: 'leaf-maple',
    logo: 'https://plantix.net/favicon.ico',
    color: '#43A047',
    featureKeys: ['diseaseDetection', 'pestIdentification', 'cropIdentification', 'treatmentAdvice'],
    coverageKeys: ['worldwide'],
    cropKeys: ['all'],
  },
  'isda-soil': {
    name: 'iSDA Soil',
    stringKey: 'mcp.services.isdaSoil',
    icon: 'terrain',
    logo: null,
    color: '#8B4513',
    featureKeys: ['soilPh', 'nitrogen', 'phosphorus', 'potassium'],
    coverageKeys: ['africa'],
  },
  'accuweather': {
    name: 'AccuWeather',
    stringKey: 'mcp.services.accuweather',
    icon: 'weather-partly-cloudy',
    logo: require('../assets/logos/accuweather.png'),
    color: '#2196F3',
    featureKeys: ['currentWeather', 'temperature', 'humidity', 'forecast'],
    coverageKeys: ['worldwide'],
  },
  'gap-weather': {
    name: 'GAP Weather',
    stringKey: 'mcp.services.gapWeather',
    icon: 'weather-lightning-rainy',
    logo: null,
    color: '#1565C0',
    featureKeys: ['precipitation', 'evapotranspiration', 'solarRadiation', 'wind'],
    coverageKeys: ['kenya', 'eastAfrica'],
  },
  'edacap': {
    name: 'EDACAP Climate',
    stringKey: 'mcp.services.edacap',
    icon: 'weather-cloudy-arrow-right',
    logo: null,
    color: '#0D47A1',
    featureKeys: ['seasonalOutlook', 'rainfallProbability', 'temperatureTrend', 'cropForecasts'],
    coverageKeys: ['ethiopia'],
  },
  'weatherapi': {
    name: 'WeatherAPI',
    stringKey: 'mcp.services.weatherapi',
    icon: 'weather-sunny',
    logo: null,
    color: '#FF9800',
    featureKeys: ['currentWeather', 'forecast', 'historical', 'astronomy'],
    coverageKeys: ['worldwide'],
  },
  'tomorrow-io': {
    name: 'Tomorrow.io',
    stringKey: 'mcp.services.tomorrowIo',
    icon: 'cloud-sync',
    logo: require('../assets/logos/Powered_by_Tomorrow-Black.png'),
    color: '#673AB7',
    featureKeys: ['nowcast', 'forecasts', 'alerts', 'historical'],
    coverageKeys: ['worldwide'],
  },
  'feed-formulation': {
    name: 'Feed Formulation',
    stringKey: 'mcp.services.feedFormulation',
    icon: 'cow',
    logo: null,
    color: '#4CAF50',
    featureKeys: ['dietOptimization', 'nutrientBalance', 'localFeeds', 'costCalculation'],
    coverageKeys: ['ethiopia'],
  },
  'nextgen': {
    name: 'NextGen Fertilizer',
    stringKey: 'mcp.services.nextgen',
    icon: 'flask-outline',
    logo: null,
    color: '#E91E63',
    featureKeys: ['organicFertilizers', 'inorganicFertilizers', 'expectedYield', 'siteSpecific'],
    coverageKeys: ['ethiopia'],
    cropKeys: ['wheat', 'maize'],
  },
  'decision-tree': {
    name: 'Decision Tree',
    stringKey: 'mcp.services.decisionTree',
    icon: 'source-branch',
    logo: null,
    color: '#009688',
    featureKeys: ['growthStage', 'recommendations', 'weatherBased', 'actions'],
    coverageKeys: ['kenya'],
    cropKeys: ['maize', 'beans'],
  },
  'gap-agriculture': {
    name: 'GAP Agriculture',
    stringKey: 'mcp.services.gapAgriculture',
    icon: 'sprout',
    logo: null,
    color: '#8BC34A',
    featureKeys: ['cropAdvice', 'bestPractices', 'seasonalTips', 'localKnowledge'],
    coverageKeys: ['eastAfrica'],
  },
};

interface FeatureItemProps {
  featureKey: string;
  theme: Theme;
  color: string;
}

function FeatureItem({ featureKey, theme, color }: FeatureItemProps) {
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

interface McpServerDetailScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'McpServerDetail'>;
  route: RouteProp<RootStackParamList, 'McpServerDetail'>;
}

export default function McpServerDetailScreen({ navigation, route }: McpServerDetailScreenProps) {
  const { serverId } = route.params;
  const { theme, isDark } = useApp();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [server, setServer] = useState<McpServer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServerDetails = useCallback(async () => {
    try {
      setError(null);
      const response = await api.getMcpServer(serverId);

      if (response.success && response.server) {
        setServer(response.server);
      } else {
        throw new Error(response.error || t('mcp.failedToFetch'));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logError('Fetch MCP server error:', err);
      setError(errorMessage);
      showError(t('mcp.couldNotLoadDetails'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serverId, showError]);

  useEffect(() => {
    fetchServerDetails();
  }, [fetchServerDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServerDetails();
  }, [fetchServerDetails]);

  const serverConfig = SERVER_INFO[serverId];
  const isTomorrowIo = serverId === 'tomorrow-io';
  const tomorrowIoLogo = isDark ? TOMORROW_IO_LOGO_DARK : TOMORROW_IO_LOGO_LIGHT;
  
  const info = serverConfig ? {
    name: serverConfig.name,
    tagline: t(`${serverConfig.stringKey}.tagline`),
    description: t(`${serverConfig.stringKey}.description`),
    icon: serverConfig.icon,
    logo: isTomorrowIo ? tomorrowIoLogo : serverConfig.logo,
    color: serverConfig.color,
    featureKeys: serverConfig.featureKeys || [],
    coverage: (serverConfig.coverageKeys || []).map(key => t(`mcp.regions.${key}`)),
    crops: (serverConfig.cropKeys || []).map(key => t(`mcp.crops.${key}`)),
  } : {
    name: server?.name?.replace(' MCP', '').replace(' Server', '') || serverId,
    tagline: server?.description || t('mcp.fallback.service'),
    description: server?.description || t('mcp.fallback.description'),
    icon: 'puzzle' as MaterialIconName,
    logo: null,
    color: theme.accent,
    featureKeys: [] as string[],
    coverage: [] as string[],
    crops: [] as string[],
  };

  const isActive = server?.isActive === true || server?.isActiveForRegion === true || server?.status === 'active' || server?.displayStatus === 'active' || server?.healthStatus === 'healthy';
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
            {info.logo ? (
              <View style={[
                styles.iconContainer,
                styles.logoContainer,
                isTomorrowIo && styles.wideLogoContainer,
                { backgroundColor: theme.surface }
              ]}>
                <Image
                  source={typeof info.logo === 'string' ? { uri: info.logo } : info.logo}
                  style={isTomorrowIo ? styles.wideDetailLogo : styles.detailLogo}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.iconContainer, { backgroundColor: displayColor + '15' }]}>
                <MaterialCommunityIcons name={info.icon} size={40} color={displayColor} />
              </View>
            )}
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
  logoContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  detailLogo: {
    width: 56,
    height: 56,
  },
  wideLogoContainer: {
    width: 160,
    height: 50,
    borderRadius: 8,
    borderWidth: 0,
  },
  wideDetailLogo: {
    width: 140,
    height: 40,
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
