import React, { Component } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Appearance } from 'react-native';
import AppIcon from './ui/AppIcon';
import { TYPOGRAPHY } from '../constants/themes';
import { t } from '../constants/strings';

/**
 * Error Boundary - Catches JavaScript errors in child components
 * Shows a fallback UI instead of crashing the app
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (could send to analytics service)
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const scheme = Appearance.getColorScheme();
      const isDark = scheme === 'dark';
      const theme = {
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#000000' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        textMuted: isDark ? '#8E8E93' : '#3C3C43',
        accent: isDark ? '#30D158' : '#34C759',
        accentLight: isDark ? 'rgba(48,209,88,0.14)' : 'rgba(52,199,89,0.14)',
      };
      const rippleColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

      return (
	        <View style={[styles.container, { backgroundColor: theme.background }]}>
	          <View style={styles.content}>
	            <View style={styles.iconContainer}>
	              <AppIcon name="warning-outline" size={64} color={theme.accent} />
	            </View>
	            <Text style={[styles.title, { color: theme.text }]}>{t('system.errorTitle')}</Text>
	            <Text style={[styles.message, { color: theme.textMuted }]}>
	              {t('system.errorFallback')}
	            </Text>
	            <Pressable
	              accessibilityRole="button"
	              accessibilityLabel={t('system.tryAgain')}
	              android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
	              style={[styles.button, { backgroundColor: theme.accent }]}
	              onPress={this.handleRetry}
	            >
	              <AppIcon name="refresh" size={20} color="#FFFFFF" />
	              <Text style={styles.buttonText}>{t('system.tryAgain')}</Text>
	            </Pressable>
	          </View>
	        </View>
	      );
	    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.relaxed,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 0,
    gap: 8,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
});
