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
import { t } from '../constants/strings';
import type { RootStackParamList, TrackingMode, LactationStatus, MasterLivestock, Breed } from '../types';

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
  const [tagId, setTagId] = useState(existing?.tagId || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    existing?.dateOfBirth ? new Date(existing.dateOfBirth).toISOString().split('T')[0] : ''
  );
  const [lactationStatus, setLactationStatus] = useState<LactationStatus | ''>(existing?.lactationStatus || '');
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const breeds = useMemo(() => selectedType?.commonBreeds || [], [selectedType]);

  const handleSave = async () => {
    if (!isEdit && !selectedType) {
      showError(t('livestock.selectLivestockType'));
      return;
    }

    // Validate dateOfBirth format if provided
    const trimmedDob = dateOfBirth.trim();
    if (trimmedDob && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob)) {
      showError(t('livestock.invalidDateOfBirth'));
      return;
    }
    if (trimmedDob) {
      const parsed = new Date(trimmedDob);
      if (isNaN(parsed.getTime()) || parsed > new Date()) {
        showError(t('livestock.invalidDateOfBirth'));
        return;
      }
    }

    setIsSaving(true);
    try {
      if (isEdit && animalId) {
        const success = await updateAnimal(animalId, {
          name: name.trim() || undefined,
          breed: breed || undefined,
          tagId: tagId.trim() || undefined,
          dateOfBirth: trimmedDob || undefined,
          lactationStatus: lactationStatus || undefined,
        });
        if (success) {
          showSuccess(t('livestock.animalUpdated'));
          navigation.goBack();
        } else {
          showError(t('livestock.animalUpdateFailed'));
        }
      } else {
        const newAnimal = await addAnimal({
          livestockId: selectedType!.id,
          name: name.trim() || undefined,
          trackingMode,
          herdSize: trackingMode === 'herd' && herdSize ? parseInt(herdSize, 10) : undefined,
          breed: breed || undefined,
          gender: gender || undefined,
          tagId: tagId.trim() || undefined,
          dateOfBirth: trimmedDob || undefined,
          lactationStatus: lactationStatus || undefined,
        });
        if (newAnimal) {
          showSuccess(t('livestock.animalAdded'));
          navigation.goBack();
        } else {
          showError(t('livestock.animalAddFailed'));
        }
      }
    } catch {
      showError(t('common.somethingWentWrong'));
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
          title={isEdit ? t('livestock.editAnimal') : t('livestock.newAnimal')}
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

        {/* Livestock Type (create only) */}
        {!isEdit && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.livestockType')}</Text>
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
                {t('livestock.loadingLivestockTypes')}
              </Text>
            )}
          </View>
        )}

        {/* Tracking Mode (create only) */}
        {!isEdit && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.trackingMode')}</Text>
            <View style={styles.chipRow}>
              {([
                { value: 'individual' as TrackingMode, labelKey: 'livestock.individual' },
                { value: 'herd' as TrackingMode, labelKey: 'livestock.herd' },
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
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Herd Size */}
        {trackingMode === 'herd' && !isEdit && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.herdSize')}</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={herdSize}
                onChangeText={setHerdSize}
                placeholder={t('livestock.herdSizePlaceholder')}
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {trackingMode === 'herd' ? t('livestock.herdNameOptional') : t('livestock.nameOptional')}
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              testID="livestock-name"
              style={[styles.input, { color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder={trackingMode === 'herd' ? t('livestock.herdNamePlaceholder') : t('livestock.namePlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Breed */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.breed')}</Text>
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
                {breed || t('livestock.selectBreed')}
              </Text>
              <AppIcon name="chevron-down" size={18} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Gender (create only) */}
        {!isEdit && trackingMode === 'individual' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.gender')}</Text>
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
                    {t(`livestock.${g}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Tag ID */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.tagId')}</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={tagId}
              onChangeText={setTagId}
              placeholder={t('livestock.tagIdPlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.dateOfBirth')}</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              keyboardType="default"
              maxLength={10}
            />
          </View>
          <Text style={[styles.hintText, { color: theme.textMuted, marginTop: SPACING.xs, marginLeft: SPACING.xs }]}>
            {t('livestock.dateOfBirthHint') || 'Example: 2024-06-15'}
          </Text>
        </View>

        {/* Lactation Status */}
        {trackingMode === 'individual' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('livestock.lactationStatusLabel')}</Text>
            <View style={styles.chipRow}>
              {(['lactating', 'dry', 'not_applicable'] as LactationStatus[]).map((ls) => (
                <TouchableOpacity
                  key={ls}
                  onPress={() => setLactationStatus(lactationStatus === ls ? '' : ls)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: lactationStatus === ls ? theme.accent + '20' : theme.surfaceVariant,
                      borderColor: lactationStatus === ls ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: lactationStatus === ls ? theme.accent : theme.text }]}
                  >
                    {t(`livestock.lactation_${ls}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.section}>
          <TouchableOpacity
            testID="livestock-save"
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEdit ? t('livestock.saveChanges') : t('livestock.addAnimalButton')}
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
