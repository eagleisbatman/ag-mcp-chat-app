/**
 * LivestockDetailScreen — Animal info + event timeline.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import { t } from '../constants/strings';
import type { RootStackParamList, AnimalEvent, AnimalEventType } from '../types';

interface LivestockDetailScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LivestockDetail'>;
  route: RouteProp<RootStackParamList, 'LivestockDetail'>;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#30D158',
  sold: '#FF9F0A',
  deceased: '#FF453A',
  transferred: '#0A84FF',
};

const EVENT_ICONS: Record<string, string> = {
  vaccination: 'flask',
  calving: 'sprout',
  health_issue: 'alert-circle',
  treatment: 'flask',
  sale: 'arrow-forward',
  death: 'close-circle',
  weight_record: 'target',
  milk_record: 'water',
  breeding: 'heart',
  deworming: 'flask',
};

const QUICK_EVENTS: { type: AnimalEventType; labelKey: string }[] = [
  { type: 'vaccination', labelKey: 'livestockEvent.vaccination' },
  { type: 'health_issue', labelKey: 'livestockEvent.healthIssue' },
  { type: 'weight_record', labelKey: 'livestockEvent.weightRecord' },
  { type: 'milk_record', labelKey: 'livestockEvent.milkRecord' },
  { type: 'breeding', labelKey: 'livestockEvent.breeding' },
];

const EVENT_LABEL_KEYS: Record<string, string> = {
  vaccination: 'livestockEvent.vaccination',
  calving: 'livestockEvent.calving',
  health_issue: 'livestockEvent.healthIssue',
  treatment: 'livestockEvent.treatment',
  breeding: 'livestockEvent.breeding',
  weight_record: 'livestockEvent.weightRecord',
  milk_record: 'livestockEvent.milkRecord',
  deworming: 'livestockEvent.deworming',
  sale: 'livestockEvent.sale',
  death: 'livestockEvent.death',
};

export default function LivestockDetailScreen({ navigation, route }: LivestockDetailScreenProps) {
  const { animalId } = route.params;
  const { theme } = useApp();
  const { animals, deleteAnimal } = useProfile();
  const { showSuccess, showError } = useToast();

  const animal = animals.find((a) => a.id === animalId);

  if (!animal) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title={t('livestock.editAnimal')}
          left={
            <IconButton
              icon="arrow-back"
              onPress={() => navigation.goBack()}
              backgroundColor="transparent"
              color={theme.text}
              accessibilityLabel={t('common.back')}
            />
          }
          right={<View />}
        />
        <View style={styles.centerEmpty}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('livestock.animalNotFound')}</Text>
        </View>
      </View>
    );
  }

  const displayName = animal.name || animal.livestockName || t('livestock.animal');
  const statusColor = STATUS_COLORS[animal.status] || theme.textMuted;
  const events = useMemo(
    () => [...(animal.events || [])].sort((a, b) => {
      const aTime = new Date(a.eventDate).getTime();
      const bTime = new Date(b.eventDate).getTime();
      if (isNaN(aTime) && isNaN(bTime)) return 0;
      if (isNaN(aTime)) return 1;
      if (isNaN(bTime)) return -1;
      return bTime - aTime;
    }),
    [animal.events]
  );

  const handleDelete = () => {
    Alert.alert(
      t('livestock.deleteAnimal'),
      t('livestock.deleteAnimalConfirm', { name: displayName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAnimal(animal.id);
            if (success) {
              showSuccess(t('livestock.animalDeleted'));
              navigation.goBack();
            } else {
              showError(t('livestock.animalDeleteFailed'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderEventItem = (event: AnimalEvent) => {
    const iconName = EVENT_ICONS[event.eventType] || 'clock';
    const labelKey = EVENT_LABEL_KEYS[event.eventType];
    const label = labelKey ? t(labelKey) : event.eventType.replace(/_/g, ' ');

    return (
      <View key={event.id} style={[styles.eventItem, { backgroundColor: theme.surfaceVariant }]}>
        <View style={[styles.eventIconWrap, { backgroundColor: theme.accent + '15' }]}>
          <AppIcon name={iconName} size={16} color={theme.accent} />
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventLabel, { color: theme.text }]}>
            {label}
          </Text>
          {event.notes && (
            <Text style={[styles.eventNotes, { color: theme.textMuted }]} numberOfLines={2}>
              {event.notes}
            </Text>
          )}
          <Text style={[styles.eventDate, { color: theme.textMuted }]}>
            {formatDate(event.eventDate)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={displayName}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={
          <IconButton
            icon="edit-2"
            onPress={() => navigation.navigate('LivestockEdit', { animalId: animal.id })}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('livestock.editAnimal')}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surfaceVariant }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('livestock.type')}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {animal.livestockName || '—'}
            </Text>
          </View>
          {animal.breed && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('livestock.breedLabel')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{animal.breed}</Text>
            </View>
          )}
          {animal.gender && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('livestock.genderLabel')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {animal.gender.charAt(0).toUpperCase() + animal.gender.slice(1)}
              </Text>
            </View>
          )}
          {animal.trackingMode === 'herd' && animal.herdSize && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('livestock.herdSizeLabel')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{animal.herdSize}</Text>
            </View>
          )}
          {animal.weightKg && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('livestock.weight')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{t('livestock.weightValue', { weight: String(animal.weightKg) })}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('livestock.status')}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {animal.status.charAt(0).toUpperCase() + animal.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick event buttons */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('livestock.recordEvent')}</Text>
        </View>
        <View style={styles.quickEvents}>
          {QUICK_EVENTS.map((qe) => (
            <TouchableOpacity
              key={qe.type}
              onPress={() =>
                navigation.navigate('LivestockEvent', { animalId: animal.id, eventType: qe.type })
              }
              style={[styles.quickEventBtn, { backgroundColor: theme.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <AppIcon
                name={EVENT_ICONS[qe.type] || 'clock'}
                size={16}
                color={theme.accent}
              />
              <Text style={[styles.quickEventLabel, { color: theme.text }]}>{t(qe.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event timeline */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('livestock.eventHistory')}</Text>
        </View>

        {events.length > 0 ? (
          <View style={styles.eventList}>{events.map(renderEventItem)}</View>
        ) : (
          <Text style={[styles.noEvents, { color: theme.textMuted }]}>
            {t('livestock.noEventsRecorded')}
          </Text>
        )}

        {/* Delete button */}
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteButton, { borderColor: theme.error }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.deleteButtonText, { color: theme.error }]}>{t('livestock.deleteAnimal')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING['3xl'],
  },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
  },
  summaryCard: {
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'capitalize',
  },
  sectionHeader: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  quickEvents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: 6,
  },
  quickEventLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  eventList: {
    gap: SPACING.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: 12,
  },
  eventIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  eventNotes: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  eventDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 4,
  },
  noEvents: {
    fontSize: TYPOGRAPHY.sizes.sm,
    paddingVertical: SPACING.md,
  },
  deleteButton: {
    marginTop: SPACING['2xl'],
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
