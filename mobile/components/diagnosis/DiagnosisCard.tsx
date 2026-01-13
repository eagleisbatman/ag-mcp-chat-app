/**
 * Plant Diagnosis Display - No card styling, matches normal text flow
 * Uses same font sizes as markdown content (TYPOGRAPHY.sizes.base = 16)
 * Supports both AgriVision and Plantix response formats
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { Theme } from '../../types';
import { SPACING } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import { normalizeDiagnosis, DiagnosisData as NormalizedDiagnosisData } from '../../utils/diagnosisNormalizer';
import ErrorSection from './ErrorSection';
import RejectionSection from './RejectionSection';
import QualitySection from './QualitySection';
import HealthySection from './HealthySection';
import IssuesSection from './IssuesSection';
import TreatmentSection from './TreatmentSection';
import { diagnosisStyles as styles } from './styles';

interface DiagnosisCardProps {
  diagnosis?: NormalizedDiagnosisData | string | null;
  onRetry?: () => void;
}

export default function DiagnosisCard({ diagnosis, onRetry }: DiagnosisCardProps): JSX.Element | null {
  const { theme } = useApp();

  // normalizeDiagnosis handles both string and object input
  const data = useMemo(() => normalizeDiagnosis(diagnosis), [diagnosis]);

  if (!data || typeof data !== 'object') return null;

  // State detection
  const isNetworkError = data.isNetworkError;
  const isTimeout = data.isTimeout;
  const healthStatus = data.health_status;
  const status = (typeof healthStatus === 'object' && healthStatus?.overall 
    ? healthStatus.overall 
    : (typeof healthStatus === 'string' ? healthStatus : '')
  ).toLowerCase();
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
  const displayStatus = (typeof healthStatus === 'object' && healthStatus?.overall 
    ? healthStatus.overall 
    : (typeof healthStatus === 'string' ? healthStatus : t('diagnosis.analyzed'))
  );
  const isHealthy = displayStatus.toLowerCase().includes('healthy');
  const cropData = data.crop;
  const cropName = (typeof cropData === 'object' && cropData?.name) 
    ? cropData.name 
    : (typeof cropData === 'string' ? cropData : t('diagnosis.plant'));
  const scientificName = (typeof cropData === 'object' && cropData?.scientific_name) 
    ? cropData.scientific_name 
    : null;
  const growthStage = data.growth_stage || null;
  const confidence = (typeof cropData === 'object' && cropData?.confidence) 
    ? cropData.confidence 
    : data.health_confidence || null;

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
        <HealthySection theme={theme} />
      )}

      {/* Issues section */}
      {data.issues && data.issues.length > 0 && (
        <IssuesSection theme={theme} issues={data.issues} />
      )}

      {/* Treatment Recommendations */}
      {data.treatment_recommendations && data.treatment_recommendations.length > 0 && (
        <TreatmentSection theme={theme} treatments={data.treatment_recommendations} />
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
