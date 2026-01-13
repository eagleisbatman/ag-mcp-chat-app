/**
 * Treatment recommendations display section
 * Shows organic and chemical treatment options
 */
import React from 'react';
import { View, Text } from 'react-native';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { styles } from './styles';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { Theme } from '../../types';

interface TreatmentOption {
  name?: string;
  active_ingredient?: string;
}

interface Treatment {
  issue_name?: string;
  organic_options?: (TreatmentOption | string)[];
  chemical_options?: (TreatmentOption | string)[];
}

interface TreatmentSectionProps {
  theme: Theme;
  treatments?: Treatment[];
}

export default function TreatmentSection({ theme, treatments }: TreatmentSectionProps): JSX.Element | null {
  if (!treatments || treatments.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t('diagnosis.treatment')}
      </Text>
      
      {treatments.map((treatment, i) => (
        <View key={i} style={styles.treatmentBlock}>
          {/* Show which issue this treatment is for (if multiple) */}
          {treatment.issue_name && treatments.length > 1 && (
            <Text 
              style={[
                styles.text, 
                { 
                  color: theme.text, 
                  fontWeight: TYPOGRAPHY.weights.semibold, 
                  marginBottom: SPACING.xs 
                }
              ]}
            >
              {treatment.issue_name}:
            </Text>
          )}
          
          {/* Organic options */}
          {treatment.organic_options && treatment.organic_options.length > 0 && (
            <View style={styles.treatmentRow}>
              <AppIcon name="leaf" size={16} color={theme.success} />
              <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                <Text style={{ color: theme.success, fontWeight: TYPOGRAPHY.weights.semibold }}>
                  {t('diagnosis.organic')}:{' '}
                </Text>
                {treatment.organic_options.map(o => typeof o === 'string' ? o : o.name || '').filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          
          {/* Chemical options */}
          {treatment.chemical_options && treatment.chemical_options.length > 0 && (
            <View style={styles.treatmentRow}>
              <AppIcon name="flask" size={16} color={theme.accent} />
              <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                <Text style={{ color: theme.accent, fontWeight: TYPOGRAPHY.weights.semibold }}>
                  {t('diagnosis.chemical')}:{' '}
                </Text>
                {treatment.chemical_options.map(o => typeof o === 'string' ? o : (o.active_ingredient || o.name || '')).filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
