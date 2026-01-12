import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { t } from '../constants/strings';

/**
 * Helper to normalize image quality from different provider formats
 * AgriVision returns string: "good"
 * Plantix returns object: {focus: "good", distance: "good"}
 */
function normalizeImageQuality(imgQuality) {
  if (!imgQuality) return '';
  if (typeof imgQuality === 'string') return imgQuality.toLowerCase();
  if (typeof imgQuality === 'object') {
    // Plantix format: {focus, distance, quality_warning}
    const parts = [];
    if (imgQuality.focus) parts.push(`focus: ${imgQuality.focus}`);
    if (imgQuality.distance) parts.push(`distance: ${imgQuality.distance}`);
    if (imgQuality.quality_warning) parts.push(imgQuality.quality_warning);
    return parts.length > 0 ? parts.join(', ').toLowerCase() : 'analyzed';
  }
  return '';
}

/**
 * Normalize diagnosis data from different providers (AgriVision vs Plantix)
 */
function normalizeDiagnosis(data) {
  if (!data) return null;

  // Detect provider format
  const isPlantix = !!(data.health_assessment || data.diagnoses);

  if (isPlantix) {
    // Convert Plantix format to unified format
    const diagnoses = data.diagnoses || [];
    const firstDiag = diagnoses[0] || {};

    return {
      _provider: 'plantix',
      health_status: data.health_assessment?.status || 'Analyzed',
      health_summary: data.health_assessment?.summary || '',
      image_quality: normalizeImageQuality(data.image_quality),
      diagnostic_notes: data.health_assessment?.summary || '',
      crop: data.identified_crops?.[0]?.name ? {
        name: data.identified_crops[0].name,
        confidence: data.identified_crops[0].confidence_percent ? `${data.identified_crops[0].confidence_percent}%` : null
      } : null,
      // Convert Plantix diagnoses to unified issues format
      issues: diagnoses.map(d => ({
        name: d.disease_name || d.name,
        scientific_name: d.scientific_name,
        severity: d.likelihood || d.severity,
        symptoms: d.symptoms || [],
        _treatments: d.treatments || [], // Keep for later
        _prevention: d.prevention || []
      })),
      // Flatten treatments from all diagnoses
      treatment_recommendations: diagnoses.length > 0 ? diagnoses.map(d => ({
        issue_name: d.disease_name || d.name,
        organic_options: (d.treatments || [])
          .filter(t => t.type === 'organic')
          .map(t => ({ name: t.description?.substring(0, 100) || 'See details', description: t.description })),
        chemical_options: (d.treatments || [])
          .filter(t => t.type === 'chemical')
          .map(t => ({ name: t.description?.substring(0, 100) || 'See details', description: t.description })),
        preventive_measures: (d.prevention || []).map(p => p.action || p)
      })) : [],
      // Pass through original data for anything we missed
      _raw: data
    };
  }

  // AgriVision format - already in expected format, just normalize image_quality
  return {
    ...data,
    _provider: 'agrivision',
    image_quality: normalizeImageQuality(data.image_quality)
  };
}

/**
 * Plant Diagnosis Display - No card styling, matches normal text flow
 * Uses same font sizes as markdown content (TYPOGRAPHY.sizes.base = 16)
 * Supports both AgriVision and Plantix response formats
 */
export default function DiagnosisCard({ diagnosis, onRetry }) {
  const { theme } = useApp();

  const data = useMemo(() => {
    let parsed = diagnosis;
    if (typeof diagnosis === 'string') {
      try { parsed = JSON.parse(diagnosis); } catch (e) { return null; }
    }
    return normalizeDiagnosis(parsed);
  }, [diagnosis]);

  if (!data || typeof data !== 'object') return null;

  // State detection
  const isNetworkError = data.isNetworkError;
  const isTimeout = data.isTimeout;
  const status = (data.health_status?.overall || data.health_status || '').toLowerCase();
  const imageQuality = data.image_quality || ''; // Already normalized
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

      {/* Healthy plant message - show when healthy with no issues */}
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
            <View key={i}>
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
      {notes && !isHealthy && (
        <Text style={[styles.text, { color: theme.textSecondary, fontStyle: 'italic', marginTop: SPACING.sm }]}>
          {notes}
        </Text>
      )}
    </View>
  );
}

/**
 * Error Section - Network/Timeout
 */
function ErrorSection({ theme, isTimeout, message, onRetry }) {
  const title = isTimeout ? t('diagnosis.timeoutTitle') : t('diagnosis.networkErrorTitle');
  const subtitle = isTimeout ? t('diagnosis.timeoutMessage') : t('diagnosis.networkErrorMessage');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppIcon name={isTimeout ? 'clock' : 'wifi-off'} size={18} color={theme.error} />
        <Text style={[styles.headerText, { color: theme.error }]}>{title}</Text>
      </View>
      <Text style={[styles.text, { color: theme.textSecondary, marginTop: SPACING.xs }]}>
        {subtitle}
      </Text>
      {message && (
        <Text style={[styles.text, { color: theme.textMuted, fontStyle: 'italic', marginTop: SPACING.xs }]}>
          {message}
        </Text>
      )}
      {onRetry && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRetry(); }}
          style={[styles.retryButton, { borderColor: theme.error }]}
        >
          <AppIcon name="refresh" size={16} color={theme.error} />
          <Text style={[styles.retryText, { color: theme.error }]}>{t('diagnosis.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Rejection Section - Not a plant, screenshot, text, guardrails
 */
function RejectionSection({ theme, isScreenshot, isTextImage, isGuardrailRejection, message, onRetry }) {
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

/**
 * Quality Section - Poor image quality
 */
function QualitySection({ theme, message, onRetry }) {
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

const styles = StyleSheet.create({
  // No card styling - transparent, flows naturally
  container: {
    marginTop: SPACING.xs,
  },

  // Two-column metadata row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  label: {
    width: 90,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  value: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Section styling
  section: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.xs,
  },

  // Issue items
  issueItem: {
    marginBottom: SPACING.xs,
  },

  // Treatment rows
  treatmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Common text - matches markdown body
  text: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },

  // Header row for errors/rejections
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
  },

  // Retry button - simple outlined style
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
