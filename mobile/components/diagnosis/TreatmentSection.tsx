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

interface OrganicOption {
  name?: string;
  description?: string;
  application?: string;
  frequency?: string;
  timing?: string;
}

interface ChemicalOption {
  name?: string;
  active_ingredient?: string;
  description?: string;
  dosage?: string;
  safety_notes?: string;
}

interface Treatment {
  issue_name?: string;
  organic_options?: (OrganicOption | string)[];
  chemical_options?: (ChemicalOption | string)[];
  preventive_measures?: string[];
}

interface TreatmentSectionProps {
  theme: Theme;
  treatments?: Treatment[];
}

/**
 * Format organic option with all details
 */
function formatOrganicOption(opt: OrganicOption | string): string {
  if (typeof opt === 'string') return opt;
  const parts: string[] = [];
  if (opt.name) parts.push(opt.name);
  if (opt.application) parts.push(`Apply: ${opt.application}`);
  if (opt.frequency) parts.push(`Frequency: ${opt.frequency}`);
  if (opt.timing) parts.push(`Timing: ${opt.timing}`);
  return parts.join('. ') || '';
}

/**
 * Format chemical option with all details
 */
function formatChemicalOption(opt: ChemicalOption | string): string {
  if (typeof opt === 'string') return opt;
  const parts: string[] = [];
  if (opt.active_ingredient || opt.name) parts.push(opt.active_ingredient || opt.name || '');
  if (opt.dosage) parts.push(`Dosage: ${opt.dosage}`);
  if (opt.safety_notes) parts.push(`Safety: ${opt.safety_notes}`);
  return parts.join('. ') || '';
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
          {/* Show which issue this treatment is for */}
          {treatment.issue_name && (
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

          {/* Organic options - show each with full details */}
          {treatment.organic_options && treatment.organic_options.length > 0 && (
            <View style={{ marginBottom: SPACING.xs }}>
              <View style={styles.treatmentRow}>
                <AppIcon name="leaf" size={16} color={theme.success} />
                <Text style={[styles.text, { color: theme.success, fontWeight: TYPOGRAPHY.weights.semibold }]}>
                  {t('diagnosis.organic')}:
                </Text>
              </View>
              {treatment.organic_options.map((opt, idx) => (
                <Text key={idx} style={[styles.text, { color: theme.text, marginLeft: 24, marginTop: 2 }]}>
                  • {formatOrganicOption(opt)}
                </Text>
              ))}
            </View>
          )}

          {/* Chemical options - show each with full details */}
          {treatment.chemical_options && treatment.chemical_options.length > 0 && (
            <View style={{ marginBottom: SPACING.xs }}>
              <View style={styles.treatmentRow}>
                <AppIcon name="flask" size={16} color={theme.accent} />
                <Text style={[styles.text, { color: theme.accent, fontWeight: TYPOGRAPHY.weights.semibold }]}>
                  {t('diagnosis.chemical')}:
                </Text>
              </View>
              {treatment.chemical_options.map((opt, idx) => (
                <Text key={idx} style={[styles.text, { color: theme.text, marginLeft: 24, marginTop: 2 }]}>
                  • {formatChemicalOption(opt)}
                </Text>
              ))}
            </View>
          )}

          {/* Preventive measures */}
          {treatment.preventive_measures && treatment.preventive_measures.length > 0 && (
            <View style={{ marginBottom: SPACING.xs }}>
              <View style={styles.treatmentRow}>
                <AppIcon name="shield" size={16} color={theme.textMuted} />
                <Text style={[styles.text, { color: theme.textMuted, fontWeight: TYPOGRAPHY.weights.semibold }]}>
                  {t('diagnosis.prevention')}:
                </Text>
              </View>
              {treatment.preventive_measures.map((measure, idx) => (
                <Text key={idx} style={[styles.text, { color: theme.text, marginLeft: 24, marginTop: 2 }]}>
                  • {measure}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
