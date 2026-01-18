import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import api from '../services/api';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import ListRow from '../components/ui/ListRow';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { t } from '../constants/strings';
import { updatePreferences } from '../services/db';
import { error as logError } from '../utils/logger';
import type { Theme, RootStackParamList, McpServer } from '../types';

const STORAGE_KEY = '@service_preferences';

const TOMORROW_IO_LOGO_LIGHT: ImageSourcePropType = require('../assets/logos/Powered_by_Tomorrow-Black.png');
const TOMORROW_IO_LOGO_DARK: ImageSourcePropType = require('../assets/logos/Powered_by_Tomorrow-White.png');

const INTERNAL_SERVERS = [
  'content',
  'intent-classification',
  'profile-memory',
  'tips',
  'user-preferences',
  'guardrails',
  'entity-extraction',
];

interface ServicePreferences {
  [category: string]: string;
}

interface SelectableProviderConfig {
  capability: string;
  providers: string[];
  default: string;
}

const SELECTABLE_PROVIDERS: { [key: string]: SelectableProviderConfig } = {
  plant_health: {
    capability: 'plant-diagnosis',
    providers: ['agrivision', 'plantix'],
    default: 'agrivision',
  },
  weather: {
    capability: 'weather',
    providers: ['google-weather', 'accuweather', 'tomorrow-io'],
    default: 'tomorrow-io', // Tomorrow.io has better global coverage
  },
};

// Countries where Google Weather API doesn't support current conditions/forecasts
// Based on https://developers.google.com/maps/documentation/weather/coverage
const GOOGLE_WEATHER_UNSUPPORTED_COUNTRIES = [
  // No support at all
  'CN', 'China', '中国',
  'CU', 'Cuba',
  'IR', 'Iran', 'ایران',
  'KP', 'North Korea', '조선', '朝鲜',
  'SY', 'Syria', 'سوريا',
  // Partial support (alerts only - no current/forecast)
  'JP', 'Japan', '日本',
  'KR', 'South Korea', '대한민국', '한국',
  'VN', 'Vietnam', 'Việt Nam', 'Viet Nam',
];

/**
 * Get available weather providers based on user's country
 */
function getAvailableWeatherProviders(countryCode?: string, countryName?: string): string[] {
  const allProviders = SELECTABLE_PROVIDERS.weather.providers;

  // Check if Google Weather is unsupported for this country
  const isGoogleUnsupported = GOOGLE_WEATHER_UNSUPPORTED_COUNTRIES.some(
    c => c.toUpperCase() === countryCode?.toUpperCase() ||
         c.toLowerCase() === countryName?.toLowerCase()
  );

  if (isGoogleUnsupported) {
    return allProviders.filter(p => p !== 'google-weather');
  }

  return allProviders;
}

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ServiceCategoryConfig {
  labelKey: string;
  icon: MaterialIconName;
  color: string;
  servers: string[];
}

const SERVICE_CATEGORIES: { [key: string]: ServiceCategoryConfig } = {
  plant_health: {
    labelKey: 'mcp.categories.plantHealth',
    icon: 'leaf-circle',
    color: '#4CAF50',
    servers: ['agrivision', 'plantix'],
  },
  soil: {
    labelKey: 'mcp.categories.soil',
    icon: 'terrain',
    color: '#8B4513',
    servers: ['isda-soil'],
  },
  weather: {
    labelKey: 'mcp.categories.weather',
    icon: 'weather-partly-cloudy',
    color: '#2196F3',
    servers: ['accuweather', 'tomorrow-io', 'google-weather'],
  },
  livestock: {
    labelKey: 'mcp.categories.livestock',
    icon: 'cow',
    color: '#66BB6A',
    servers: ['feed-formulation'],
  },
  agriculture: {
    labelKey: 'mcp.categories.agriculture',
    icon: 'sprout',
    color: '#FF9800',
    servers: ['nextgen', 'decision-tree', 'gap-agriculture'],
  },
};

interface ServerInfoConfig {
  name: string;
  stringKey: string;
  icon: MaterialIconName;
  logo: ImageSourcePropType | string | null;
}

