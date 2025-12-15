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

// Server display info with consistent descriptions
const SERVER_INFO = {
  'isda-soil': {
    name: 'ISDA Soil',
    tagline: 'Soil properties and nutrient analysis for Africa',
    description: 'Get detailed soil information including pH, nitrogen, phosphorus, potassium, and other nutrients. Coverage includes all of Africa with 30-meter resolution.',
    icon: 'terrain',
    color: '#8B4513',
    features: [
      { title: 'Soil pH', description: 'Acidity/alkalinity levels' },
      { title: 'Nitrogen', description: 'Total nitrogen content' },
      { title: 'Phosphorus', description: 'Available phosphorus' },
      { title: 'Potassium', description: 'Exchangeable potassium' },
    ],
    coverage: ['Africa'],
  },
  'accuweather': {
    name: 'AccuWeather',
    tagline: 'Current conditions and weather forecasts worldwide',
    description: 'Access real-time weather data including temperature, humidity, wind speed, and precipitation. Forecasts available up to 15 days.',
    icon: 'weather-partly-cloudy',
    color: '#2196F3',
    features: [
      { title: 'Current Weather', description: 'Real-time conditions' },
      { title: 'Temperature', description: 'Current and feels-like' },
      { title: 'Humidity', description: 'Relative humidity levels' },
      { title: 'Forecast', description: 'Up to 15-day forecast' },
    ],
    coverage: ['Worldwide'],
  },
  'gap-weather': {
    name: 'GAP Weather',
    tagline: 'Agricultural weather forecasts for East Africa',
    description: 'Specialized weather forecasts for agriculture in East Africa. Includes evapotranspiration, solar radiation, and precipitation forecasts tailored for farming decisions.',
    icon: 'weather-lightning-rainy',
    color: '#1565C0',
    features: [
      { title: 'Precipitation', description: 'Rainfall forecasts' },
      { title: 'Evapotranspiration', description: 'ET estimates for irrigation' },
      { title: 'Solar Radiation', description: 'For crop growth modeling' },
      { title: 'Wind', description: 'Speed and direction' },
    ],
    coverage: ['Kenya', 'East Africa'],
  },
  'edacap': {
    name: 'EDACaP Climate',
    tagline: 'Seasonal climate forecasts for Ethiopia',
    description: 'Seasonal climate outlook including temperature and rainfall predictions. Helps farmers plan planting and harvesting schedules.',
    icon: 'weather-cloudy-arrow-right',
    color: '#0D47A1',
    features: [
      { title: 'Seasonal Outlook', description: 'Multi-month forecasts' },
      { title: 'Rainfall Probability', description: 'Below/Normal/Above' },
      { title: 'Temperature Trend', description: 'Expected deviations' },
      { title: 'Crop Forecasts', description: 'Yield predictions' },
    ],
    coverage: ['Ethiopia'],
  },
  'weatherapi': {
    name: 'WeatherAPI',
    tagline: 'Weather data for global locations',
    description: 'Comprehensive weather data service providing current conditions and forecasts for locations worldwide.',
    icon: 'weather-sunny',
    color: '#FF9800',
    features: [
      { title: 'Current Weather', description: 'Real-time conditions' },
      { title: 'Forecast', description: 'Multi-day forecasts' },
      { title: 'Historical', description: 'Past weather data' },
      { title: 'Astronomy', description: 'Sunrise/sunset times' },
    ],
    coverage: ['Worldwide'],
  },
  'tomorrow-io': {
    name: 'Tomorrow.io',
    tagline: 'Weather intelligence and forecasting',
    description: 'Advanced weather intelligence platform with high-resolution forecasts and nowcasting capabilities.',
    icon: 'cloud-sync',
    color: '#673AB7',
    features: [
      { title: 'Nowcast', description: 'Minute-by-minute forecasts' },
      { title: 'Forecasts', description: 'Hourly and daily' },
      { title: 'Alerts', description: 'Severe weather warnings' },
      { title: 'Historical', description: 'Climate data' },
    ],
    coverage: ['Worldwide'],
  },
  'feed-formulation': {
    name: 'Feed Formulation',
    tagline: 'Optimal diet calculations for dairy cattle',
    description: 'Calculate the most cost-effective feed mix for your dairy cattle. Takes into account milk production targets, body weight, and available local feeds.',
    icon: 'cow',
    color: '#4CAF50',
    features: [
      { title: 'Diet Optimization', description: 'Cost-effective feed mix' },
      { title: 'Nutrient Balance', description: 'Protein, energy, minerals' },
      { title: 'Local Feeds', description: 'Ethiopia feed database' },
      { title: 'Cost Calculation', description: 'Daily feeding costs' },
    ],
    coverage: ['Ethiopia'],
  },
  'nextgen': {
    name: 'NextGen Fertilizer',
    tagline: 'Site-specific fertilizer recommendations for Ethiopia',
    description: 'Get precise fertilizer recommendations based on your exact location. Includes both organic (compost, vermicompost) and inorganic (Urea, NPS) recommendations.',
    icon: 'flask-outline',
    color: '#E91E63',
    features: [
      { title: 'Organic Fertilizers', description: 'Compost, vermicompost (tons/ha)' },
      { title: 'Inorganic Fertilizers', description: 'Urea, NPS amounts (kg/ha)' },
      { title: 'Expected Yield', description: 'Predicted harvest' },
      { title: 'Site-Specific', description: 'Based on your GPS location' },
    ],
    coverage: ['Ethiopia'],
    crops: ['Wheat', 'Maize'],
  },
  'decision-tree': {
    name: 'Crop Decision Tree',
    tagline: 'Growth stage recommendations for Kenya',
    description: 'Get crop management recommendations based on growth stage and current weather conditions. Helps you make timely decisions for pest control, irrigation, and harvesting.',
    icon: 'source-branch',
    color: '#009688',
    features: [
      { title: 'Growth Stage', description: 'Track crop development' },
      { title: 'Recommendations', description: 'Timely advice' },
      { title: 'Weather-Based', description: 'Adjusted for conditions' },
      { title: 'Actions', description: 'What to do now' },
    ],
    coverage: ['Kenya'],
    crops: ['Maize', 'Beans'],
  },
  'gap-agriculture': {
    name: 'GAP Agriculture',
    tagline: 'Agricultural advisory services',
    description: 'General agricultural advisory services for crop and livestock management.',
    icon: 'sprout',
    color: '#8BC34A',
    features: [
      { title: 'Crop Advice', description: 'Planting and harvesting' },
      { title: 'Best Practices', description: 'Agricultural guidance' },
      { title: 'Seasonal Tips', description: 'Timely recommendations' },
      { title: 'Local Knowledge', description: 'Region-specific advice' },
    ],
    coverage: ['East Africa'],
  },
};

function FeatureItem({ feature, theme, color }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name="check" size={16} color={color} />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
        <Text style={[styles.featureDescription, { color: theme.textMuted }]}>{feature.description}</Text>
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

  // Get display info from our config or fallback to API data
  const info = SERVER_INFO[slug] || {
    name: server?.name?.replace(' MCP', '').replace(' Server', '') || slug,
    tagline: server?.description || 'Agricultural service',
    description: server?.longDescription || 'Service details not available.',
    icon: 'puzzle',
    color: theme.accent,
    features: [],
    coverage: [],
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
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>
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
                {isActive ? 'Active' : 'Not available in your region'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
            <Text style={[styles.descriptionText, { color: theme.textMuted }]}>{info.description}</Text>
          </Card>

          {/* Features */}
          {info.features && info.features.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Features</Text>
              <View style={styles.featuresList}>
                {info.features.map((feature, index) => (
                  <FeatureItem key={index} feature={feature} theme={theme} color={displayColor} />
                ))}
              </View>
            </Card>
          )}

          {/* Coverage */}
          {info.coverage && info.coverage.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Available In</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supported Crops</Text>
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
