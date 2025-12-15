/**
 * WidgetRenderer - Main widget rendering component
 *
 * Takes a widget schema and renders the appropriate input or output widget.
 * This is the central hub for all widget rendering in the app.
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import { WIDGET_TYPES, isInputWidget, isOutputWidget, WIDGET_METADATA } from './schemas/WidgetSchemas';

// Input Widgets
import WeatherInputWidget from './input/WeatherInputWidget';
import GapWeatherInputWidget from './input/GapWeatherInputWidget';
import FeedFormulationWidget from './input/FeedFormulationWidget';
import SoilQueryWidget from './input/SoilQueryWidget';
import FertilizerInputWidget from './input/FertilizerInputWidget';
import ClimateQueryWidget from './input/ClimateQueryWidget';
import DecisionTreeWidget from './input/DecisionTreeWidget';

// Output Widgets
import WeatherForecastCard from './output/WeatherForecastCard';
import SalientForecastCard from './output/SalientForecastCard';
import CBAMDetailedCard from './output/CBAMDetailedCard';
import NowcastAlertCard from './output/NowcastAlertCard';
import DietRecommendationCard from './output/DietRecommendationCard';
import SoilProfileCard from './output/SoilProfileCard';
import FertilizerResultCard from './output/FertilizerResultCard';
import ClimateForecastCard from './output/ClimateForecastCard';
import RecommendationListCard from './output/RecommendationListCard';

/**
 * Get the widget component for a given type
 */
const getWidgetComponent = (type) => {
  const widgetMap = {
    // Input Widgets
    [WIDGET_TYPES.WEATHER_INPUT]: WeatherInputWidget,
    [WIDGET_TYPES.GAP_WEATHER_INPUT]: GapWeatherInputWidget,
    [WIDGET_TYPES.FEED_FORM]: FeedFormulationWidget,
    [WIDGET_TYPES.SOIL_QUERY]: SoilQueryWidget,
    [WIDGET_TYPES.FERTILIZER_INPUT]: FertilizerInputWidget,
    [WIDGET_TYPES.CLIMATE_QUERY]: ClimateQueryWidget,
    [WIDGET_TYPES.DECISION_TREE]: DecisionTreeWidget,

    // Output Widgets
    [WIDGET_TYPES.WEATHER_FORECAST]: WeatherForecastCard,
    [WIDGET_TYPES.SALIENT_FORECAST]: SalientForecastCard,
    [WIDGET_TYPES.CBAM_DETAILED]: CBAMDetailedCard,
    [WIDGET_TYPES.NOWCAST_ALERT]: NowcastAlertCard,
    [WIDGET_TYPES.DIET_RESULT]: DietRecommendationCard,
    [WIDGET_TYPES.SOIL_PROFILE]: SoilProfileCard,
    [WIDGET_TYPES.FERTILIZER_RESULT]: FertilizerResultCard,
    [WIDGET_TYPES.CLIMATE_FORECAST]: ClimateForecastCard,
    [WIDGET_TYPES.RECOMMENDATIONS]: RecommendationListCard,
  };

  return widgetMap[type] || null;
};

/**
 * Placeholder component for widgets not yet implemented
 */
function WidgetPlaceholder({ type, onSubmit }) {
  const { theme } = useApp();
  const metadata = WIDGET_METADATA[type];
  const isInput = isInputWidget(type);

  return (
    <View style={[styles.placeholder, { backgroundColor: theme.surfaceVariant }]}>
      <Text style={[styles.placeholderTitle, { color: theme.text }]}>
        {metadata?.name || type}
      </Text>
      <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
        {isInput ? 'Input widget coming soon...' : 'Result card coming soon...'}
      </Text>
      {isInput && (
        <Text style={[styles.placeholderHint, { color: theme.textMuted }]}>
          For now, ask your question in the chat.
        </Text>
      )}
    </View>
  );
}

/**
 * Main WidgetRenderer component
 *
 * @param {Object} props
 * @param {Object} props.widget - Widget schema { type, data }
 * @param {Function} props.onSubmit - Callback when widget form is submitted (for input widgets)
 * @param {Function} props.onAction - Callback for widget actions (buttons, links)
 * @param {boolean} props.loading - Show loading state
 */
export default function WidgetRenderer({
  widget,
  onSubmit,
  onAction,
  loading = false,
}) {
  const { theme } = useApp();

  // Handle missing widget
  if (!widget || !widget.type) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.surfaceVariant }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading...
        </Text>
      </View>
    );
  }

  // Get the widget component
  const WidgetComponent = getWidgetComponent(widget.type);

  // Render placeholder if widget not implemented
  if (!WidgetComponent) {
    return <WidgetPlaceholder type={widget.type} onSubmit={onSubmit} />;
  }

  // Render the widget
  return (
    <View style={styles.container}>
      <WidgetComponent
        {...widget}
        data={widget.data}
        onSubmit={onSubmit}
        onAction={onAction}
      />
    </View>
  );
}

/**
 * Check if a type has an implemented widget
 */
export function isWidgetImplemented(type) {
  return getWidgetComponent(type) !== null;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  loadingContainer: {
    padding: SPACING.xl,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  placeholder: {
    padding: SPACING.lg,
    borderRadius: SPACING.radiusMd,
  },
  placeholderTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  placeholderHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});
