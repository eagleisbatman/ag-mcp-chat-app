import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import type { RationFlowStep } from '../../types';

interface RationFlowRendererProps {
  flowStep: RationFlowStep;
}

interface FeedItem {
  name: string;
  quantity_kg: number;
  cost: number;
}

interface ScheduleSlot {
  timeslot: string;
  startHour: number;
  feeds: Array<{ name: string; quantityKg: number }>;
}

interface HistoryItem {
  id: string;
  name: string;
  status: string;
  dateCreated: string;
  costPerDay: number;
  currency: string;
}

/**
 * Renders a RationSmart flow step using localized strings + structured data.
 * Handles: numbered lists, structured diet/schedule/history cards, and legacy text fallback.
 */
export default function RationFlowRenderer({ flowStep }: RationFlowRendererProps): JSX.Element {
  const { theme } = useApp();
  const { messageKey, data } = flowStep;

  const params: Record<string, string | number> = {};
  if (data?.min != null) params.min = data.min as number;
  if (data?.max != null) params.max = data.max as number;
  const message = t(messageKey, Object.keys(params).length > 0 ? params : undefined);

  const blocks: JSX.Element[] = [];

  // Main message
  blocks.push(
    <Text key="msg" style={[styles.message, { color: theme.text }]}>
      {message}
    </Text>
  );

  // Country fallback warning
  if (data?.countryFallback && typeof data.countryFallback === 'string') {
    blocks.push(
      <View key="country-fallback" style={[styles.warningBanner, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '40' }]}>
        <Text style={[styles.warningText, { color: theme.accent }]}>
          {t('ration.countryFallbackWarning', { country: data.countryFallback as string })}
        </Text>
      </View>
    );
  }

  // Numbered cow list
  if (data?.cows && Array.isArray(data.cows)) {
    const cows = data.cows as Array<{ name: string; id: string }>;
    if (cows.length > 0) {
      blocks.push(
        <View key="cows" style={styles.list}>
          {cows.map((cow, idx) => (
            <Text key={cow.id} style={[styles.listItem, { color: theme.text }]}>
              {idx + 1}. {cow.name}
            </Text>
          ))}
        </View>
      );
      blocks.push(
        <Text key="cow-prompt" style={[styles.hint, { color: theme.textSecondary }]}>
          {t('ration.selectCowPrompt')}
        </Text>
      );
    }
  }

  // Numbered breed list
  if (data?.breeds && Array.isArray(data.breeds)) {
    const breeds = data.breeds as string[];
    if (breeds.length > 0) {
      blocks.push(
        <View key="breeds" style={styles.list}>
          {breeds.map((breed, idx) => (
            <Text key={breed} style={[styles.listItem, { color: theme.text }]}>
              {idx + 1}. {breed}
            </Text>
          ))}
        </View>
      );
      blocks.push(
        <Text key="breed-prompt" style={[styles.hint, { color: theme.textSecondary }]}>
          {t('ration.selectBreedPrompt')}
        </Text>
      );
    }
  }

  // Structured diet card (new format)
  if (data?.feeds && Array.isArray(data.feeds)) {
    const feeds = data.feeds as FeedItem[];
    const currency = (data.currency as string) || '';
    const totalCost = (data.totalCost as number) || 0;
    blocks.push(
      <View key="diet-card" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {t('ration.feedPlan')}
        </Text>
        {feeds.map((feed, idx) => (
          <View key={idx} style={styles.feedRow}>
            <Text style={[styles.feedName, { color: theme.text }]} numberOfLines={1}>
              {feed.name}
            </Text>
            <Text style={[styles.feedQty, { color: theme.textMuted }]}>
              {feed.quantity_kg.toFixed(1)} {t('ration.kgPerDay')}
            </Text>
            {feed.cost > 0 && (
              <Text style={[styles.feedCost, { color: theme.accent }]}>
                {currency} {feed.cost.toFixed(2)}
              </Text>
            )}
          </View>
        ))}
        {totalCost > 0 && (
          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>
              {t('ration.dailyCost')}
            </Text>
            <Text style={[styles.totalValue, { color: theme.accent }]}>
              {currency} {totalCost.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Structured schedule card (new format)
  if (data?.schedule) {
    const schedule = data.schedule as { cowName: string; currency: string; totalDailyCost: number; slots: ScheduleSlot[] };
    const timeslotLabels: Record<string, string> = {
      morning: t('ration.morning'),
      afternoon: t('ration.afternoon'),
      evening: t('ration.evening'),
    };
    blocks.push(
      <View key="schedule-card" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {schedule.cowName && (
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t('ration.scheduleFor', { cowName: schedule.cowName })}
          </Text>
        )}
        {schedule.slots.map((slot, idx) => (
          <View key={idx} style={styles.scheduleSlot}>
            <Text style={[styles.slotHeader, { color: theme.accent }]}>
              {timeslotLabels[slot.timeslot] || slot.timeslot} ({String(slot.startHour).padStart(2, '0')}:00)
            </Text>
            {slot.feeds.map((feed, fIdx) => (
              <Text key={fIdx} style={[styles.feedName, { color: theme.text, marginLeft: SPACING.sm }]}>
                {feed.name}: {feed.quantityKg.toFixed(1)} {t('ration.kg')}
              </Text>
            ))}
          </View>
        ))}
        {schedule.totalDailyCost > 0 && (
          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>{t('ration.dailyCost')}</Text>
            <Text style={[styles.totalValue, { color: theme.accent }]}>
              {schedule.currency} {schedule.totalDailyCost.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Structured history list (new format)
  if (data?.history) {
    const history = data.history as { items: HistoryItem[] };
    if (history.items.length > 0) {
      const statusLabels: Record<string, string> = {
        active: t('ration.statusActive'),
        following: t('ration.statusFollowing'),
        created: t('ration.statusCreated'),
        archived: t('ration.statusArchived'),
      };
      blocks.push(
        <View key="history-list" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {history.items.map((item, idx) => (
            <View key={item.id} style={[styles.historyItem, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: (item.status === 'active' || item.status === 'following') ? theme.accent + '20' : theme.border },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: (item.status === 'active' || item.status === 'following') ? theme.accent : theme.textMuted },
                  ]}>
                    {statusLabels[item.status] || item.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.historyMeta, { color: theme.textMuted }]}>
                {new Date(item.dateCreated).toLocaleDateString()}
                {item.costPerDay > 0 ? ` · ${item.currency} ${item.costPerDay.toFixed(2)}/${t('ration.day')}` : ''}
              </Text>
            </View>
          ))}
        </View>
      );
    }
  }

  // Follow confirmation with next check-in date
  if (data?.nextCheckIn) {
    blocks.push(
      <Text key="next-checkin" style={[styles.hint, { color: theme.accent }]}>
        {t('ration.nextCheckIn', { date: new Date(data.nextCheckIn as string).toLocaleDateString() })}
      </Text>
    );
  }

  // Legacy text fallback (for backwards compatibility with old MCP server responses)
  const richTextFields = ['dietText', 'scheduleText', 'historyText', 'followText', 'stopText'] as const;
  for (const field of richTextFields) {
    if (data?.[field] && typeof data[field] === 'string') {
      blocks.push(
        <Text key={field} style={[styles.richText, { color: theme.text }]}>
          {data[field] as string}
        </Text>
      );
    }
  }

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.5,
  },
  warningBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  warningText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * 1.4,
  },
  list: {
    marginTop: SPACING.xs,
    marginStart: SPACING.sm,
    gap: 2,
  },
  listItem: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.4,
  },
  hint: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  richText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.5,
    marginTop: SPACING.xs,
  },
  card: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  feedName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  feedQty: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  feedCost: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    minWidth: 60,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  totalValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scheduleSlot: {
    marginBottom: SPACING.xs,
  },
  slotHeader: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 2,
  },
  historyItem: {
    paddingVertical: SPACING.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  historyName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  historyMeta: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
});
