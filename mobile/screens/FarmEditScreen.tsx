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
import * as Location from 'expo-location';
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
  const [latitude, setLatitude] = useState<number | undefined>(existing?.latitude ?? undefined);
  const [longitude, setLongitude] = useState<number | undefined>(existing?.longitude ?? undefined);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError(t('farm.locationPermissionDenied'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords) {
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        showSuccess(t('farm.locationSet'));
      } else {
        showError(t('farm.locationFailed'));
      }
    } catch {
      showError(t('farm.locationFailed'));
    } finally {
      setIsLocating(false);
    }
  };

  const handleClearLocation = () => {
    setLatitude(undefined);
    setLongitude(undefined);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(t('farm.enterFarmName'));
      return;
    }

    setIsSaving(true);
    try {
      const areaNum = area.trim() ? parseFloat(area) : undefined;
      if (areaNum !== undefined && (isNaN(areaNum) || areaNum <= 0 || areaNum > 100_000)) {
        showError(t('farm.enterValidArea'));
        setIsSaving(false);
        return;
      }

      if (isEdit && farmId) {
        const success = await updateFarm(farmId, {
          name: trimmedName,
          totalAreaHectares: areaNum,
          latitude,
          longitude,
        });
        if (success) {
          showSuccess(t('farm.farmUpdated'));
          navigation.goBack();
        } else {
          showError(t('farm.farmUpdateFailed'));
        }
      } else {
        const newFarm = await addFarm({
          name: trimmedName,
          totalAreaHectares: areaNum,
          latitude,
          longitude,
        });
        if (newFarm) {
          showSuccess(t('farm.farmAdded'));
          navigation.goBack();
        } else {
          showError(t('farm.farmAddFailed'));
        }
      }
    } catch {
      showError(t('farm.farmAddFailed'));
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
        title={isEdit ? t('farm.editFarm') : t('farm.newFarm')}
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

      {/* Farm Name */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('farm.farmName')}</Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            testID="farm-name"
            style={[styles.input, { color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder={t('farm.farmNamePlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            autoFocus={!isEdit}
            accessibilityLabel={t('farm.farmName')}
          />
        </View>
      </View>

      {/* Total Area */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {t('farm.totalArea')}
        </Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={area}
            onChangeText={setArea}
            placeholder={t('farm.totalAreaPlaceholder')}
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel={t('farm.totalArea')}
          />
        </View>
      </View>

      {/* Farm Location */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {t('farm.location')}
        </Text>
        {latitude !== undefined && longitude !== undefined ? (
          <View style={[styles.locationDisplay, { backgroundColor: theme.surfaceVariant }]}>
            <AppIcon name="location" size={20} color={theme.accent} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
            <TouchableOpacity onPress={handleClearLocation} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            testID="farm-location"
            onPress={handleDetectLocation}
            disabled={isLocating}
            style={[styles.locationButton, { backgroundColor: theme.surfaceVariant }]}
            activeOpacity={0.7}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <AppIcon name="navigate" size={20} color={theme.accent} />
            )}
            <Text style={[styles.locationButtonText, { color: theme.text }]}>
              {isLocating ? t('farm.detectingLocation') : t('farm.useGps')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity
          testID="farm-save"
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEdit ? t('plot.saveChanges') : t('farm.addFarm')}
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
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  locationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  locationButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
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
