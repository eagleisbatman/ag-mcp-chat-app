/**
 * Rejection Section - Not a plant, screenshot, text, guardrails
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import PropTypes from 'prop-types';
import * as Haptics from 'expo-haptics';
import { SPACING } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { diagnosisStyles as styles } from './styles';

export default function RejectionSection({ theme, isScreenshot, isTextImage, isGuardrailRejection, message, onRetry }) {
  // Determine specific rejection reason
  let title = t('diagnosis.notPlantTitle');
  let reason = '';

  if (isScreenshot) {
    title = t('diagnosis.screenshotTitle');
    reason = t('diagnosis.screenshotMessage');
  } else if (isTextImage) {
    title = t('diagnosis.textImageTitle');
    reason = t('diagnosis.textImageMessage');
  } else if (isGuardrailRejection) {
    title = t('diagnosis.guardrailTitle');
    reason = t('diagnosis.guardrailMessage');
  } else if (message) {
    reason = message;
  } else {
    reason = t('diagnosis.notPlantMessage');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppIcon name="alert-triangle" size={18} color={theme.warning} />
        <Text style={[styles.headerText, { color: theme.warning }]}>{title}</Text>
      </View>
      <Text style={[styles.text, { color: theme.textSecondary, marginTop: SPACING.sm }]}>
        {reason}
      </Text>

      <Text style={[styles.text, { color: theme.textMuted, marginTop: SPACING.md }]}>
        {t('diagnosis.tipsForBetterResults')}
      </Text>
      <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.tipCloseUp')}</Text>
      <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.tipFocusArea')}</Text>
      <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.tipGoodLighting')}</Text>

      {onRetry && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRetry(); }}
          style={[styles.retryButton, { borderColor: theme.accent }]}
        >
          <AppIcon name="camera" size={16} color={theme.accent} />
          <Text style={[styles.retryText, { color: theme.accent }]}>{t('diagnosis.tryAgain')}</Text>
        </Pressable>
      )}
    </View>
  );
}

RejectionSection.propTypes = {
  theme: PropTypes.object.isRequired,
  isScreenshot: PropTypes.bool,
  isTextImage: PropTypes.bool,
  isGuardrailRejection: PropTypes.bool,
  message: PropTypes.string,
  onRetry: PropTypes.func,
};
