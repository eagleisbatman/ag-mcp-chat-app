import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';

/**
 * NotificationBanner - Persistent weather alert banner at top of screen
 *
 * @param {object} props
 * @param {Array} props.alerts - Array of alert objects { id, type, severity, title, description }
 * @param {function} props.onDismiss - Callback when an alert is dismissed
 * @param {function} props.onPress - Callback when banner is pressed (optional)
 */
const NotificationBanner = ({ alerts = [], onDismiss, onPress }) => {
  const { theme } = useApp();
  const [dismissedIds, setDismissedIds] = useState(new Set());

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
  const getSeverityColors = (severity) => {
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
  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissedIds((prev) => new Set([...prev, currentAlert.id]));
    onDismiss?.(currentAlert.id);
  };

  /**
   * Handle banner press
   */
  const handlePress = () => {
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

NotificationBanner.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      type: PropTypes.string,
      severity: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
    })
  ),
  onDismiss: PropTypes.func,
  onPress: PropTypes.func,
};

export default NotificationBanner;