const SERVER_INFO: { [key: string]: ServerInfoConfig } = {
  'agrivision': {
    name: 'AgriVision',
    stringKey: 'mcp.services.agrivision',
    icon: 'leaf-circle',
    logo: null,
  },
  'plantix': {
    name: 'Plantix',
    stringKey: 'mcp.services.plantix',
    icon: 'leaf-maple',
    logo: 'https://plantix.net/favicon.ico',
  },
  'isda-soil': {
    name: 'iSDA Soil',
    stringKey: 'mcp.services.isdaSoil',
    icon: 'terrain',
    logo: null,
  },
  'accuweather': {
    name: 'AccuWeather',
    stringKey: 'mcp.services.accuweather',
    icon: 'weather-partly-cloudy',
    logo: require('../assets/logos/accuweather.png'),
  },
  'tomorrow-io': {
    name: 'Tomorrow.io',
    stringKey: 'mcp.services.tomorrowIo',
    icon: 'cloud-sync',
    logo: require('../assets/logos/Powered_by_Tomorrow-Black.png'),
  },
  'google-weather': {
    name: 'Google Weather',
    stringKey: 'mcp.services.googleWeather',
    icon: 'google',
    logo: null, // Uses MaterialCommunityIcons 'google' icon via the icon field
  },
  'feed-formulation': {
    name: 'Feed Formulation',
    stringKey: 'mcp.services.feedFormulation',
    icon: 'cow',
    logo: null,
  },
  'nextgen': {
    name: 'NextGen Fertilizer',
    stringKey: 'mcp.services.nextgen',
    icon: 'flask-outline',
    logo: null,
  },
  'decision-tree': {
    name: 'Decision Tree',
    stringKey: 'mcp.services.decisionTree',
    icon: 'source-branch',
    logo: null,
  },
  'gap-agriculture': {
    name: 'GAP Agriculture',
    stringKey: 'mcp.services.gapAgriculture',
    icon: 'sprout',
    logo: null,
  },
};

/**
 * Helper to determine if a server is active based on multiple potential API property names
 */
function isServerActive(server: McpServer): boolean {
  return (
    server.isActive === true || 
    server.isActiveForRegion === true || 
    server.status === 'active' || 
    server.status === 'online' || 
    server.displayStatus === 'active' ||
    server.healthStatus === 'healthy'
  );
}

interface ServiceCardProps {
  server: McpServer;
  theme: Theme;
  isDark: boolean;
  onPress: () => void;
  isSelectable: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function ServiceCard({ server, theme, isDark, onPress, isSelectable, isSelected, onSelect }: ServiceCardProps) {
  const isActive = isServerActive(server);
  const isComingSoon = server.status === 'coming_soon' || server.displayStatus === 'coming_soon';
  const serverInfo = SERVER_INFO[server.slug];

  // Debug log for Google Weather
  if (server.slug === 'google-weather') {
    console.log('[ServiceCard] google-weather render:', { isActive, isSelectable, isSelected, isComingSoon });
  }

  const isTomorrowIo = server.slug === 'tomorrow-io';
  const tomorrowIoLogo = isDark ? TOMORROW_IO_LOGO_DARK : TOMORROW_IO_LOGO_LIGHT;

  const info = serverInfo ? {
    name: serverInfo.name,
    description: t(`${serverInfo.stringKey}.tagline`),
    icon: serverInfo.icon,
    logo: isTomorrowIo ? tomorrowIoLogo : serverInfo.logo,
  } : {
    name: server.name?.replace(' MCP', '').replace(' Server', '') || '',
    description: server.description || t('mcp.fallback.service'),
    icon: 'puzzle' as MaterialIconName,
    logo: null as ImageSourcePropType | string | null,
  };

  const isInUse = isSelected && isActive;

  // For selectable providers, tapping the row should select it
  const handleRowPress = () => {
    console.log('[ServiceCard] Row tapped:', server.slug, { isSelectable, isActive, isSelected });
    if (isSelectable && isActive && !isSelected) {
      onSelect();
    } else {
      onPress();
    }
  };

  return (
    <Card style={[styles.serviceCard, !isActive && styles.serviceCardInactive]}>
      <ListRow
        title={info.name}
        subtitle={info.description}
        subtitleNumberOfLines={0} // Allow as many lines as needed
        onPress={handleRowPress}
        left={
          info.logo ? (
            <View style={[
              styles.serviceIcon,
              styles.logoContainer,
              isTomorrowIo && styles.wideLogoContainer,
              { backgroundColor: theme.surface }
            ]}>
              <Image
                source={typeof info.logo === 'string' ? { uri: info.logo } : info.logo}
                style={isTomorrowIo ? styles.wideLogo : styles.serviceLogo}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[styles.serviceIcon, { backgroundColor: isActive ? theme.accent + '15' : theme.surfaceVariant }]}>
              <MaterialCommunityIcons
                name={info.icon}
                size={20}
                color={isActive ? theme.accent : theme.textMuted}
              />
            </View>
          )
        }
        right={
          <View style={styles.rightContainer}>
            {isInUse && (
              <View style={[styles.inUseBadge, { backgroundColor: theme.success + '20' }]}>
                <Text style={[styles.inUseText, { color: theme.success }]}>{t('mcp.inUse')}</Text>
              </View>
            )}
            {isSelectable && isActive && (
              <TouchableOpacity
                onPress={onSelect}
                style={styles.radioButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isSelected ? (
                  <MaterialCommunityIcons name="radiobox-marked" size={22} color={theme.accent} />
                ) : (
                  <MaterialCommunityIcons name="radiobox-blank" size={22} color={theme.textMuted} />
                )}
              </TouchableOpacity>
            )}
            {isComingSoon && (
              <View style={[styles.comingSoonBadge, { backgroundColor: theme.warning + '20' }]}>
                <Text style={[styles.comingSoonText, { color: theme.warning }]}>{t('mcp.comingSoon')}</Text>
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.textMuted }]} />
          </View>
        }
        showChevron={true}
        paddingHorizontal={SPACING.md}
      />
    </Card>
  );
}

