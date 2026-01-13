/**
 * Quality Section - Poor image quality
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import PropTypes from 'prop-types';
import * as Haptics from 'expo-haptics';
import { SPACING } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { diagnosisStyles as styles } from './styles';

export default function QualitySection({ theme, message, onRetry }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppIcon name="alert-triangle" size={18} color={theme.warning} />
        <Text style={[styles.headerText, { color: theme.warning }]}>{t('diagnosis.poorQualityTitle')}</Text>
      </View>
      <Text style={[styles.text, { color: theme.textSecondary, marginTop: SPACING.sm }]}>
        {message || t('diagnosis.poorQualityMessage')}
      </Text>

      <Text style={[styles.text, { color: theme.textMuted, marginTop: SPACING.md }]}>
        {t('diagnosis.tipsForBetterPhoto')}
      </Text>
      <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.tipHoldSteady')}</Text>
      <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.tipCloser')}</Text>
      <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.tipDaylight')}</Text>

      {onRetry && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRetry(); }}
          style={[styles.retryButton, { borderColor: theme.accent }]}
        >
          <AppIcon name="camera" size={16} color={theme.accent} />
          <Text style={[styles.retryText, { color: theme.accent }]}>{t('diagnosis.takeBetterPhoto')}</Text>
        </Pressable>
      )}
    </View>
  );
}

QualitySection.propTypes = {
  theme: PropTypes.object.isRequired,
  message: PropTypes.string,
  onRetry: PropTypes.func,
};
