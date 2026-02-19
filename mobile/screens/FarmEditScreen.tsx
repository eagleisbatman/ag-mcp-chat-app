/**
 * FarmEditScreen — Create or edit a farm.
 * farmId param = edit mode, undefined = create mode.
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
import type { RootStackParamList } from '../types';

interface FarmEditScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FarmEdit'>;
  route: RouteProp<RootStackParamList, 'FarmEdit'>;
}

export default function FarmEditScreen({ navigation, route }: FarmEditScreenProps) {
  const farmId = route.params?.farmId;
  const isEdit = !!farmId;
  const { theme } = useApp();
  const { farms, addFarm, updateFarm } = useProfile();
  const { showSuccess, showError } = useToast();

  const existing = isEdit ? farms.find((f) => f.id === farmId) : undefined;

  const [name, setName] = useState(existing?.name || '');
  const [area, setArea] = useState(existing?.totalAreaHectares?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError('Please enter a farm name');
      return;
    }

    setIsSaving(true);
    try {
      const areaNum = area.trim() ? parseFloat(area) : undefined;
      if (areaNum !== undefined && isNaN(areaNum)) {
        showError('Please enter a valid area');
        setIsSaving(false);
        return;
      }

      if (isEdit && farmId) {
        const success = await updateFarm(farmId, {
          name: trimmedName,
          totalAreaHectares: areaNum,
        });
        if (success) {
          showSuccess('Farm updated');
          navigation.goBack();
        } else {
          showError('Failed to update farm');
        }
      } else {
        const newFarm = await addFarm({
          name: trimmedName,
          totalAreaHectares: areaNum,
        });
        if (newFarm) {
          showSuccess('Farm added');
          navigation.goBack();
        } else {
          showError('Failed to add farm');
        }
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
        title={isEdit ? 'Edit Farm' : 'New Farm'}
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

      {/* Farm Name */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Farm Name</Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Main Farm"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            autoFocus={!isEdit}
          />
        </View>
      </View>

      {/* Total Area */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Total Area (hectares, optional)
        </Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={area}
            onChangeText={setArea}
            placeholder="e.g. 2.5"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
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
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Save Changes' : 'Add Farm'}
            </Text>
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
  inputWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    fontSize: TYPOGRAPHY.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
