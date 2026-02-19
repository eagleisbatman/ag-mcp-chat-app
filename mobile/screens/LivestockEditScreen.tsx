/**
 * LivestockEditScreen — Create or edit an animal.
 * animalId param = edit mode, undefined = create mode.
 */

import React, { useState, useMemo } from 'react';
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
import AppIcon from '../components/ui/AppIcon';
import BreedPicker from '../components/livestock/BreedPicker';
import type { RootStackParamList, TrackingMode, MasterLivestock, Breed } from '../types';

interface LivestockEditScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LivestockEdit'>;
  route: RouteProp<RootStackParamList, 'LivestockEdit'>;
}

export default function LivestockEditScreen({ navigation, route }: LivestockEditScreenProps) {
  const animalId = route.params?.animalId;
  const isEdit = !!animalId;
  const { theme } = useApp();
  const { animals, masterLivestock, addAnimal, updateAnimal } = useProfile();
  const { showSuccess, showError } = useToast();

  const existing = isEdit ? animals.find((a) => a.id === animalId) : undefined;

  const [selectedType, setSelectedType] = useState<MasterLivestock | null>(
    existing?.livestockId
      ? masterLivestock.find((l) => l.id === existing.livestockId) || null
      : null
  );
  const [name, setName] = useState(existing?.name || '');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(existing?.trackingMode || 'individual');
  const [herdSize, setHerdSize] = useState(existing?.herdSize?.toString() || '');
  const [breed, setBreed] = useState(existing?.breed || '');
  const [gender, setGender] = useState(existing?.gender || '');
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const breeds = useMemo(() => selectedType?.commonBreeds || [], [selectedType]);

  const handleSave = async () => {
    if (!isEdit && !selectedType) {
      showError('Please select a livestock type');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && animalId) {
        const success = await updateAnimal(animalId, {
          name: name.trim() || undefined,
          breed: breed || undefined,
        });
        if (success) {
          showSuccess('Animal updated');
          navigation.goBack();
        } else {
          showError('Failed to update animal');
        }
      } else {
        const newAnimal = await addAnimal({
          livestockId: selectedType!.id,
          name: name.trim() || undefined,
          trackingMode,
          herdSize: trackingMode === 'herd' && herdSize ? parseInt(herdSize, 10) : undefined,
          breed: breed || undefined,
          gender: gender || undefined,
        });
        if (newAnimal) {
          showSuccess('Animal added');
          navigation.goBack();
        } else {
          showError('Failed to add animal');
        }
      }
    } catch {
      showError('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBreedSelect = (b: Breed) => {
    setBreed(b.name);
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={isEdit ? 'Edit Animal' : 'New Animal'}
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

        {/* Livestock Type (create only) */}
        {!isEdit && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Livestock Type</Text>
            <View style={styles.chipRow}>
              {masterLivestock.map((lt) => {
                const selected = selectedType?.id === lt.id;
                return (
                  <TouchableOpacity
                    key={lt.id}
                    onPress={() => {
                      setSelectedType(lt);
                      setBreed(''); // Reset breed when type changes
                    }}
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
                      {lt.translatedName || lt.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {masterLivestock.length === 0 && (
              <Text style={[styles.hintText, { color: theme.textMuted }]}>
                Loading livestock types...
              </Text>
            )}
          </View>
        )}

        {/* Tracking Mode (create only) */}
        {!isEdit && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Tracking Mode</Text>
            <View style={styles.chipRow}>
              {([
                { value: 'individual' as TrackingMode, label: 'Individual' },
                { value: 'herd' as TrackingMode, label: 'Herd' },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setTrackingMode(opt.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: trackingMode === opt.value ? theme.accent + '20' : theme.surfaceVariant,
                      borderColor: trackingMode === opt.value ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: trackingMode === opt.value ? theme.accent : theme.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Herd Size */}
        {trackingMode === 'herd' && !isEdit && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Herd Size</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={herdSize}
                onChangeText={setHerdSize}
                placeholder="e.g. 12"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {trackingMode === 'herd' ? 'Herd Name (optional)' : 'Name (optional)'}
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder={trackingMode === 'herd' ? 'e.g. Main Herd' : 'e.g. Aster'}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Breed */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Breed</Text>
          <TouchableOpacity
            onPress={() => setShowBreedPicker(true)}
            style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}
            activeOpacity={0.7}
          >
            <View style={styles.pickerRow}>
              <Text
                style={[
                  styles.input,
                  { color: breed ? theme.text : theme.textMuted },
                ]}
              >
                {breed || 'Select breed...'}
              </Text>
              <AppIcon name="chevron-down" size={18} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Gender (create only) */}
        {!isEdit && trackingMode === 'individual' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Gender</Text>
            <View style={styles.chipRow}>
              {['male', 'female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(gender === g ? '' : g)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: gender === g ? theme.accent + '20' : theme.surfaceVariant,
                      borderColor: gender === g ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: gender === g ? theme.accent : theme.text }]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
              <Text style={styles.saveButtonText}>
                {isEdit ? 'Save Changes' : 'Add Animal'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BreedPicker
        visible={showBreedPicker}
        onClose={() => setShowBreedPicker(false)}
        onSelect={handleBreedSelect}
        breeds={breeds}
        livestockName={selectedType?.translatedName || selectedType?.name}
      />
    </>
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
  hintText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.sm,
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.md,
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
