/**
 * A2UIRichCard — Renders new-format A2UI envelope protocol components inline in chat.
 *
 * Handles components that come through the A2UI Envelope Protocol (WeatherCard,
 * SoilAnalysisCard, DiagnosisCard, StatGrid, AlertBanner, DietPlanCard, etc.)
 * converted to legacy A2UIPayload shape with _a2ui metadata in context.
 *
 * Falls back gracefully: if a component type is unknown, renders a generic
 * title + description card so no data is silently lost.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import type { A2UIPayload, A2UIComponentName } from '../../types';

interface A2UIRichCardProps {
  widget: A2UIPayload;
}

/** Extract the A2UI component name from the _a2ui metadata. */
function getComponentName(widget: A2UIPayload): A2UIComponentName | undefined {
  const meta = widget.context?._a2ui as { component?: string } | undefined;
  return meta?.component as A2UIComponentName | undefined;
}

// ============================================
// Component-specific renderers
// ============================================

function WeatherCardRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const temp = props.temperature_c as number | undefined;
  const conditions = props.conditions as string | undefined;
  const location = props.location as string | undefined;
  const humidity = props.humidity_percent as number | undefined;
  const wind = props.wind_speed_kmh as number | undefined;
  const precip = props.precipitation_probability_percent as number | undefined;
  const feelsLike = props.feels_like_c as number | undefined;

  return (
    <View>
      {location && (
        <Text style={[styles.location, { color: theme.textMuted }]}>{location}</Text>
      )}
      <View style={styles.weatherMain}>
        <Text style={[styles.tempLarge, { color: theme.text }]}>
          {temp != null ? `${Math.round(temp)}` : '--'}
          <Text style={styles.tempUnit}>{'\u00B0C'}</Text>
        </Text>
        {conditions && (
          <Text style={[styles.conditions, { color: theme.textSecondary }]}>{conditions}</Text>
        )}
      </View>
      <View style={styles.statsRow}>
        {feelsLike != null && (
          <StatItem label="Feels like" value={`${Math.round(feelsLike)}\u00B0`} theme={theme} />
        )}
        {humidity != null && (
          <StatItem label="Humidity" value={`${humidity}%`} theme={theme} />
        )}
        {wind != null && (
          <StatItem label="Wind" value={`${Math.round(wind)} km/h`} theme={theme} />
        )}
        {precip != null && (
          <StatItem label="Rain" value={`${precip}%`} theme={theme} />
        )}
      </View>
    </View>
  );
}

