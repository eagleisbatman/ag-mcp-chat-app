import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

const STORAGE_KEY = '@service_preferences';

// Tomorrow.io logos for light/dark mode
const TOMORROW_IO_LOGO_LIGHT = require('../assets/logos/Powered_by_Tomorrow-Black.png');
const TOMORROW_IO_LOGO_DARK = require('../assets/logos/Powered_by_Tomorrow-White.png');

// Internal servers that should be hidden from users
const INTERNAL_SERVERS = [
  'content',
  'intent-classification',
  'profile-memory',
  'tips',
  'user-preferences',
  'guardrails',
  'entity-extraction',
];

// Categories with selectable global providers
// User can choose their preferred provider for these capabilities
const SELECTABLE_PROVIDERS = {
  plant_health: {
    capability: 'plant-diagnosis',
    providers: ['agrivision', 'plantix'],
    default: 'agrivision',
  },
  weather: {
    capability: 'weather',
    providers: ['accuweather', 'tomorrow-io'],
    default: 'accuweather',
  },
};

// Service category configuration - labels use string keys
const SERVICE_CATEGORIES = {
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
    servers: ['accuweather', 'gap-weather', 'edacap', 'weatherapi', 'tomorrow-io'],
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

// Server display info - brand names kept as-is (not translated)
// Logos can be local require() or remote URLs
const SERVER_INFO = {
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
  'gap-weather': {
    name: 'GAP Weather',
    stringKey: 'mcp.services.gapWeather',
    icon: 'weather-lightning-rainy',
    logo: null,
  },
  'edacap': {
    name: 'EDACAP Climate',
    stringKey: 'mcp.services.edacap',
    icon: 'weather-cloudy-arrow-right',
    logo: null,
  },
  'weatherapi': {
    name: 'WeatherAPI',
    stringKey: 'mcp.services.weatherapi',
    icon: 'weather-sunny',
    logo: null,
  },
  'tomorrow-io': {
    name: 'Tomorrow.io',
    stringKey: 'mcp.services.tomorrowIo',
    icon: 'cloud-sync',
    logo: require('../assets/logos/Powered_by_Tomorrow-Black.png'),
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

function ServiceCard({ server, theme, isDark, onPress, isSelectable, isSelected, onSelect }) {
  const isActive = server.displayStatus === 'active';
  const isComingSoon = server.displayStatus === 'coming_soon';
  const serverInfo = SERVER_INFO[server.slug];

  // Tomorrow.io has a wide "Powered by" logo that needs special handling
  const isTomorrowIo = server.slug === 'tomorrow-io';
  // Select correct Tomorrow.io logo based on theme
  const tomorrowIoLogo = isDark ? TOMORROW_IO_LOGO_DARK : TOMORROW_IO_LOGO_LIGHT;

  const info = serverInfo ? {
    name: serverInfo.name, // Brand names not translated
    description: t(`${serverInfo.stringKey}.tagline`),
    icon: serverInfo.icon,
    logo: isTomorrowIo ? tomorrowIoLogo : serverInfo.logo,
  } : {
    name: server.name?.replace(' MCP', '').replace(' Server', ''),
    description: server.description || t('mcp.fallback.service'),
    icon: 'puzzle',
    logo: null,
  };

  // Only allow selection if server is active
  const canSelect = isSelectable && isActive;
  // Show "In Use" badge if this is selected AND active
  const isInUse = isSelected && isActive;

  return (
    <Card style={[styles.serviceCard, !isActive && styles.serviceCardInactive]}>
      <ListRow
        title={info.name}
        subtitle={info.description}
        onPress={onPress}
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
            {canSelect && (
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

function CategorySection({ category, servers, theme, isDark, onServerPress, preferences, onSelectProvider }) {
  const config = SERVICE_CATEGORIES[category];
  if (!config || servers.length === 0) return null;

  const activeCount = servers.filter(s => s.displayStatus === 'active').length;
  const selectableConfig = SELECTABLE_PROVIDERS[category];

  // Only show selection if there are multiple ACTIVE providers in the selectable list
  const activeSelectableProviders = selectableConfig
    ? servers.filter(s => selectableConfig.providers.includes(s.slug) && s.displayStatus === 'active')
    : [];
  const hasSelectableProviders = activeSelectableProviders.length > 1;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: config.color + '20' }]}>
          <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
        </View>
        <Text style={[styles.categoryLabel, { color: theme.text }]}>{t(config.labelKey)}</Text>
        <Text style={[styles.categoryCount, { color: theme.textMuted }]}>
          {t('mcp.activeCount', { active: activeCount, total: servers.length })}
        </Text>
      </View>

      {/* Show selection hint for categories with choices */}
      {hasSelectableProviders && (
        <Text style={[styles.selectionHint, { color: theme.textMuted }]}>
          {t('mcp.selectPreferred')}
        </Text>
      )}

      {servers.map((server) => {
        const isSelectable = hasSelectableProviders && selectableConfig.providers.includes(server.slug);
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

export default function McpServersScreen({ navigation }) {
  const { theme, isDark, location, locationDetails } = useApp();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mcpData, setMcpData] = useState(null);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState({});

  // Load saved preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        // Set defaults
        const defaults = {};
        Object.entries(SELECTABLE_PROVIDERS).forEach(([category, config]) => {
          defaults[category] = config.default;
        });
        setPreferences(defaults);
      }
    } catch (error) {
      logError('Failed to load service preferences:', error);
    }
  };

  const handleSelectProvider = useCallback(async (category, providerSlug) => {
    const newPreferences = { ...preferences, [category]: providerSlug };
    setPreferences(newPreferences);

    try {
      // Save locally
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));

      // Sync to backend
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

      const params = {};
      if (location?.latitude && location?.longitude) {
        params.lat = location.latitude;
        params.lon = location.longitude;
      }

      const response = await api.getMcpServersLiveStatus(params);

      if (response.success) {
        setMcpData(response);
      } else {
        throw new Error(response.error || t('mcp.failedToFetch'));
      }
    } catch (err) {
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

  const handleServerPress = useCallback((slug) => {
    navigation.navigate('McpServerDetail', { slug });
  }, [navigation]);

  // Filter out internal servers and group by category
  const serversByCategory = React.useMemo(() => {
    if (!mcpData?.servers) return {};

    // Filter out internal servers
    const visibleServers = mcpData.servers.filter(
      server => !INTERNAL_SERVERS.includes(server.slug)
    );

    // Group by our defined categories
    const grouped = {};
    for (const [category, config] of Object.entries(SERVICE_CATEGORIES)) {
      grouped[category] = visibleServers.filter(server =>
        config.servers.includes(server.slug)
      );
    }

    return grouped;
  }, [mcpData]);

  // Count only visible servers
  const visibleServers = mcpData?.servers?.filter(s => !INTERNAL_SERVERS.includes(s.slug)) || [];
  const activeCount = visibleServers.filter(s => s.displayStatus === 'active').length;

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
          {/* Skeleton loading for MCP server cards */}
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
          {/* Initiative Description */}
          <Text style={[styles.descriptionText, { color: theme.textMuted }]}>
            {t('mcp.description')}
          </Text>

          {/* Location Summary */}
          <View style={styles.summarySection}>
            <View style={styles.locationRow}>
              <AppIcon name="location" size={16} color={theme.accent} />
              <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                {locationDetails?.displayName ||
                  (location ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : t('mcp.locationNotSet'))}
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: theme.textMuted }]}>
              {t('mcp.servicesAvailable', { active: activeCount, total: visibleServers.length })}
            </Text>
          </View>

          {/* Category Sections */}
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
            />
          ))}

          {/* Footer */}
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            {t('mcp.footer')}
          </Text>
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
    paddingHorizontal: SPACING.lg,
  },
  skeletonCard: {
    width: '100%',
    marginBottom: SPACING.md,
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING['3xl'],
  },
  summarySection: {
    marginBottom: SPACING.xl,
  },
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
  summaryText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  categorySection: {
    marginBottom: SPACING.xl,
  },
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
  categoryCount: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  selectionHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  serviceCard: {
    marginBottom: SPACING.sm,
  },
  serviceCardInactive: {
    opacity: 0.6,
  },
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
  serviceLogo: {
    width: 24,
    height: 24,
  },
  wideLogoContainer: {
    width: 80,
    borderWidth: 0,
  },
  wideLogo: {
    width: 72,
    height: 28,
  },
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
  radioButton: {
    padding: 2,
  },
  comingSoonBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
