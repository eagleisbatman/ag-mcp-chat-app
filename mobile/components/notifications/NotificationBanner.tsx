import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';

interface Alert {
  id: string | number;
  type?: string;
  severity?: string;
  title?: string;
  description?: string;
}

interface NotificationBannerProps {
  alerts?: Alert[];
  onDismiss?: (id: string | number) => void;
  onPress?: (alert: Alert) => void;
}

interface SeverityColors {
  background: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * NotificationBanner - Persistent weather alert banner at top of screen
 */
const NotificationBanner: React.FC<NotificationBannerProps> = ({ alerts = [], onDismiss, onPress }) => {
  const { theme } = useApp();
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  // Show the most severe/recent alert
  const currentAlert = visibleAlerts[0];

  /**
   * Get banner colors based on severity
   */
  const getSeverityColors = (severity?: string): SeverityColors => {
    switch (severity?.toLowerCase()) {
      case 'extreme':
      case 'severe':
        return {
          background: theme.errorLight,
          text: theme.error,
          icon: 'warning',
        };
      case 'moderate':
        return {
          background: theme.warningLight,
          text: theme.warning,
          icon: 'alert-circle',
        };
      case 'minor':
      default:
        return {
          background: theme.infoLight,
          text: theme.info,
          icon: 'information-circle',
        };
    }
  };

  const colors = getSeverityColors(currentAlert.severity);

  /**
   * Handle dismiss with haptic feedback
   */
  const handleDismiss = (): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissedIds((prev) => new Set([...prev, currentAlert.id]));
    onDismiss?.(currentAlert.id);
  };

  /**
   * Handle banner press
   */
  const handlePress = (): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(currentAlert);
  };

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { style: [styles.container, { backgroundColor: colors.background }], onPress: handlePress, activeOpacity: 0.9 }
    : { style: [styles.container, { backgroundColor: colors.background }] };

  return (
    <Container {...containerProps}>
      {/* Alert icon */}
      <View style={styles.iconContainer}>
        <Ionicons name={colors.icon} size={24} color={colors.text} />
      </View>

      {/* Alert content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {currentAlert.title || t('weather_alert') || 'Weather Alert'}
        </Text>
        {currentAlert.description && (
          <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
            {currentAlert.description}
          </Text>
        )}
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        accessibilityLabel={t('a11y.dismiss') || 'Dismiss'}
      >
        <Ionicons name="close" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Multiple alerts indicator */}
      {visibleAlerts.length > 1 && (
        <View style={[styles.badge, { backgroundColor: colors.text }]}>
          <Text style={styles.badgeText}>+{visibleAlerts.length - 1}</Text>
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: SPACING.radiusMd,
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
    opacity: 0.9,
  },
  dismissButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});

export default NotificationBanner;