interface CategorySectionProps {
  category: string;
  servers: McpServer[];
  theme: Theme;
  isDark: boolean;
  onServerPress: (slug: string) => void;
  preferences: ServicePreferences;
  onSelectProvider: (category: string, slug: string) => void;
  countryCode?: string;
  countryName?: string;
}

function CategorySection({ category, servers, theme, isDark, onServerPress, preferences, onSelectProvider, countryCode, countryName }: CategorySectionProps) {
  const config = SERVICE_CATEGORIES[category];
  if (!config || servers.length === 0) return null;

  // For weather category, filter out unsupported providers based on country
  let availableProviders: string[] | undefined;
  let filteredServers = servers;
  if (category === 'weather') {
    availableProviders = getAvailableWeatherProviders(countryCode, countryName);
    filteredServers = servers.filter(s => availableProviders!.includes(s.slug));
  }

  const activeCount = filteredServers.filter(isServerActive).length;
  const selectableConfig = SELECTABLE_PROVIDERS[category];

  // Use filtered providers for weather category
  const providersToCheck = category === 'weather' && availableProviders
    ? availableProviders
    : selectableConfig?.providers || [];

  const activeSelectableProviders = selectableConfig
    ? filteredServers.filter(s => providersToCheck.includes(s.slug) && isServerActive(s))
    : [];
  const hasSelectableProviders = activeSelectableProviders.length > 1;

  // Debug logging for weather category
  if (category === 'weather') {
    console.log('[CategorySection] COUNTRY DEBUG:', { countryCode, countryName });
    console.log('[CategorySection] availableProviders:', availableProviders);
    console.log('[CategorySection] filteredServers:', filteredServers.map(s => s.slug));
    console.log('[CategorySection] weather servers:', servers.map(s => ({
      slug: s.slug,
      isActive: isServerActive(s),
      status: s.status,
      isActiveForRegion: s.isActiveForRegion,
      displayStatus: s.displayStatus,
      healthStatus: s.healthStatus,
    })));
    console.log('[CategorySection] activeSelectableProviders:', activeSelectableProviders.map(s => s.slug));
    console.log('[CategorySection] hasSelectableProviders:', hasSelectableProviders);
  }

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: config.color + '20' }]}>
          <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
        </View>
        <Text style={[styles.categoryLabel, { color: theme.text }]}>{t(config.labelKey)}</Text>
        <Text style={[styles.categoryCount, { color: theme.textMuted }]}>
          {t('mcp.activeCount', { active: activeCount, total: filteredServers.length })}
        </Text>
      </View>

      {hasSelectableProviders && (
        <Text style={[styles.selectionHint, { color: theme.textMuted }]}>
          {t('mcp.selectPreferred')}
        </Text>
      )}

      {filteredServers.map((server) => {
        const isSelectable = hasSelectableProviders && providersToCheck.includes(server.slug);
        const isSelected = isSelectable && preferences[category] === server.slug;

        return (
          <ServiceCard
            key={server.slug}
            server={server}
            theme={theme}
            isDark={isDark}
            onPress={() => onServerPress(server.slug)}
            isSelectable={isSelectable}
            isSelected={isSelected}
            onSelect={() => onSelectProvider(category, server.slug)}
          />
        );
      })}
    </View>
  );
}

interface McpServersScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'McpServers'>;
}

interface McpData {
  servers?: McpServer[];
  success: boolean;
  error?: string;
  counts?: {
    total: number;
    active: number;
    degraded: number;
    inactive: number;
    comingSoon: number;
  };
}

