import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { t } from '../constants/strings';

/**
 * High-fidelity Diagnosis Card based on wireframe Screens 7-15
 * Renders structured agricultural analysis with professional technical layout
 * @param {object} diagnosis - Structured diagnosis data
 * @param {string} title - Optional title (e.g., "Diagnosis #1")
 * @param {string} questionAnswer - Optional answer to a specific user question
 */
export default function DiagnosisCard({ diagnosis, title, questionAnswer, onReadAloud, isSpeaking }) {
  const { theme, isDark } = useApp();

  // Parse diagnosis if it's a string
  const data = useMemo(() => {
    if (typeof diagnosis === 'string') {
      try {
        return JSON.parse(diagnosis);
      } catch (e) {
        return null;
      }
    }
    return diagnosis;
  }, [diagnosis]);

  if (!data || typeof data !== 'object') return null;

  // 1. Detection & Rejection Logic
  const statusRaw = (data.health_status?.overall || data.health_status || '').toLowerCase();
  
  // Specific Error Types
  const isNetworkError = data.isNetworkError || false;
  const isTimeout = data.isTimeout || false;
  const isRejected = statusRaw.includes('n/a') || 
                    statusRaw.includes('rejected') || 
                    (data.diagnostic_notes && data.diagnostic_notes.toLowerCase().includes('rejected'));
  
  const isPoorQuality = data.image_quality?.toLowerCase() === 'poor' || 
                       data.image_quality?.toLowerCase() === 'unusable';

  // 2. Extract Data Fields
  const cropName = data.crop?.name || data.crop;
  const scientificName = data.crop?.scientific_name;
  const displayStatus = data.health_status?.overall || data.health_status || (isRejected ? 'Rejected' : 'Healthy');
  const growthStage = data.growth_stage || data.stage;
  const confidence = data.health_confidence || data.crop?.confidence;
  const issues = data.issues || [];
  const symptoms = (issues[0]?.symptoms || []).join(', ');
  const treatments = data.treatment_recommendations || [];
  const notes = data.diagnostic_notes || data.general_recommendations;
  const quality = data.image_quality;

  // 3. Status Badge Helper
  const getStatusStyle = () => {
    if (isNetworkError || isTimeout) return { bg: '#F2F2F7', text: '#666', icon: 'cloud-off-outline', label: isTimeout ? 'TIMEOUT' : 'OFFLINE' };
    if (isRejected) return { bg: '#FFE6E6', text: '#C00', icon: 'x-circle', label: t('chat.statusRejected') || 'REJECTED' };
    if (displayStatus.toLowerCase().includes('healthy')) return { bg: '#E6F4E6', text: '#080', icon: 'check-circle', label: t('chat.statusHealthy') || 'HEALTHY' };
    return { bg: '#FFF4E6', text: '#B86800', icon: 'alert-triangle', label: t('chat.statusDiseased') || 'DISEASED' };
  };

  const statusStyle = getStatusStyle();

  // 4. Dynamic Tips Helper (Screens 9 & 10)
  const getTips = () => {
    if (isPoorQuality) return [
      t('chat.tipSteady') || 'Hold camera steady (brace against body)',
      t('chat.tipCloser') || 'Move closer to the plant (6-12 inches)',
      t('chat.tipLight') || 'Use natural daylight, avoid shadows',
      t('chat.tipFocus') || 'Tap screen to focus before capturing'
    ];
    if (isNetworkError || isTimeout) return [
      t('chat.tipSignal') || 'Move to an area with better signal',
      t('chat.tipWifi') || 'Check if Wi-Fi or Data is enabled',
      t('chat.tipWait') || 'Wait a moment and try again'
    ];
    return [
      t('chat.tipCloseup') || 'Take a close-up of the plant',
      t('chat.tipFocusIssue') || 'Focus on the affected leaves or stems',
      t('chat.tipVisibility') || 'Ensure the plant is clearly visible',
      t('chat.tipLighting') || 'Use good natural lighting'
    ];
  };

  // ═══════════════════════════════════════
  // RENDER: Error/Rejection Card (Screen 9, 10, 11, 12)
  // ═══════════════════════════════════════
  if (isRejected || isPoorQuality || isNetworkError || isTimeout) {
    const errorIcon = isNetworkError ? 'cloud-off-outline' : (isTimeout ? 'clock' : (isPoorQuality ? 'alert-circle' : 'x-circle'));
    const errorTitle = isNetworkError ? (t('chat.connectionError') || 'Connection Error') : 
                       (isTimeout ? (t('chat.timeoutError') || 'Analysis Timed Out') : 
                       (isPoorQuality ? (t('chat.qualityTooLow') || 'Image Quality Too Low') : 
                       (t('chat.imageNotSuitable') || 'Image Not Suitable')));
    const errorColor = (isNetworkError || isTimeout) ? theme.textMuted : (isPoorQuality ? '#B86800' : '#C00');

    return (
      <View style={[styles.errorCard, { borderColor: errorColor }]}>
        <View style={styles.errorHeader}>
          <AppIcon name={errorIcon} size={22} color={errorColor} />
          <Text style={[styles.errorTitle, { color: errorColor }]}>{errorTitle}</Text>
        </View>
        
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
          {notes || (isPoorQuality ? t('chat.poorQualityDesc') : (isNetworkError || isTimeout ? t('chat.networkErrorDesc') : t('chat.nonAgricultureDesc')))}
        </Text>

        <View style={[styles.tipsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}>
          <Text style={[styles.tipsTitle, { color: theme.text }]}>{t('chat.youCanTry') || 'You can try:'}</Text>
          {getTips().map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: theme.textMuted }]} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <Pressable 
          style={[styles.retryBtn, { backgroundColor: theme.text }]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <AppIcon name={isNetworkError || isTimeout ? 'refresh-cw' : 'camera'} size={16} color={theme.background} prefer="feather" />
          <Text style={[styles.retryBtnText, { color: theme.background }]}>
            {isNetworkError || isTimeout ? (t('chat.retry') || 'Retry Analysis') : (t('chat.tryAgain') || 'Try Again')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ═══════════════════════════════════════
  // RENDER: Technical Diagnosis Card (Screen 7, 8, 14, 15)
  // ═══════════════════════════════════════
  return (
    <View style={[styles.card, { borderColor: theme.text, backgroundColor: theme.card }]}>
      {/* Header (Screen 7/14) */}
      <View style={[styles.cardHeader, { backgroundColor: theme.text }]}>
        <AppIcon name="search" size={16} color={theme.background} prefer="feather" />
        <Text style={[styles.cardHeaderTitle, { color: theme.background }]}>
          {title || t('chat.plantDiagnosis') || 'PLANT DIAGNOSIS'}
        </Text>
      </View>

      <View style={styles.cardBody}>
        {/* Question Answer Callout (Screen 15) */}
        {questionAnswer && (
          <View style={[styles.callout, { borderLeftColor: theme.text, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}>
            <Text style={[styles.calloutLabel, { color: theme.textMuted }]}>{t('chat.answeringQuestion') || 'Answering your question:'}</Text>
            <Text style={[styles.calloutText, { color: theme.text }]}>{questionAnswer}</Text>
          </View>
        )}

        {/* Row: Crop */}
        {cropName && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelCrop') || 'CROP'}</Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.valueTitle, { color: theme.text }]}>{cropName}</Text>
              {scientificName && <Text style={[styles.valueSubtitle, { color: theme.textMuted }]}>{scientificName}</Text>}
            </View>
          </View>
        )}

        {/* Row: Status */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelStatus') || 'STATUS'}</Text>
          <View style={styles.valueContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.text }]}>
              <AppIcon name={statusStyle.icon} size={12} color={statusStyle.text} />
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>
        </View>

        {/* Row: Issue (if diseased) */}
        {issues.length > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelIssue') || 'ISSUE'}</Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.valueTitle, { color: theme.text }]}>{issues[0].name || issues[0]}</Text>
              {issues[0].severity && <Text style={[styles.valueSubtitle, { color: theme.textMuted }]}>{issues[0].severity}</Text>}
            </View>
          </View>
        )}

        {/* Row: Symptoms (Screen 8) */}
        {symptoms && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelSymptoms') || 'SYMPTOMS'}</Text>
            <Text style={[styles.valueText, { color: theme.textSecondary, fontSize: 12 }]}>{symptoms}</Text>
          </View>
        )}

        {/* Row: Stage & Confidence (Screen 7) */}
        {(growthStage || confidence) && (
          <View style={styles.row}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {growthStage && (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelStage') || 'STAGE'}</Text>
                  <Text style={[styles.valueText, { color: theme.text }]}>{growthStage}</Text>
                </View>
              )}
              {confidence && (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelConfidence') || 'CONFIDENCE'}</Text>
                  <Text style={[styles.valueText, { color: theme.text }]}>{confidence}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Treatment Section (Screen 8) */}
        {treatments.length > 0 && (
          <View style={[styles.section, { borderTopColor: theme.text }]}>
            <View style={styles.sectionTitleContainer}>
              <AppIcon name="pill" size={14} color={theme.text} prefer="mci" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('chat.treatmentRecs') || 'TREATMENT RECOMMENDATIONS'}</Text>
            </View>
            
            {treatments.map((treatment, idx) => (
              <View key={idx} style={styles.treatmentContainer}>
                {treatment.organic_options?.length > 0 && (
                  <View style={[styles.treatmentBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}>
                    <View style={styles.treatmentHeader}>
                      <AppIcon name="sprout" size={12} color={theme.textMuted} prefer="mci" />
                      <Text style={[styles.treatmentLabel, { color: theme.textMuted }]}>{t('chat.organicOption') || 'ORGANIC OPTION'}</Text>
                    </View>
                    <Text style={[styles.treatmentText, { color: theme.text }]}>{treatment.organic_options.map(o => o.name).join(', ')}</Text>
                  </View>
                )}
                {treatment.chemical_options?.length > 0 && (
                  <View style={[styles.treatmentBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}>
                    <View style={styles.treatmentHeader}>
                      <AppIcon name="flask" size={12} color={theme.textMuted} prefer="mci" />
                      <Text style={[styles.treatmentLabel, { color: theme.textMuted }]}>{t('chat.chemicalOption') || 'CHEMICAL OPTION'}</Text>
                    </View>
                    <Text style={[styles.treatmentText, { color: theme.text }]}>{treatment.chemical_options.map(o => o.active_ingredient).join(', ')}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes (for healthy plants or general advice) */}
        {notes && issues.length === 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('chat.labelNotes') || 'NOTES'}</Text>
            <Text style={[styles.valueText, { color: theme.textSecondary }]}>{notes}</Text>
          </View>
        )}
      </View>


      {/* Footer (Screen 7) */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.qualityContainer}>
          <AppIcon name="camera" size={12} color={theme.textMuted} prefer="feather" />
          <Text style={[styles.qualityText, { color: theme.textMuted }]}>
            {t('chat.quality') || 'Quality'}: {quality || 'Good'}
          </Text>
        </View>
        
        {onReadAloud && (
          <Pressable 
            style={[styles.actionBtn, { borderColor: theme.text, backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReadAloud();
            }}
          >
            <AppIcon name={isSpeaking ? 'stop-circle' : 'volume-2'} size={14} color={theme.text} prefer="feather" />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>
              {isSpeaking ? t('a11y.stop') : t('chat.readAloud') || 'Read Aloud'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cardHeaderTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 14,
  },
  callout: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  calloutLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  label: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    width: 85,
    flexShrink: 0,
    marginTop: 2,
  },
  valueContainer: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueSubtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  valueText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
  },
  treatmentContainer: {
    gap: 8,
  },
  treatmentBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  treatmentLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
  },
  treatmentText: {
    fontSize: 13,
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qualityText: {
    fontSize: 11,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
  },
  actionBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '600',
  },
  // Error Card Styles
  errorCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFF',
    width: '100%',
    marginBottom: SPACING.sm,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  errorTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  tipsBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipText: {
    fontSize: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
  },
});

