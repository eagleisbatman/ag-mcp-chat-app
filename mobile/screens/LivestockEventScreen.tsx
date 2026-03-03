/**
 * LivestockEventScreen — Record an event for an animal.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import { t } from '../constants/strings';
import type { RootStackParamList, AnimalEventType } from '../types';

interface LivestockEventScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LivestockEvent'>;
  route: RouteProp<RootStackParamList, 'LivestockEvent'>;
}

const EVENT_TYPES: { value: AnimalEventType; labelKey: string }[] = [
  { value: 'vaccination', labelKey: 'livestockEvent.vaccination' },
  { value: 'calving', labelKey: 'livestockEvent.calving' },
  { value: 'health_issue', labelKey: 'livestockEvent.healthIssue' },
  { value: 'treatment', labelKey: 'livestockEvent.treatment' },
  { value: 'breeding', labelKey: 'livestockEvent.breeding' },
  { value: 'weight_record', labelKey: 'livestockEvent.weightRecord' },
  { value: 'milk_record', labelKey: 'livestockEvent.milkRecord' },
  { value: 'deworming', labelKey: 'livestockEvent.deworming' },
  { value: 'sale', labelKey: 'livestockEvent.sale' },
  { value: 'death', labelKey: 'livestockEvent.death' },
];

export default function LivestockEventScreen({ navigation, route }: LivestockEventScreenProps) {
  const { animalId, eventType: initialType } = route.params;
  const { theme } = useApp();
  const { animals, addEvent } = useProfile();
  const { showSuccess, showError } = useToast();

  const animal = animals.find((a) => a.id === animalId);
  const displayName = animal?.name || animal?.livestockName || t('livestock.animal');

  const [eventType, setEventType] = useState<AnimalEventType>(initialType || 'vaccination');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Event-specific data fields
  const [weight, setWeight] = useState('');
  const [milkLiters, setMilkLiters] = useState('');
  const [vaccineName, setVaccineName] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const eventData: Record<string, unknown> = {};

      if (eventType === 'weight_record' && weight) {
        const w = parseFloat(weight);
        if (isNaN(w) || w <= 0) {
          showError(t('livestockEvent.enterValidWeight'));
          setIsSaving(false);
          return;
        }
        eventData.weight_kg = w;
      }
      if (eventType === 'milk_record' && milkLiters) {
        const ml = parseFloat(milkLiters);
        if (isNaN(ml) || ml <= 0) {
          showError(t('livestockEvent.enterValidMilk'));
          setIsSaving(false);
          return;
        }
        eventData.liters = ml;
      }
      if (eventType === 'vaccination' && vaccineName) {
        eventData.vaccine_name = vaccineName;
      }

      const event = await addEvent(animalId, {
        eventType,
        eventData: Object.keys(eventData).length > 0 ? eventData : undefined,
        notes: notes.trim() || undefined,
      });

      if (event) {
        showSuccess(t('livestockEvent.eventRecorded'));
        navigation.goBack();
      } else {
        showError(t('livestockEvent.eventRecordFailed'));
      }
    } catch {
      showError(t('common.somethingWentWrong'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title={t('livestockEvent.recordEventTitle')}
        subtitle={displayName}
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

      {/* Event Type */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestockEvent.eventType')}</Text>
        <View style={styles.chipRow}>
          {EVENT_TYPES.map((et) => {
            const selected = eventType === et.value;
            return (
              <TouchableOpacity
                key={et.value}
                onPress={() => setEventType(et.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.accent + '20' : theme.surfaceVariant,
                    borderColor: selected ? theme.accent : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? theme.accent : theme.text },
                  ]}
                >
                  {t(et.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Vaccination-specific */}
      {eventType === 'vaccination' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestockEvent.vaccineName')}</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={vaccineName}
              onChangeText={setVaccineName}
              placeholder={t('livestockEvent.vaccineNamePlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>
      )}

      {/* Weight-specific */}
      {eventType === 'weight_record' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestockEvent.weightKg')}</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={weight}
              onChangeText={setWeight}
              placeholder={t('livestockEvent.weightPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* Milk-specific */}
      {eventType === 'milk_record' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestockEvent.milkLiters')}</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={milkLiters}
              onChangeText={setMilkLiters}
              placeholder={t('livestockEvent.milkPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestockEvent.notesOptional')}</Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            style={[styles.input, styles.multilineInput, { color: theme.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('livestockEvent.notesPlaceholder')}
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{t('livestockEvent.recordEventButton')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: SPACING['3xl'] },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  inputWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    fontSize: TYPOGRAPHY.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  multilineInput: {
    minHeight: 80,
  },
  saveButton: {
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
