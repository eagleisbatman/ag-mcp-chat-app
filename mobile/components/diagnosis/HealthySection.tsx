/**
 * Healthy plant display section
 * Shows when plant is diagnosed as healthy
 */
import React from 'react';
import { View, Text } from 'react-native';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { styles } from './styles';
import { SPACING } from '../../constants/themes';
import { Theme } from '../../types';

interface HealthySectionProps {
  theme: Theme;
}

export default function HealthySection({ theme }: HealthySectionProps): JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <AppIcon name="checkmark-circle" size={18} color={theme.success} />
        <Text style={[styles.headerText, { color: theme.success }]}>
          {t('diagnosis.healthyTitle')}
        </Text>
      </View>
      
      <Text style={[styles.text, { color: theme.textSecondary, marginTop: SPACING.xs }]}>
        {t('diagnosis.healthyMessage')}
      </Text>
      
      <Text style={[styles.text, { color: theme.textMuted, marginTop: SPACING.md }]}>
        {t('diagnosis.healthyTips')}
      </Text>
      
      <Text style={[styles.text, { color: theme.text }]}>
        • {t('diagnosis.healthyTipMonitor')}
      </Text>
      <Text style={[styles.text, { color: theme.text }]}>
        • {t('diagnosis.healthyTipWater')}
      </Text>
      <Text style={[styles.text, { color: theme.text }]}>
        • {t('diagnosis.healthyTipNutrition')}
      </Text>
    </View>
  );
}
