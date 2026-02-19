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
import type { RootStackParamList, AnimalEventType } from '../types';

interface LivestockEventScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LivestockEvent'>;
  route: RouteProp<RootStackParamList, 'LivestockEvent'>;
}

const EVENT_TYPES: { value: AnimalEventType; label: string }[] = [
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'calving', label: 'Calving' },
  { value: 'health_issue', label: 'Health Issue' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'breeding', label: 'Breeding' },
  { value: 'weight_record', label: 'Weight Record' },
  { value: 'milk_record', label: 'Milk Record' },
  { value: 'deworming', label: 'Deworming' },
  { value: 'sale', label: 'Sale' },
  { value: 'death', label: 'Death' },
];

export default function LivestockEventScreen({ navigation, route }: LivestockEventScreenProps) {
  const { animalId, eventType: initialType } = route.params;
  const { theme } = useApp();
  const { animals, addEvent } = useProfile();
  const { showSuccess, showError } = useToast();

  const animal = animals.find((a) => a.id === animalId);
  const displayName = animal?.name || animal?.livestockName || 'Animal';

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
          showError('Please enter a valid weight');
          setIsSaving(false);
          return;
        }
        eventData.weight_kg = w;
      }
      if (eventType === 'milk_record' && milkLiters) {
        const ml = parseFloat(milkLiters);
        if (isNaN(ml) || ml <= 0) {
          showError('Please enter a valid milk quantity');
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
        showSuccess('Event recorded');
        navigation.goBack();
      } else {
        showError('Failed to record event');
      }
    } catch {
      showError('Something went wrong');
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
        title={`Record Event`}
        subtitle={displayName}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel="Back"
          />
        }
        right={<View />}
      />

      {/* Event Type */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Event Type</Text>
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
                  {et.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Vaccination-specific */}
      {eventType === 'vaccination' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Vaccine Name</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={vaccineName}
              onChangeText={setVaccineName}
              placeholder="e.g. FMD, Anthrax"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>
      )}

      {/* Weight-specific */}
      {eventType === 'weight_record' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Weight (kg)</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 350"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* Milk-specific */}
      {eventType === 'milk_record' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Milk (liters)</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={milkLiters}
              onChangeText={setMilkLiters}
              placeholder="e.g. 5.5"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Notes (optional)</Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            style={[styles.input, styles.multilineInput, { color: theme.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any details..."
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
            <Text style={styles.saveButtonText}>Record Event</Text>
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