export default function McpServersScreen({ navigation }: McpServersScreenProps) {
  const { theme, isDark, location, locationDetails } = useApp();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mcpData, setMcpData] = useState<McpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ServicePreferences>({});

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        const defaults: ServicePreferences = {};
        Object.entries(SELECTABLE_PROVIDERS).forEach(([category, config]) => {
          defaults[category] = config.default;
        });
        setPreferences(defaults);
      }
    } catch (error) {
      logError('Failed to load service preferences:', error);
    }
  };

  const handleSelectProvider = useCallback(async (category: string, providerSlug: string) => {
    console.log('[Prefs] SELECT:', category, '=', providerSlug);
    const newPreferences = { ...preferences, [category]: providerSlug };
    setPreferences(newPreferences);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      const result = await updatePreferences({ servicePreferences: newPreferences });
      if (result.success) {
        showSuccess(t('mcp.preferencesSaved'));
      }
    } catch (error) {
      logError('Failed to save preference:', error);
    }
  }, [preferences, showSuccess]);

  const fetchMcpServers = useCallback(async () => {
    try {
      setError(null);

      const params: { lat?: number; lon?: number } = {};
      if (location?.latitude !== null && location?.longitude !== null) {
        params.lat = location.latitude as number;
        params.lon = location.longitude as number;
      }

      const response = await api.getMcpServersLiveStatus(params);

      if (response.success) {
        setMcpData(response);
      } else {
        throw new Error(response.error || t('mcp.failedToFetch'));
      }
    } catch (err: any) {
      logError('Fetch MCP servers error:', err);
      setError(err.message);
      showError(t('mcp.couldNotLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, showError]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMcpServers();
  }, [fetchMcpServers]);

  const handleServerPress = useCallback((serverId: string) => {
    navigation.navigate('McpServerDetail', { serverId });
  }, [navigation]);

  const serversByCategory = React.useMemo(() => {
    if (!mcpData?.servers) return {};

    const visibleServers = mcpData.servers.filter(
      server => !INTERNAL_SERVERS.includes(server.slug)
    );

    const grouped: { [key: string]: McpServer[] } = {};
    for (const [category, config] of Object.entries(SERVICE_CATEGORIES)) {
      grouped[category] = visibleServers.filter(server =>
        config.servers.includes(server.slug)
      );
    }

    return grouped;
  }, [mcpData]);

  const visibleServers = mcpData?.servers?.filter(s => !INTERNAL_SERVERS.includes(s.slug)) || [];
  
  // Use counts from API if available, otherwise calculate manually
  const activeCount = mcpData?.counts?.active ?? visibleServers.filter(isServerActive).length;
  const totalCount = mcpData?.counts?.total ?? visibleServers.length;

  const locationText = locationDetails?.displayName ||
    (location?.latitude !== null && location?.longitude !== null
      ? `${location.latitude!.toFixed(2)}, ${location.longitude!.toFixed(2)}` 
      : t('mcp.locationNotSet'));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('mcp.title')}
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
          <SkeletonCard style={styles.skeletonCard} />
          <SkeletonCard style={styles.skeletonCard} />
          <SkeletonCard style={styles.skeletonCard} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            {t('mcp.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AppIcon name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <Button
            title={t('common.retry')}
            onPress={fetchMcpServers}
            style={styles.retryButton}
          />
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
          <Text style={[styles.descriptionText, { color: theme.textMuted }]}>
            {t('mcp.description')}
          </Text>

          <View style={styles.summarySection}>
            <View style={styles.locationRow}>
              <AppIcon name="location" size={16} color={theme.accent} />
              <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: theme.textMuted }]}>
              {t('mcp.servicesAvailable', { active: activeCount, total: totalCount })}
            </Text>
          </View>

          {['plant_health', 'soil', 'weather', 'livestock', 'agriculture'].map(category => (
            <CategorySection
              key={category}
              category={category}
              servers={serversByCategory[category] || []}
              theme={theme}
              isDark={isDark}
              onServerPress={handleServerPress}
              preferences={preferences}
              onSelectProvider={handleSelectProvider}
              countryCode={locationDetails?.level1CountryCode}
              countryName={locationDetails?.level1Country || locationDetails?.country}
            />
          ))}

          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            {t('mcp.footer')}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  skeletonCard: { width: '100%', marginBottom: SPACING.md },
  loadingText: { fontSize: TYPOGRAPHY.sizes.base },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
    gap: SPACING.lg,
  },
  errorText: { fontSize: TYPOGRAPHY.sizes.base, textAlign: 'center' },
  retryButton: { paddingHorizontal: SPACING['2xl'] },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING['3xl'],
  },
  summarySection: { marginBottom: SPACING.xl },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    flex: 1,
  },
  summaryText: { fontSize: TYPOGRAPHY.sizes.sm },
  descriptionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  categorySection: { marginBottom: SPACING.xl },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    flex: 1,
  },
  categoryCount: { fontSize: TYPOGRAPHY.sizes.sm },
  selectionHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  serviceCard: { marginBottom: SPACING.sm },
  serviceCardInactive: { opacity: 0.6 },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  serviceLogo: { width: 24, height: 24 },
  wideLogoContainer: { width: 80, borderWidth: 0 },
  wideLogo: { width: 72, height: 28 },
  inUseBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inUseText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  radioButton: { padding: 2 },
  comingSoonBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
