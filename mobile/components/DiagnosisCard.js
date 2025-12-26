import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { t } from '../constants/strings';

/**
 * Minimalist Technical Report Card
 * Shows ONLY aggregation data with native app styling.
 * No heavy graphics, no tabular labels.
 */
export default function DiagnosisCard({ diagnosis, onReadAloud, isSpeaking }) {
  const { theme, isDark } = useApp();

  const data = useMemo(() => {
    if (typeof diagnosis === 'string') {
      try { return JSON.parse(diagnosis); } catch (e) { return null; }
    }
    return diagnosis;
  }, [diagnosis]);

  if (!data || typeof data !== 'object') return null;

  // Detection logic
  const status = data.health_status?.overall || data.health_status || 'Analyzed';
  const isHealthy = status.toLowerCase().includes('healthy');
  const cropName = data.crop?.name || data.crop || 'Plant';
  
  const isError = data.isNetworkError || data.isTimeout || 
                 (data.diagnostic_notes && data.diagnostic_notes.toLowerCase().includes('rejected'));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
      
      {/* 1. Header: Quick Identity */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppIcon name="leaf" size={20} color={isHealthy ? theme.success : theme.accent} prefer="mci" />
          <Text style={[styles.cropTitle, { color: theme.text }]}>{cropName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isHealthy ? theme.success + '20' : theme.warning + '20' }]}>
          <Text style={[styles.badgeText, { color: isHealthy ? theme.success : theme.warning }]}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* 2. Analysis Details */}
      <View style={styles.content}>
        {data.issues?.length > 0 && data.issues.map((issue, i) => (
          <View key={i} style={styles.issueRow}>
            <Text style={[styles.issueName, { color: theme.text }]}>{issue.name || issue}</Text>
            {issue.severity && <Text style={[styles.severity, { color: theme.textMuted }]}>{issue.severity}</Text>}
            {issue.symptoms?.length > 0 && (
              <Text style={[styles.symptoms, { color: theme.textSecondary }]}>
                {issue.symptoms.join(' · ')}
              </Text>
            )}
          </View>
        ))}

        {/* 3. Aggregation Recommendations */}
        {data.treatment_recommendations?.length > 0 && (
          <View style={[styles.recommendations, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            {data.treatment_recommendations.map((t, i) => (
              <View key={i} style={styles.treatmentBlock}>
                {t.organic_options?.length > 0 && (
                  <View style={styles.optionRow}>
                    <AppIcon name="sprout" size={14} color={theme.success} prefer="mci" />
                    <Text style={[styles.optionText, { color: theme.text }]}>{t.organic_options.map(o => o.name).join(', ')}</Text>
                  </View>
                )}
                {t.chemical_options?.length > 0 && (
                  <View style={styles.optionRow}>
                    <AppIcon name="flask" size={14} color={theme.accent} prefer="mci" />
                    <Text style={[styles.optionText, { color: theme.text }]}>{t.chemical_options.map(o => o.active_ingredient).join(', ')}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 4. Expert Note (aggregation generated) */}
        {data.diagnostic_notes && (
          <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)' }]}>
            <Text style={[styles.noteText, { color: theme.textSecondary }]}>{data.diagnostic_notes}</Text>
          </View>
        )}
      </View>

      {/* 5. Integrated Action Footer */}
      <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.metaText, { color: theme.textMuted }]}>
          {data.image_quality ? `Quality: ${data.image_quality}` : 'Analyzed via AgriVision'}
        </Text>
        {onReadAloud && (
          <Pressable 
            onPress={() => {
              Haptics.selectionAsync();
              onReadAloud();
            }}
            style={styles.speakBtn}
          >
            <AppIcon name={isSpeaking ? 'stop-circle' : 'volume-high'} size={18} color={theme.accent} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: SPACING.sm,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cropTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  issueRow: {
    marginBottom: 12,
  },
  issueName: {
    fontSize: 15,
    fontWeight: '600',
  },
  severity: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  symptoms: {
    fontSize: 13,
    lineHeight: 18,
  },
  recommendations: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  noteBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
  },
  metaText: {
    fontSize: 11,
  },
  speakBtn: {
    padding: 4,
  },
});
