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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING } from '../constants/themes';
import api from '../services/api';

// Icon mapping for MCP server categories
const CATEGORY_ICONS = {
  agriculture: 'leaf',
  weather: 'cloud',
  ai: 'hardware-chip',
  utility: 'construct',
};

// Icon mapping for MCP server icons (Material Icons)
const SERVER_ICONS = {
  leaf: 'eco',
  cloud: 'cloud',
  brain: 'psychology',
  settings: 'settings',
  person: 'person',
  book: 'menu_book',
  shield: 'shield',
  lightbulb: 'lightbulb',
  science: 'science',
  pets: 'pets',
  terrain: 'terrain',
  account_tree: 'account_tree',
  wb_sunny: 'wb_sunny',
  thunderstorm: 'thunderstorm',
};

function McpServerCard({ server, theme, isGlobal }) {
  const iconName = SERVER_ICONS[server.icon] || 'extension';
  const statusColor = server.healthStatus === 'healthy' 
    ? theme.success 
    : server.healthStatus === 'unhealthy' 
      ? theme.error 
      : theme.textMuted;

  return (
    <View style={[styles.serverCard, { backgroundColor: theme.surface }]}>
      <View style={styles.serverHeader}>
        <View style={[styles.serverIconContainer, { backgroundColor: server.color + '20' }]}>
          <MaterialIcons 
            name={iconName} 
            size={24} 
            color={server.color || theme.accent} 
          />
        </View>
        <View style={styles.serverInfo}>
          <Text style={[styles.serverName, { color: theme.text }]} numberOfLines={1}>
            {server.name}
          </Text>
          {server.sourceRegion && (
            <Text style={[styles.serverSource, { color: theme.textMuted }]}>
              via {server.sourceRegion}
            </Text>
          )}
        </View>
        <View style={styles.serverStatus}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          {isGlobal && (
            <View style={[styles.globalBadge, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.globalBadgeText, { color: theme.accent }]}>Global</Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={[styles.serverDescription, { color: theme.textMuted }]} numberOfLines={2}>
        {server.description}
      </Text>
      
      {server.capabilities && Array.isArray(server.capabilities) && (
        <View style={styles.capabilitiesContainer}>
          {server.capabilities.slice(0, 4).map((cap, index) => (
            <View 
              key={index} 
              style={[styles.capabilityBadge, { backgroundColor: theme.surfaceVariant }]}
            >
              <Text style={[styles.capabilityText, { color: theme.textMuted }]}>
                {cap}
              </Text>
            </View>
          ))}
          {server.capabilities.length > 4 && (
            <Text style={[styles.moreCapabilities, { color: theme.textMuted }]}>
              +{server.capabilities.length - 4} more
            </Text>
          )}
        </View>
      )}
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
      
      // Build query params based on location
      const params = {};
      if (location?.latitude && location?.longitude) {
        params.lat = location.latitude;
        params.lon = location.longitude;
      }
      
      const response = await api.getActiveMcpServers(params);
      
      if (response.success) {
        setMcpData(response);
      } else {
        throw new Error(response.error || 'Failed to fetch MCP servers');
      }
    } catch (err) {
      console.error('Fetch MCP servers error:', err);
      setError(err.message);
      showError('Could not load MCP servers');
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

  const globalServers = mcpData?.global || [];
  const regionalServers = mcpData?.regional || [];
  const detectedRegions = mcpData?.detectedRegions || [];
  const totalActive = mcpData?.totalActive || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>AI Services</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading services...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error}
          </Text>
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
          {/* Location & Stats Summary */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="location" size={20} color={theme.accent} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={[styles.summaryTitle, { color: theme.text }]}>
                  Your Location
                </Text>
                <Text style={[styles.summarySubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                  {locationDetails?.displayName || 
                   (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Not set')}
                </Text>
              </View>
            </View>
            
            {detectedRegions.length > 0 && (
              <View style={styles.regionsContainer}>
                <Text style={[styles.regionsLabel, { color: theme.textMuted }]}>
                  Detected Regions:
                </Text>
                <View style={styles.regionBadges}>
                  {detectedRegions.map((region, index) => (
                    <View 
                      key={index}
                      style={[styles.regionBadge, { backgroundColor: theme.accentLight }]}
                    >
                      <Text style={[styles.regionBadgeText, { color: theme.accent }]}>
                        {region.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.accent }]}>
                  {totalActive}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Total Active
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.success }]}>
                  {globalServers.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Global
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.warning }]}>
                  {regionalServers.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Regional
                </Text>
              </View>
            </View>
          </View>

          {/* Global Services Section */}
          {globalServers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe-outline" size={18} color={theme.textMuted} />
                <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                  GLOBAL SERVICES
                </Text>
                <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
                  {globalServers.length}
                </Text>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                Available everywhere, regardless of location
              </Text>
              
              {globalServers.map((server, index) => (
                <McpServerCard 
                  key={server.slug || index} 
                  server={server} 
                  theme={theme}
                  isGlobal={true}
                />
              ))}
            </View>
          )}

          {/* Regional Services Section */}
          {regionalServers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map-outline" size={18} color={theme.textMuted} />
                <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                  REGIONAL SERVICES
                </Text>
                <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
                  {regionalServers.length}
                </Text>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                Available in your detected region
              </Text>
              
              {regionalServers.map((server, index) => (
                <McpServerCard 
                  key={server.slug || index} 
                  server={server} 
                  theme={theme}
                  isGlobal={false}
                />
              ))}
            </View>
          )}

          {/* No Regional Services */}
          {regionalServers.length === 0 && !loading && (
            <View style={[styles.emptySection, { backgroundColor: theme.surface }]}>
              <Ionicons name="map-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Regional Services
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {location 
                  ? 'No region-specific services available for your location yet.'
                  : 'Enable location to see region-specific services.'}
              </Text>
            </View>
          )}

          {/* Info Footer */}
          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Services activate automatically based on your location. Pull down to refresh.
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summarySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  regionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  regionsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  regionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  serverCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serverIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serverSource: {
    fontSize: 12,
    marginTop: 2,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  globalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  globalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  serverDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  capabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capabilityText: {
    fontSize: 11,
  },
  moreCapabilities: {
    fontSize: 11,
    alignSelf: 'center',
  },
  emptySection: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

