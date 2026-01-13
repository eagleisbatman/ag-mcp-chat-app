/**
 * Issues/diseases display section
 * Shows detected plant issues with severity and symptoms
 */
import React from 'react';
import { View, Text } from 'react-native';
import { t } from '../../constants/strings';
import { styles } from './styles';
import { TYPOGRAPHY } from '../../constants/themes';
import { Theme } from '../../types';

interface Issue {
  name?: string;
  scientific_name?: string;
  severity?: string;
  symptoms?: string[];
}

interface IssuesSectionProps {
  theme: Theme;
  issues?: (Issue | string)[];
}

export default function IssuesSection({ theme, issues }: IssuesSectionProps): JSX.Element | null {
  if (!issues || issues.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t('diagnosis.issueDetected')}
      </Text>
      
      {issues.map((issue, i) => {
        const isString = typeof issue === 'string';
        const issueName = isString ? issue : issue.name || '';
        const scientificName = !isString && issue.scientific_name;
        const severity = !isString && issue.severity;
        const symptoms = !isString && issue.symptoms;
        
        return (
          <View key={i} style={styles.issueItem}>
            <Text style={[styles.text, { color: theme.text, fontWeight: TYPOGRAPHY.weights.semibold }]}>
              {issueName}
              {scientificName ? ` (${scientificName})` : ''}
            </Text>
            
            {severity && (
              <Text style={[styles.text, { color: theme.error }]}>
                {t('diagnosis.severity')}: {severity}
              </Text>
            )}
            
            {symptoms && symptoms.length > 0 && (
              <Text style={[styles.text, { color: theme.textSecondary }]}>
                {t('diagnosis.symptoms')}: {symptoms.join(', ')}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
