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
import ListRow from '../components/ui/ListRow';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { t } from '../constants/strings';

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

// Service category configuration - labels use string keys
const SERVICE_CATEGORIES = {
  plant_health: {
    labelKey: 'mcp.categories.plantHealth',
    icon: 'leaf-circle',
    color: '#4CAF50',
    servers: ['agrivision'],
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

// Server display info - uses string keys for localization
const SERVER_INFO = {
  'agrivision': {
    stringKey: 'mcp.services.agrivision',
    icon: 'leaf-circle',
  },
  'isda-soil': {
    stringKey: 'mcp.services.isdaSoil',
    icon: 'terrain',
  },
  'accuweather': {
    stringKey: 'mcp.services.accuweather',
    icon: 'weather-partly-cloudy',
  },
  'gap-weather': {
    stringKey: 'mcp.services.gapWeather',
    icon: 'weather-lightning-rainy',
  },
  'edacap': {
    stringKey: 'mcp.services.edacap',
    icon: 'weather-cloudy-arrow-right',
  },
  'weatherapi': {
    stringKey: 'mcp.services.weatherapi',
    icon: 'weather-sunny',
  },
  'tomorrow-io': {
    stringKey: 'mcp.services.tomorrowIo',
    icon: 'cloud-sync',
  },
  'feed-formulation': {
    stringKey: 'mcp.services.feedFormulation',
    icon: 'cow',
  },
  'nextgen': {
    stringKey: 'mcp.services.nextgen',
    icon: 'flask-outline',
  },
  'decision-tree': {
    stringKey: 'mcp.services.decisionTree',
    icon: 'source-branch',
  },
  'gap-agriculture': {
    stringKey: 'mcp.services.gapAgriculture',
    icon: 'sprout',
  },
};

function ServiceCard({ server, theme, onPress }) {
  const isActive = server.displayStatus === 'active';
  const serverInfo = SERVER_INFO[server.slug];
  const info = serverInfo ? {
    name: t(`${serverInfo.stringKey}.name`),
    description: t(`${serverInfo.stringKey}.tagline`),
    icon: serverInfo.icon,
  } : {
    name: server.name?.replace(' MCP', '').replace(' Server', ''),
    description: server.description || t('mcp.fallback.service'),
    icon: 'puzzle',
  };

  return (
    <Card style={[styles.serviceCard, !isActive && styles.serviceCardInactive]}>
      <ListRow
        title={info.name}
        subtitle={info.description}
        onPress={onPress}
        left={
          <View style={[styles.serviceIcon, { backgroundColor: isActive ? theme.accent + '15' : theme.surfaceVariant }]}>
            <MaterialCommunityIcons
              name={info.icon}
              size={20}
              color={isActive ? theme.accent : theme.textMuted}
            />
          </View>
        }
        right={
          <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.textMuted }]} />
        }
        showChevron={true}
        paddingHorizontal={SPACING.md}
      />
    </Card>
  );
}

function CategorySection({ category, servers, theme, onServerPress }) {
  const config = SERVICE_CATEGORIES[category];
  if (!config || servers.length === 0) return null;

  const activeCount = servers.filter(s => s.displayStatus === 'active').length;

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

      {servers.map((server) => (
        <ServiceCard
          key={server.slug}
          server={server}
          theme={theme}
          onPress={() => onServerPress(server.slug)}
        />
      ))}
    </View>
  );
}

export default function McpServersScreen({ navigation }) {
  const { theme, location, locationDetails } = useApp();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mcpData, setMcpData] = useState(null);
  const [error, setError] = useState(null);

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
      console.error('Fetch MCP servers error:', err);
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
          <ActivityIndicator size="large" color={theme.accent} />
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
              onServerPress={handleServerPress}
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
  categorySection: {
    marginBottom: SPACING.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
