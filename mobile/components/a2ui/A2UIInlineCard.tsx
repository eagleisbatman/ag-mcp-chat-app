/**
 * A2UIInlineCard — Renders an A2UI directive as a tappable card inline in chat.
 * Shows title and description, user taps to respond.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import type { A2UIPayload } from '../../types';

const WIDGET_ICONS: Record<string, string> = {
  crop_picker: 'sprout',
  livestock_picker: 'paw',
  plot_selector: 'map-pin',
  confirmation: 'alert-circle',
  number_input: 'target',
  date_picker: 'clock',
  multi_select: 'check-circle',
  form: 'file-text',
  profile_prompt: 'user',
  farmer_picker: 'users',
};

interface A2UIInlineCardProps {
  widget: A2UIPayload;
  onPress: (widget: A2UIPayload) => void;
  responded?: boolean;
}

export default function A2UIInlineCard({ widget, onPress, responded }: A2UIInlineCardProps) {
  const { theme } = useApp();
  const iconName = WIDGET_ICONS[widget.widgetType] || 'info';

  return (
    <TouchableOpacity
      onPress={() => onPress(widget)}
      activeOpacity={0.7}
      disabled={responded}
      style={[
        styles.container,
        {
          backgroundColor: responded ? theme.surfaceVariant : theme.accent + '12',
          borderColor: responded ? theme.inputBorder : theme.accent + '40',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={widget.title || 'Select an option'}
      accessibilityHint={responded ? 'Already responded' : 'Tap to open picker'}
      accessibilityState={{ disabled: responded }}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.accent + '20' }]}>
        <AppIcon name={iconName} size={18} color={theme.accent} />
      </View>
      <View style={styles.textWrap}>
        {widget.title && (
          <Text
            style={[styles.title, { color: responded ? theme.textMuted : theme.text }]}
            numberOfLines={2}
          >
            {widget.title}
          </Text>
        )}
        {widget.description && (
          <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={1}>
            {widget.description}
          </Text>
        )}
      </View>
      {responded ? (
        <AppIcon name="checkmark" size={18} color={theme.success} />
      ) : (
        <AppIcon name="chevron-forward" size={18} color={theme.accent} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
});
