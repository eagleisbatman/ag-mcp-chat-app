import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import api from '../services/api';

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

function McpServerCard({ server, theme }) {
  const status = server.displayStatus || 'inactive';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const statusColor = theme[statusConfig.color] || theme.textMuted;
  const cardOpacity = status === 'inactive' ? 0.6 : 1;

  return (
    <View style={[styles.serverCard, { backgroundColor: theme.surface, opacity: cardOpacity }]}>
      <View style={styles.serverRow}>
        {/* Icon */}
        <View style={[styles.serverIconContainer, { backgroundColor: (server.color || theme.accent) + '15' }]}>
          <ServerIcon 
            slug={server.slug} 
            color={status === 'active' ? (server.color || theme.accent) : theme.textMuted} 
            size={22}
            theme={theme}
          />
        </View>
        
        {/* Info */}
        <View style={styles.serverInfo}>
          <View style={styles.serverNameRow}>
            <Text style={[styles.serverName, { color: theme.text }]} numberOfLines={1}>
              {server.name?.replace(' MCP', '').replace(' Server', '')}
            </Text>
            {server.isGlobal && (
              <View style={[styles.globalBadge, { backgroundColor: theme.info + '20' }]}>
                <Ionicons name="globe-outline" size={10} color={theme.info} />
              </View>
            )}
          </View>
          <Text style={[styles.serverDescription, { color: theme.textMuted }]} numberOfLines={1}>
            {server.description}
          </Text>
        </View>
        
        {/* Status indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: statusColor + '20' }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
        </View>
      </View>
      
      {/* Status message for non-active servers */}
      {status !== 'active' && server.statusMessage && (
        <Text style={[styles.statusMessage, { color: statusColor }]}>
          {server.statusMessage}
        </Text>
      )}
    </View>
  );
}

function CategorySection({ category, servers, theme }) {
  const config = CATEGORY_CONFIG[category] || { label: category, icon: 'puzzle', color: '#888' };
  const activeCount = servers.filter(s => s.displayStatus === 'active').length;
  const degradedCount = servers.filter(s => s.displayStatus === 'degraded').length;
  
  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: config.color + '15' }]}>
          <MaterialCommunityIcons name={config.icon} size={16} color={config.color} />
        </View>
        <Text style={[styles.categoryLabel, { color: theme.text }]}>
          {config.label}
        </Text>
        <Text style={[styles.categoryCount, { color: theme.textMuted }]}>
          {activeCount}{degradedCount > 0 ? ` (+${degradedCount} ⚠️)` : ''}/{servers.length}
        </Text>
      </View>
      
      {servers.map((server, index) => (
        <McpServerCard 
          key={server.slug || index} 
          server={server} 
          theme={theme}
        />
      ))}
    </View>
  );
}

export default function McpServersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
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
      showError('Could not load services');
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
      <View style={[styles.header, { paddingTop: headerPaddingTop, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>AI Integrations</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading integrations...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={fetchMcpServers}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            {/* Location */}
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={theme.accent} />
              <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                {locationDetails?.displayName || 
                 (location ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : 'Location not set')}
              </Text>
            </View>
            
            {/* Region badges */}
            {detectedRegions.length > 0 && (
              <View style={styles.regionBadges}>
                {detectedRegions.slice(0, 3).map((region, index) => (
                  <View 
                    key={index}
                    style={[styles.regionBadge, { backgroundColor: theme.accent + '15' }]}
                  >
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
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Active</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.warning || '#FF9800' }]}>{counts.degraded}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Issues</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.textMuted }]}>{counts.inactive}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Inactive</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{counts.total}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
              </View>
            </View>
          </View>

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
              />
            );
          })}

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Integrations activate based on your region. Pull to refresh.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    borderRadius: 12,
  },
  regionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 0.5,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 0.5,
    height: '80%',
    alignSelf: 'center',
  },
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
  },
  serverCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serverIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverInfo: {
    flex: 1,
    minWidth: 0,
  },
  serverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serverName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  globalBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusMessage: {
    fontSize: 11,
    marginTop: 8,
    marginLeft: 52,
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
    fontSize: 11,
    textAlign: 'center',
  },
});
