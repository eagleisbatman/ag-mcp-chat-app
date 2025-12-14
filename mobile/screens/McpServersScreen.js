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
import { withAlpha } from '../utils/color';
import Card from '../components/ui/Card';
import ListRow from '../components/ui/ListRow';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { t } from '../constants/strings';

// Better icon mapping using MaterialCommunityIcons (more options)
const SERVER_ICONS = {
  // AI & Analytics
  'agrivision': { icon: 'leaf-circle' },
  'intent-classification': { icon: 'robot' },
  'entity-extraction': { icon: 'tag-search' },
  'guardrails': { icon: 'shield-check' },
  
  // Agriculture
  'nextgen': { icon: 'flask-outline' },      // Fertilizer recommendations
  'ssfr': { icon: 'flask-outline' },          // Legacy alias
  'feed-formulation': { icon: 'cow' },        // Livestock feed
  'isda-soil': { icon: 'terrain' },           // Soil data
  'decision-tree': { icon: 'source-branch' },
  'tips': { icon: 'lightbulb-on' },
  'gap-agriculture': { icon: 'sprout' },
  
  // Weather & Climate
  'accuweather': { icon: 'weather-partly-cloudy' },
  'edacap': { icon: 'weather-cloudy-arrow-right' }, // Climate forecasts
  'gap-weather': { icon: 'weather-lightning-rainy' },
  'weatherapi': { icon: 'weather-sunny' },
  'tomorrow-io': { icon: 'cloud-sync' },
  
  // Utility
  'user-preferences': { icon: 'cog' },
  'profile-memory': { icon: 'account-circle' },
  'content': { icon: 'book-open-page-variant' },
};

// Status colors and icons
const STATUS_CONFIG = {
  active: { icon: 'checkmark-circle', color: 'success', label: 'Active' },
  degraded: { icon: 'warning', color: 'warning', label: 'Unavailable' },
  inactive: { icon: 'remove-circle', color: 'textMuted', label: 'Not in region' },
  coming_soon: { icon: 'time', color: 'info', label: 'Coming soon' },
};

// Category config
const CATEGORY_CONFIG = {
  ai: { label: 'AI & Intelligence', icon: 'brain', color: '#9C27B0' },
  agriculture: { label: 'Agriculture', icon: 'sprout', color: '#4CAF50' },
  weather: { label: 'Weather', icon: 'weather-sunny', color: '#FF9800' },
  utility: { label: 'Utilities', icon: 'toolbox', color: '#607D8B' },
};

function ServerIcon({ slug, color, size = 24, theme }) {
  const iconConfig = SERVER_ICONS[slug] || { icon: 'puzzle', family: 'mci' };
  return (
    <MaterialCommunityIcons 
      name={iconConfig.icon} 
      size={size} 
      color={color || theme.accent} 
    />
  );
}

function McpServerCard({ server, theme, onPress }) {
  const status = server.displayStatus || 'inactive';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const statusColor = theme[statusConfig.color] || theme.textMuted;
  const cardOpacity = status === 'inactive' ? 0.6 : 1;
  const displayName = server.name?.replace(' MCP', '').replace(' Server', '');

  return (
    <Card style={[styles.serverCard, { opacity: cardOpacity }]}>
      <ListRow
        title={displayName}
        subtitle={server.description}
        onPress={onPress}
        left={
          <View style={styles.serverIconContainer}>
            <ServerIcon
              slug={server.slug}
              color={status === 'active' ? (server.color || theme.accent) : theme.textMuted}
              size={22}
              theme={theme}
            />
          </View>
        }
        right={
          <>
            {server.isGlobal ? (
              <View style={styles.globalBadge}>
                <AppIcon name="globe-outline" size={10} color={theme.info} />
              </View>
            ) : null}
            <View style={styles.statusIndicator}>
              <AppIcon name={statusConfig.icon} size={14} color={statusColor} />
            </View>
          </>
        }
        showChevron={true}
        paddingHorizontal={SPACING.md}
        accessibilityLabel={t('mcp.service', { name: displayName })}
      />

      {/* Status message for non-active servers */}
      {status !== 'active' && server.statusMessage && (
        <Text style={[styles.statusMessage, { color: statusColor }]}>
          {server.statusMessage}
        </Text>
      )}
    </Card>
  );
}

