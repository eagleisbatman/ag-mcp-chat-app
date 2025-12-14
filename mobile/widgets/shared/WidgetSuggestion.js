/**
 * WidgetSuggestion - A natural, non-intrusive prompt for using a widget
 *
 * Shows when the AI detects the user might benefit from structured input.
 * Displays a friendly prompt with an action button to open the input widget.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';
import { WIDGET_METADATA } from '../schemas/WidgetSchemas';

// Icons for different widget types
const WIDGET_ICONS = {
  weather_input: 'partly-sunny',
  feed_formulation_input: 'nutrition',
  soil_query_input: 'layers',
  fertilizer_input: 'flask',
  climate_query_input: 'calendar',
  decision_tree_input: 'leaf',
};

export default function WidgetSuggestion({ suggestion, onAccept }) {
  const { theme } = useApp();

  if (!suggestion?.type) return null;

  const metadata = WIDGET_METADATA[suggestion.type];
  const icon = WIDGET_ICONS[suggestion.type] || 'apps';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAccept?.(suggestion.type);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceVariant }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
          <AppIcon name={icon} size={20} color={theme.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.prompt, { color: theme.text }]}>
            {suggestion.prompt || `Try the ${metadata?.name || 'tool'} for better results`}
          </Text>
          {suggestion.reason && (
            <Text style={[styles.reason, { color: theme.textMuted }]} numberOfLines={2}>
              {suggestion.reason}
            </Text>
          )}
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          pressed && styles.buttonPressed,
        ]}
        onPress={handlePress}
        android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.2)' } : undefined}
      >
        <Text style={styles.buttonText}>Open</Text>
        <AppIcon name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
    marginTop: SPACING.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginRight: SPACING.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  prompt: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    lineHeight: TYPOGRAPHY.sizes.sm * 1.3,
  },
  reason: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
    lineHeight: TYPOGRAPHY.sizes.xs * 1.3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.radiusFull,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
