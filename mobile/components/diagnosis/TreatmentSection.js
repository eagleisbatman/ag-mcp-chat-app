/**
 * Treatment recommendations display section
 * Shows organic and chemical treatment options
 */
import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { styles } from './styles';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function TreatmentSection({ theme, treatments }) {
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
          {treatment.organic_options?.length > 0 && (
            <View style={styles.treatmentRow}>
              <AppIcon name="leaf" size={16} color={theme.success} />
              <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                <Text style={{ color: theme.success, fontWeight: TYPOGRAPHY.weights.semibold }}>
                  {t('diagnosis.organic')}:{' '}
                </Text>
                {treatment.organic_options.map(o => o.name || o).join(', ')}
              </Text>
            </View>
          )}
          
          {/* Chemical options */}
          {treatment.chemical_options?.length > 0 && (
            <View style={styles.treatmentRow}>
              <AppIcon name="flask" size={16} color={theme.accent} />
              <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                <Text style={{ color: theme.accent, fontWeight: TYPOGRAPHY.weights.semibold }}>
                  {t('diagnosis.chemical')}:{' '}
                </Text>
                {treatment.chemical_options.map(o => o.active_ingredient || o.name || o).join(', ')}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

TreatmentSection.propTypes = {
  theme: PropTypes.object.isRequired,
  treatments: PropTypes.arrayOf(
    PropTypes.shape({
      issue_name: PropTypes.string,
      organic_options: PropTypes.arrayOf(
        PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.shape({ name: PropTypes.string }),
        ])
      ),
      chemical_options: PropTypes.arrayOf(
        PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.shape({
            name: PropTypes.string,
            active_ingredient: PropTypes.string,
          }),
        ])
      ),
    })
  ),
};