function CategorySection({ category, servers, theme, onServerPress }) {
  const config = CATEGORY_CONFIG[category] || { label: category, icon: 'puzzle', color: '#888' };
  const activeCount = servers.filter(s => s.displayStatus === 'active').length;
  const degradedCount = servers.filter(s => s.displayStatus === 'degraded').length;
  const countLabel = `${activeCount}${degradedCount > 0 ? ` (+${degradedCount})` : ''}/${servers.length}`;

  return (
    <View style={styles.categorySection}>
      <ListRow
        title={config.label}
        left={
          <View style={styles.categoryIcon}>
            <MaterialCommunityIcons name={config.icon} size={16} color={config.color} />
          </View>
        }
        right={<Text style={[styles.categoryCount, { color: theme.textMuted }]}>{countLabel}</Text>}
        showChevron={false}
        paddingHorizontal={0}
        paddingVertical={SPACING.sm}
        style={styles.categoryHeaderRow}
        accessibilityLabel={t('mcp.serviceCategory', { name: config.label })}
      />

      {servers.map((server, index) => (
        <McpServerCard
          key={server.slug || index}
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
      
      // Use live status API for real-time health checks
      const response = await api.getMcpServersLiveStatus(params);
      
      if (response.success) {
        setMcpData(response);
      } else {
        throw new Error(response.error || 'Failed to fetch services');
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

  // Group servers by category
  const serversByCategory = React.useMemo(() => {
    if (!mcpData?.servers) return {};
    const grouped = {};
    mcpData.servers.forEach(server => {
      const cat = server.category || 'utility';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(server);
    });
    // Sort each category: active first, then degraded, then coming_soon, then inactive
    const statusOrder = { active: 0, degraded: 1, coming_soon: 2, inactive: 3 };
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => {
        const orderA = statusOrder[a.displayStatus] ?? 3;
        const orderB = statusOrder[b.displayStatus] ?? 3;
        return orderA - orderB;
      });
    });
    return grouped;
  }, [mcpData]);

  const counts = mcpData?.counts || { total: 0, active: 0, degraded: 0, inactive: 0, comingSoon: 0 };
  const detectedRegions = mcpData?.detectedRegions || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
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
            accessibilityLabel={t('a11y.retryLoadingIntegrations')}
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
          {/* Summary Card */}
          <Card style={styles.summaryCard}>
            {/* Location */}
            <View style={styles.locationRow}>
              <AppIcon name="location" size={16} color={theme.accent} />
              <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                {locationDetails?.displayName || 
                 (location ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : t('mcp.locationNotSet'))}
              </Text>
            </View>
            
            {/* Region badges */}
            {detectedRegions.length > 0 && (
              <View style={styles.regionBadges}>
                {detectedRegions.slice(0, 3).map((region, index) => (
                  <View key={index} style={styles.regionBadge}>
                    <Text style={[styles.regionBadgeText, { color: theme.accent }]}>
                      {region.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Stats */}
            <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.success }]}>{counts.active}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('mcp.stats.active')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.warning || '#FF9800' }]}>{counts.degraded}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('mcp.stats.issues')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.textMuted }]}>{counts.inactive}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('mcp.stats.inactive')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{counts.total}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('mcp.stats.total')}</Text>
              </View>
            </View>
          </Card>

          {/* Category Sections - in preferred order */}
          {['ai', 'agriculture', 'weather', 'utility'].map(category => {
            const servers = serversByCategory[category];
            if (!servers || servers.length === 0) return null;
            return (
              <CategorySection
                key={category}
                category={category}
                servers={servers}
                theme={theme}
                onServerPress={handleServerPress}
              />
            );
          })}

          {/* Footer */}
          <View style={styles.footer}>
            <AppIcon name="information-circle-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              {t('mcp.footer')}
            </Text>
          </View>
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
  summaryCard: {
    borderRadius: 0,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  regionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  regionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  regionBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: '80%',
    alignSelf: 'center',
  },
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryHeaderRow: {
    marginBottom: SPACING.sm,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  categoryCount: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  serverCard: {
    marginBottom: SPACING.sm,
  },
  serverIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  globalBadge: {
    width: 18,
    height: 18,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  statusIndicator: {
    width: 26,
    height: 26,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  statusMessage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
  },
});