function StatItem({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function SoilAnalysisCardRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const location = props.location as string | undefined;
  const soilType = props.soil_type as string | undefined;
  const ph = props.ph as { value: number; rating: string } | undefined;
  const nutrients = props.key_nutrients as Array<{ name: string; value: number; unit: string; rating: string }> | undefined;
  const depth = props.depth as string | undefined;

  const ratingColor = (rating: string) => {
    if (rating === 'low') return theme.warning;
    if (rating === 'high') return theme.error;
    if (rating === 'optimal') return theme.success;
    return theme.textSecondary;
  };

  return (
    <View>
      {location && (
        <Text style={[styles.location, { color: theme.textMuted }]}>{location}</Text>
      )}
      <View style={styles.statsRow}>
        {soilType && <StatItem label="Type" value={soilType} theme={theme} />}
        {ph && <StatItem label="pH" value={`${ph.value} (${ph.rating})`} theme={theme} />}
        {depth && <StatItem label="Depth" value={depth} theme={theme} />}
      </View>
      {nutrients && nutrients.length > 0 && (
        <View style={styles.nutrientList}>
          {nutrients.map((n, i) => (
            <View key={i} style={styles.nutrientRow}>
              <Text style={[styles.nutrientName, { color: theme.text }]}>{n.name}</Text>
              <Text style={[styles.nutrientValue, { color: ratingColor(n.rating) }]}>
                {n.value} {n.unit}
              </Text>
              <Text style={[styles.nutrientRating, { color: ratingColor(n.rating) }]}>
                {n.rating}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function DiagnosisCardRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const provider = props.provider as string | undefined;
  const crop = props.crop as { name: string; confidence_percent?: number } | undefined;
  const healthStatus = props.health_status as string | undefined;
  const issuesCount = props.issues_count as number | undefined;
  const imageQuality = props.image_quality as string | undefined;

  const statusColor = (status: string | undefined) => {
    if (!status) return theme.textSecondary;
    const lower = status.toLowerCase();
    if (lower.includes('healthy')) return theme.success;
    if (lower.includes('severe') || lower.includes('critical')) return theme.error;
    return theme.warning;
  };

  return (
    <View>
      <View style={styles.diagHeader}>
        <AppIcon name="search" size={16} color={theme.accent} />
        <Text style={[styles.diagProvider, { color: theme.textMuted }]}>{provider || 'Diagnosis'}</Text>
      </View>
      {crop && (
        <Text style={[styles.diagCrop, { color: theme.text }]}>
          {crop.name}
          {crop.confidence_percent != null && (
            <Text style={{ color: theme.textMuted }}> ({crop.confidence_percent}%)</Text>
          )}
        </Text>
      )}
      {healthStatus && (
        <Text style={[styles.diagStatus, { color: statusColor(healthStatus) }]}>
          {healthStatus}
        </Text>
      )}
      <View style={styles.statsRow}>
        {issuesCount != null && (
          <StatItem label="Issues found" value={String(issuesCount)} theme={theme} />
        )}
        {imageQuality && (
          <StatItem label="Image quality" value={imageQuality} theme={theme} />
        )}
      </View>
    </View>
  );
}

function StatGridRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const stats = props.stats as Array<{ label: string; value: string | number; unit?: string; icon?: string }> | undefined;

  if (!stats || stats.length === 0) return null;

  return (
    <View style={styles.statGrid}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.statGridItem, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[styles.statGridValue, { color: theme.text }]}>
            {s.value}{s.unit ? ` ${s.unit}` : ''}
          </Text>
          <Text style={[styles.statGridLabel, { color: theme.textMuted }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function AlertBannerRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const message = props.message as string | undefined;
  const severity = (props.severity as string) || 'info';

  const severityConfig = {
    info: { bg: theme.infoLight, text: theme.info, icon: 'information-circle' as const },
    warning: { bg: theme.warningLight, text: theme.warning, icon: 'alert-circle' as const },
    error: { bg: theme.errorLight, text: theme.error, icon: 'close-circle' as const },
    success: { bg: theme.successLight, text: theme.success, icon: 'checkmark-circle' as const },
  };
  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;

  return (
    <View style={[styles.alertBanner, { backgroundColor: config.bg }]}>
      <AppIcon name={config.icon} size={18} color={config.text} />
      <Text style={[styles.alertText, { color: config.text }]}>{message || ''}</Text>
    </View>
  );
}

function DietPlanCardRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const cowName = props.cowName as string | undefined;
  const totalCost = props.totalCost as number | undefined;
  const currency = props.currency as string | undefined;
  const feedCount = props.feedCount as number | undefined;
  const summary = props.summary as string | undefined;

  return (
    <View>
      {cowName && (
        <Text style={[styles.dietCowName, { color: theme.text }]}>{cowName}</Text>
      )}
      <View style={styles.statsRow}>
        {totalCost != null && (
          <StatItem label="Total cost" value={`${currency || ''} ${totalCost}`} theme={theme} />
        )}
        {feedCount != null && (
          <StatItem label="Feeds" value={String(feedCount)} theme={theme} />
        )}
      </View>
      {summary && (
        <Text style={[styles.dietSummary, { color: theme.textSecondary }]}>{summary}</Text>
      )}
    </View>
  );
}

function FeedTableRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const feeds = props.feeds as Array<{ name: string; quantity_kg: number; cost: number }> | undefined;
  const totalCost = props.totalCost as number | undefined;
  const currency = props.currency as string | undefined;

  if (!feeds || feeds.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.tableHeaderCell, styles.feedNameCol, { color: theme.textMuted }]}>Feed</Text>
          <Text style={[styles.tableHeaderCell, styles.feedNumCol, { color: theme.textMuted }]}>Qty (kg)</Text>
          <Text style={[styles.tableHeaderCell, styles.feedNumCol, { color: theme.textMuted }]}>Cost</Text>
        </View>
        {feeds.map((f, i) => (
          <View key={i} style={[styles.tableRow, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.tableCell, styles.feedNameCol, { color: theme.text }]}>{f.name}</Text>
            <Text style={[styles.tableCell, styles.feedNumCol, { color: theme.text }]}>{f.quantity_kg}</Text>
            <Text style={[styles.tableCell, styles.feedNumCol, { color: theme.text }]}>{f.cost}</Text>
          </View>
        ))}
        {totalCost != null && (
          <View style={[styles.tableRow, styles.tableTotalRow]}>
            <Text style={[styles.tableCell, styles.feedNameCol, styles.totalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.tableCell, styles.feedNumCol, { color: theme.text }]} />
            <Text style={[styles.tableCell, styles.feedNumCol, styles.totalLabel, { color: theme.text }]}>
              {currency ? `${currency} ` : ''}{totalCost}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function IssueListRenderer({ props, theme }: { props: Record<string, unknown>; theme: any }) {
  const issues = props.issues as Array<{
    name: string;
    category?: string;
    severity?: string;
    symptoms?: string[];
    treatments?: Array<{ type: string; description: string }>;
  }> | undefined;

  if (!issues || issues.length === 0) return null;

  const severityColor = (sev: string | undefined) => {
    if (!sev) return theme.textSecondary;
    const lower = sev.toLowerCase();
    if (lower === 'critical' || lower === 'high') return theme.error;
    if (lower === 'moderate') return theme.warning;
    return theme.textSecondary;
  };

  return (
    <View>
      {issues.map((issue, i) => (
        <View key={i} style={[styles.issueItem, i > 0 && { borderTopColor: theme.borderLight, borderTopWidth: 1 }]}>
          <View style={styles.issueHeader}>
            <Text style={[styles.issueName, { color: theme.text }]}>{issue.name}</Text>
            {issue.severity && (
              <Text style={[styles.issueSeverity, { color: severityColor(issue.severity) }]}>
                {issue.severity}
              </Text>
            )}
          </View>
          {issue.category && (
            <Text style={[styles.issueCategory, { color: theme.textMuted }]}>{issue.category}</Text>
          )}
          {issue.symptoms && issue.symptoms.length > 0 && (
            <Text style={[styles.issueSymptoms, { color: theme.textSecondary }]}>
              Symptoms: {issue.symptoms.join(', ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Generic fallback: renders title + any summary/description from props. */
function GenericCardRenderer({ widget, theme }: { widget: A2UIPayload; theme: any }) {
  const component = getComponentName(widget);

  return (
    <View>
      <Text style={[styles.genericTitle, { color: theme.text }]}>
        {widget.title || component || 'Information'}
      </Text>
      {widget.description && (
        <Text style={[styles.genericDescription, { color: theme.textSecondary }]}>
          {widget.description}
        </Text>
      )}
    </View>
  );
}

// ============================================
// Main Component
// ============================================

/**
 * Set of A2UI component names that this renderer handles.
 * Used by A2UIDispatcher to route to this component.
 */
export const RICH_CARD_COMPONENTS = new Set<string>([
  'WeatherCard',
  'SoilAnalysisCard',
  'DiagnosisCard',
  'StatGrid',
  'AlertBanner',
  'DietPlanCard',
  'FeedTable',
  'FeedDistributionChart',
  'FeedingSchedule',
  'IssueList',
  'ForecastTable',
  'DataTable',
  'WorkflowTimeline',
  'ToolOutputPreview',
  'MapView',
  'ImageViewer',
  'CollapsibleSection',
]);

export default function A2UIRichCard({ widget }: A2UIRichCardProps) {
  const { theme } = useApp();
  const component = getComponentName(widget);
  const props = widget.context || {};

  const renderContent = () => {
    switch (component) {
      case 'WeatherCard':
        return <WeatherCardRenderer props={props} theme={theme} />;
      case 'SoilAnalysisCard':
        return <SoilAnalysisCardRenderer props={props} theme={theme} />;
      case 'DiagnosisCard':
        return <DiagnosisCardRenderer props={props} theme={theme} />;
      case 'StatGrid':
        return <StatGridRenderer props={props} theme={theme} />;
      case 'AlertBanner':
        return <AlertBannerRenderer props={props} theme={theme} />;
      case 'DietPlanCard':
        return <DietPlanCardRenderer props={props} theme={theme} />;
      case 'FeedTable':
        return <FeedTableRenderer props={props} theme={theme} />;
      case 'IssueList':
        return <IssueListRenderer props={props} theme={theme} />;
      default:
        return <GenericCardRenderer widget={widget} theme={theme} />;
    }
  };

  // AlertBanner has its own styling — render without card wrapper
  if (component === 'AlertBanner') {
    return <View style={styles.alertContainer}>{renderContent()}</View>;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.inputBorder,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={widget.title || component || 'Information card'}
    >
      {/* Card header with component type indicator */}
      {component && component !== 'StatGrid' && (
        <View style={styles.cardHeader}>
          <View style={[styles.componentBadge, { backgroundColor: theme.accent + '15' }]}>
            <Text style={[styles.componentBadgeText, { color: theme.accent }]}>
              {formatComponentLabel(component)}
            </Text>
          </View>
        </View>
      )}
      {renderContent()}
    </View>
  );
}

/** Convert component names like 'WeatherCard' to 'Weather' for display. */
function formatComponentLabel(name: string): string {
  return name
    .replace(/Card$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  alertContainer: {
    marginTop: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  componentBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  componentBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Weather
  location: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.xs,
  },
  weatherMain: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tempLarge: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  tempUnit: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  conditions: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  // Stats row (shared)
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 1,
  },
  // Soil
  nutrientList: {
    marginTop: SPACING.sm,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  nutrientName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginRight: SPACING.sm,
  },
  nutrientRating: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    width: 60,
    textAlign: 'right',
  },
  // Diagnosis
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  diagProvider: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagCrop: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  diagStatus: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: 2,
  },
  // StatGrid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statGridItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  statGridValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  statGridLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  // Alert
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 10,
  },
  alertText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 18,
  },
  // Diet
  dietCowName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  dietSummary: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  // Feed table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  tableHeaderCell: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableTotalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  tableCell: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  feedNameCol: {
    flex: 2,
    minWidth: 120,
  },
  feedNumCol: {
    flex: 1,
    minWidth: 70,
    textAlign: 'right',
  },
  totalLabel: {
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  // Issue list
  issueItem: {
    paddingVertical: SPACING.sm,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    flex: 1,
  },
  issueSeverity: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
  },
  issueCategory: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  issueSymptoms: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  // Generic fallback
  genericTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  genericDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
});
