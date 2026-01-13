/**
 * Plant Diagnosis Display - No card styling, matches normal text flow
 * Uses same font sizes as markdown content (TYPOGRAPHY.sizes.base = 16)
 * Supports both AgriVision and Plantix response formats
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { normalizeDiagnosis } from '../../utils/diagnosisNormalizer';
import ErrorSection from './ErrorSection';
import RejectionSection from './RejectionSection';
import QualitySection from './QualitySection';
import { diagnosisStyles as styles } from './styles';

export default function DiagnosisCard({ diagnosis, onRetry }) {
  const { theme } = useApp();

  // normalizeDiagnosis handles both string and object input
  const data = useMemo(() => normalizeDiagnosis(diagnosis), [diagnosis]);

  if (!data || typeof data !== 'object') return null;

  // State detection
  const isNetworkError = data.isNetworkError;
  const isTimeout = data.isTimeout;
  const status = (data.health_status?.overall || data.health_status || '').toLowerCase();
  const imageQuality = data.image_quality || '';
  const notes = data.diagnostic_notes || data.health_summary || '';
  const notesLower = notes.toLowerCase();

  // Detect rejection type from diagnostic notes
  const isScreenshot = notesLower.includes('screenshot') || notesLower.includes('screen capture');
  const isTextImage = notesLower.includes('text') || notesLower.includes('document');
  const isGuardrailRejection = notesLower.includes('guardrail') || notesLower.includes('blocked') || notesLower.includes('inappropriate');
  const isNotPlant = status.includes('n/a') ||
                     status.includes('rejected') ||
                     status.includes('not a plant') ||
                     notesLower.includes('not a plant') ||
                     notesLower.includes('not agricultural') ||
                     notesLower.includes('rejected');

  const isPoorQuality = imageQuality.includes('poor') ||
                        imageQuality.includes('unusable') ||
                        imageQuality.includes('bad') ||
                        imageQuality.includes('low');

  // Error states
  if (isNetworkError || isTimeout) {
    return <ErrorSection theme={theme} isTimeout={isTimeout} message={notes} onRetry={onRetry} />;
  }

  // Rejection states
  if (isNotPlant || isScreenshot || isTextImage || isGuardrailRejection) {
    return (
      <RejectionSection
        theme={theme}
        isScreenshot={isScreenshot}
        isTextImage={isTextImage}
        isGuardrailRejection={isGuardrailRejection}
        message={notes}
        onRetry={onRetry}
      />
    );
  }

  if (isPoorQuality) {
    return <QualitySection theme={theme} message={notes} onRetry={onRetry} />;
  }

  // Success state - Healthy or Diseased
  const displayStatus = data.health_status?.overall || data.health_status || t('diagnosis.analyzed');
  const isHealthy = displayStatus.toLowerCase().includes('healthy');
  const cropName = data.crop?.name || data.crop || t('diagnosis.plant');
  const scientificName = data.crop?.scientific_name || null;
  const growthStage = data.growth_stage || null;
  const confidence = data.crop?.confidence || data.health_confidence || null;

  return (
    <View style={styles.container}>
      {/* Metadata rows - simple two-column layout */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('diagnosis.crop')}</Text>
        <Text style={[styles.value, { color: theme.text }]}>
          {cropName}{scientificName ? ` (${scientificName})` : ''}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('diagnosis.status')}</Text>
        <View style={styles.statusRow}>
          <AppIcon
            name={isHealthy ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={isHealthy ? theme.success : theme.warning}
          />
          <Text style={[styles.value, { color: isHealthy ? theme.success : theme.warning }]}>
            {displayStatus}
          </Text>
        </View>
      </View>

      {growthStage && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('diagnosis.stage')}</Text>
          <Text style={[styles.value, { color: theme.text }]}>{growthStage}</Text>
        </View>
      )}

      {confidence && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('diagnosis.confidence')}</Text>
          <Text style={[styles.value, { color: theme.text }]}>{confidence}</Text>
        </View>
      )}

      {data.image_quality && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('diagnosis.quality')}</Text>
          <Text style={[styles.value, { color: theme.text, textTransform: 'capitalize' }]}>{data.image_quality}</Text>
        </View>
      )}

      {/* Healthy plant message */}
      {isHealthy && (!data.issues || data.issues.length === 0) && (
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <AppIcon name="checkmark-circle" size={18} color={theme.success} />
            <Text style={[styles.headerText, { color: theme.success }]}>{t('diagnosis.healthyTitle')}</Text>
          </View>
          <Text style={[styles.text, { color: theme.textSecondary, marginTop: SPACING.xs }]}>
            {t('diagnosis.healthyMessage')}
          </Text>
          <Text style={[styles.text, { color: theme.textMuted, marginTop: SPACING.md }]}>
            {t('diagnosis.healthyTips')}
          </Text>
          <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.healthyTipMonitor')}</Text>
          <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.healthyTipWater')}</Text>
          <Text style={[styles.text, { color: theme.text }]}>• {t('diagnosis.healthyTipNutrition')}</Text>
        </View>
      )}

      {/* Issues section */}
      {data.issues?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('diagnosis.issueDetected')}</Text>
          {data.issues.map((issue, i) => (
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
      )}

      {/* Treatment Recommendations */}
      {data.treatment_recommendations?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('diagnosis.treatment')}</Text>
          {data.treatment_recommendations.map((treatment, i) => (
            <View key={i} style={styles.treatmentBlock}>
              {treatment.issue_name && data.treatment_recommendations.length > 1 && (
                <Text style={[styles.text, { color: theme.text, fontWeight: TYPOGRAPHY.weights.semibold, marginBottom: SPACING.xs }]}>
                  {treatment.issue_name}:
                </Text>
              )}
              {treatment.organic_options?.length > 0 && (
                <View style={styles.treatmentRow}>
                  <AppIcon name="leaf" size={16} color={theme.success} />
                  <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                    <Text style={{ color: theme.success, fontWeight: TYPOGRAPHY.weights.semibold }}>{t('diagnosis.organic')}: </Text>
                    {treatment.organic_options.map(o => o.name || o).join(', ')}
                  </Text>
                </View>
              )}
              {treatment.chemical_options?.length > 0 && (
                <View style={styles.treatmentRow}>
                  <AppIcon name="flask" size={16} color={theme.accent} />
                  <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                    <Text style={{ color: theme.accent, fontWeight: TYPOGRAPHY.weights.semibold }}>{t('diagnosis.chemical')}: </Text>
                    {treatment.chemical_options.map(o => o.active_ingredient || o.name || o).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Diagnostic notes */}
      {notes && !isHealthy && (!data.issues || data.issues.length === 0) && (
        <Text style={[styles.text, { color: theme.textSecondary, fontStyle: 'italic', marginTop: SPACING.sm }]}>
          {notes}
        </Text>
      )}
    </View>
  );
}

DiagnosisCard.propTypes = {
  diagnosis: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  onRetry: PropTypes.func,
};
