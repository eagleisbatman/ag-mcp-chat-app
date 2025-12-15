/**
 * NowcastAlertCard - Immediate Rain Alert
 *
 * Design: Dynamic gradient based on rain status
 * - Large status icon and text
 * - Visual probability bars
 * - Action advice
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Get rain status and gradient
const getRainStatus = (probs) => {
  const light = probs?.light || probs?.precip_200_um || 0;
  const moderate = probs?.moderate || probs?.precip_1000_um || 0;
  const heavy = probs?.heavy || probs?.precip_4000_um || 0;
  const veryHeavy = probs?.very_heavy || probs?.precip_10000_um || 0;

  if (veryHeavy >= 50) {
    return {
      status: 'Heavy Rain Alert',
      icon: 'thunderstorm',
      message: 'Seek shelter immediately',
      gradient: ['#5D4037', '#6D4C41', '#795548'],
      severity: 'critical',
    };
  }
  if (heavy >= 50) {
    return {
      status: 'Rain Expected',
      icon: 'rainy',
      message: 'Avoid outdoor activities',
      gradient: ['#455A64', '#546E7A', '#607D8B'],
      severity: 'warning',
    };
  }
  if (moderate >= 50) {
    return {
      status: 'Rain Likely',
      icon: 'rainy',
      message: 'Consider postponing field work',
      gradient: ['#1565C0', '#1976D2', '#2196F3'],
      severity: 'moderate',
    };
  }
  if (light >= 50) {
    return {
      status: 'Light Rain Possible',
      icon: 'partly-sunny',
      message: 'Light drizzle may occur',
      gradient: ['#0277BD', '#0288D1', '#03A9F4'],
      severity: 'low',
    };
  }
  return {
    status: 'Clear Skies',
    icon: 'sunny',
    message: 'Good conditions for field work',
    gradient: ['#FF8F00', '#FFA000', '#FFB300'],
    severity: 'none',
  };
};

// Compact probability bar
function ProbBar({ label, value, color }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.probItem}>
      <Text style={styles.probLabel}>{label}</Text>
      <View style={styles.probBarBg}>
        <View style={[styles.probBarFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.probValue}>{Math.round(value)}%</Text>
    </View>
  );
}

export default function NowcastAlertCard({ data = {} }) {
  const { theme } = useApp();

  // Parse probabilities
  const probs = data.probabilities || {
    light: data.precip_200_um || 0,
    moderate: data.precip_1000_um || 0,
    heavy: data.precip_4000_um || 0,
    very_heavy: data.precip_10000_um || 0,
  };

  const status = getRainStatus(probs);
  const validUntil = data.valid_until
    ? new Date(data.valid_until).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (!probs.light && !probs.moderate && !probs.heavy && !probs.very_heavy) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="cloud-offline" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Rain alert data unavailable
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={status.gradient} style={styles.container}>
      {/* Status Display */}
      <View style={styles.statusSection}>
        <View style={styles.iconCircle}>
          <AppIcon name={status.icon} size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.statusText}>{status.status}</Text>
        <Text style={styles.messageText}>{status.message}</Text>
      </View>

      {/* Probability Bars */}
      <View style={styles.probSection}>
        <Text style={styles.sectionLabel}>Rain Intensity Probability</Text>
        <ProbBar label="Light" value={probs.light} color="#81D4FA" />
        <ProbBar label="Moderate" value={probs.moderate} color="#4FC3F7" />
        <ProbBar label="Heavy" value={probs.heavy} color="#29B6F6" />
        <ProbBar label="Very Heavy" value={probs.very_heavy} color="#03A9F4" />
      </View>

      {/* Valid Until */}
      {validUntil && (
        <View style={styles.validRow}>
          <AppIcon name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.validText}>Valid until {validUntil}</Text>
        </View>
      )}

      {/* Attribution */}
      <Text style={styles.attribution}>Google Nowcast via TomorrowNow GAP</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  messageText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  probSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  probItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  probLabel: {
    width: 70,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  probBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  probValue: {
    width: 36,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#FFFFFF',
    textAlign: 'right',
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  validText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  attribution: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  errorContainer: {
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
