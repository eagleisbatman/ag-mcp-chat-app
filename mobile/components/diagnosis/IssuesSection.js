/**
 * Issues/diseases display section
 * Shows detected plant issues with severity and symptoms
 */
import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { t } from '../../constants/strings';
import { styles } from './styles';
import { TYPOGRAPHY } from '../../constants/themes';

export default function IssuesSection({ theme, issues }) {
  if (!issues || issues.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t('diagnosis.issueDetected')}
      </Text>
      
      {issues.map((issue, i) => (
        <View key={i} style={styles.issueItem}>
          <Text style={[styles.text, { color: theme.text, fontWeight: TYPOGRAPHY.weights.semibold }]}>
            {issue.name || issue}
            {issue.scientific_name ? ` (${issue.scientific_name})` : ''}
          </Text>
          
          {issue.severity && (
            <Text style={[styles.text, { color: theme.error }]}>
              {t('diagnosis.severity')}: {issue.severity}
            </Text>
          )}
          
          {issue.symptoms?.length > 0 && (
            <Text style={[styles.text, { color: theme.textSecondary }]}>
              {t('diagnosis.symptoms')}: {issue.symptoms.join(', ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

IssuesSection.propTypes = {
  theme: PropTypes.object.isRequired,
  issues: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        name: PropTypes.string,
        scientific_name: PropTypes.string,
        severity: PropTypes.string,
        symptoms: PropTypes.arrayOf(PropTypes.string),
      }),
    ])
  ),
};
