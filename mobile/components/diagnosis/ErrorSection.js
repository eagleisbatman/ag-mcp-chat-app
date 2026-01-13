/**
 * Error Section - Network/Timeout errors in diagnosis
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import PropTypes from 'prop-types';
import * as Haptics from 'expo-haptics';
import { SPACING } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { diagnosisStyles as styles } from './styles';

export default function ErrorSection({ theme, isTimeout, message, onRetry }) {
  const title = isTimeout ? t('diagnosis.timeoutTitle') : t('diagnosis.networkErrorTitle');
  const subtitle = isTimeout ? t('diagnosis.timeoutMessage') : t('diagnosis.networkErrorMessage');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppIcon name={isTimeout ? 'clock' : 'wifi-off'} size={18} color={theme.error} />
        <Text style={[styles.headerText, { color: theme.error }]}>{title}</Text>
      </View>
      <Text style={[styles.text, { color: theme.textSecondary, marginTop: SPACING.xs }]}>
        {subtitle}
      </Text>
      {message && (
        <Text style={[styles.text, { color: theme.textMuted, fontStyle: 'italic', marginTop: SPACING.xs }]}>
          {message}
        </Text>
      )}
      {onRetry && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRetry(); }}
          style={[styles.retryButton, { borderColor: theme.error }]}
        >
          <AppIcon name="refresh" size={16} color={theme.error} />
          <Text style={[styles.retryText, { color: theme.error }]}>{t('diagnosis.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

ErrorSection.propTypes = {
  theme: PropTypes.object.isRequired,
  isTimeout: PropTypes.bool,
  message: PropTypes.string,
  onRetry: PropTypes.func,
};
