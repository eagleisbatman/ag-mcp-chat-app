/**
 * PlotEditScreen — Create or edit a plot with crop allocations.
 * farmId is always required. plotId = edit, undefined = create.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
import CropPicker from '../components/farm/CropPicker';
import {
  createPlot,
  updatePlot,
  deletePlot,
  allocateCrop,
  updateCropAllocation,
  removeCropAllocation,
} from '../services/db';
import type { RootStackParamList, Plot, CropAllocation, MasterCrop } from '../types';

interface PlotEditScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PlotEdit'>;
  route: RouteProp<RootStackParamList, 'PlotEdit'>;
}

const SOIL_TYPES = ['clay', 'sandy', 'loam', 'silt', 'black cotton', 'red'];
const IRRIGATION_TYPES: Array<{ value: Plot['irrigationType']; label: string }> = [
  { value: 'rainfed', label: 'Rainfed' },
  { value: 'irrigated', label: 'Irrigated' },
  { value: 'mixed', label: 'Mixed' },
];
const CROP_STATUSES: CropAllocation['status'][] = ['planned', 'planted', 'growing', 'flowering', 'harvested', 'active'];

export default function PlotEditScreen({ navigation, route }: PlotEditScreenProps) {
  const { farmId, plotId } = route.params;
  const isEdit = !!plotId;
  const { theme } = useApp();
  const { farms, refreshFarms } = useProfile();
  const { showSuccess, showError } = useToast();

  const farm = farms.find((f) => f.id === farmId);
  const existing = farm?.plots?.find((p) => p.id === plotId);

  const [name, setName] = useState(existing?.name || '');
  const [area, setArea] = useState(existing?.areaHectares?.toString() || '');
  const [soilType, setSoilType] = useState(existing?.soilType || '');
  const [irrigationType, setIrrigationType] = useState(existing?.irrigationType || '');
  const [crops, setCrops] = useState<CropAllocation[]>(existing?.cropAllocations || []);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError('Please enter a plot name');
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

      if (isEdit && plotId) {
        const result = await updatePlot(plotId, {
          name: trimmedName,
          areaHectares: areaNum,
          soilType: soilType || undefined,
          irrigationType: (irrigationType as Plot['irrigationType']) || undefined,
        });
        if (result.success) {
          showSuccess('Plot updated');
          await refreshFarms();
          navigation.goBack();
        } else {
          showError('Failed to update plot');
        }
      } else {
        const result = await createPlot(farmId, {
          name: trimmedName,
          areaHectares: areaNum,
          soilType: soilType || undefined,
          irrigationType: (irrigationType as Plot['irrigationType']) || undefined,
        });
        if (result.success) {
          showSuccess('Plot added');
          await refreshFarms();
          navigation.goBack();
        } else {
          showError('Failed to add plot');
        }
      }
    } catch {
      showError('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlot = () => {
    if (!plotId) return;
    Alert.alert('Delete Plot', `Delete "${existing?.name || 'this plot'}" and all its crop data?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deletePlot(plotId);
          if (result.success) {
            showSuccess('Plot deleted');
            await refreshFarms();
            navigation.goBack();
          } else {
            showError('Failed to delete plot');
          }
        },
      },
    ]);
  };

  const handleAddCrop = useCallback(
    async (crop: MasterCrop) => {
      if (!plotId) {
        // For new plots, just track locally — they'll be saved when the plot is created
        showError('Please save the plot first, then add crops');
        return;
      }
      const result = await allocateCrop(plotId, {
        cropId: crop.id,
        status: 'planted',
      });
      if (result.success && result.data) {
        setCrops((prev) => [...prev, result.data as CropAllocation]);
        await refreshFarms();
      } else {
        showError('Failed to add crop');
      }
    },
    [plotId, refreshFarms, showError]
  );

  const handleRemoveCrop = useCallback(
    async (allocationId: string) => {
      const result = await removeCropAllocation(allocationId);
      if (result.success) {
        setCrops((prev) => prev.filter((c) => c.id !== allocationId));
        await refreshFarms();
      } else {
        showError('Failed to remove crop');
      }
    },
    [refreshFarms, showError]
  );

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={isEdit ? 'Edit Plot' : 'New Plot'}
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

        {/* Plot Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Plot Name</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Plot A"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
              autoFocus={!isEdit}
            />
          </View>
        </View>

        {/* Area */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Area (hectares, optional)</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={area}
              onChangeText={setArea}
              placeholder="e.g. 0.5"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Soil Type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Soil Type</Text>
          <View style={styles.chipRow}>
            {SOIL_TYPES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSoilType(soilType === s ? '' : s)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: soilType === s ? theme.accent + '20' : theme.surfaceVariant,
                    borderColor: soilType === s ? theme.accent : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: soilType === s ? theme.accent : theme.text }]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Irrigation */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Irrigation</Text>
          <View style={styles.chipRow}>
            {IRRIGATION_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setIrrigationType(irrigationType === opt.value ? '' : opt.value!)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: irrigationType === opt.value ? theme.accent + '20' : theme.surfaceVariant,
                    borderColor: irrigationType === opt.value ? theme.accent : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: irrigationType === opt.value ? theme.accent : theme.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Crops — only in edit mode */}
        {isEdit && (
          <View style={styles.section}>
            <View style={styles.cropHeader}>
              <Text style={[styles.label, { color: theme.textMuted, marginBottom: 0 }]}>
                Crops
              </Text>
              <TouchableOpacity
                onPress={() => setShowCropPicker(true)}
                style={[styles.addCropBtn, { backgroundColor: theme.accent }]}
                activeOpacity={0.8}
              >
                <AppIcon name="plus" size={14} color="#fff" />
                <Text style={styles.addCropBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {crops.length > 0 ? (
              <View style={styles.cropList}>
                {crops.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.cropItem, { backgroundColor: theme.surfaceVariant }]}
                  >
                    <View style={styles.cropItemInfo}>
                      <Text style={[styles.cropItemName, { color: theme.text }]}>
                        {c.cropName || 'Crop'}
                      </Text>
                      <View style={styles.cropStatusRow}>
                        {CROP_STATUSES.map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={async () => {
                              const result = await updateCropAllocation(c.id, { status: s });
                              if (result.success) {
                                setCrops((prev) =>
                                  prev.map((crop) =>
                                    crop.id === c.id ? { ...crop, status: s } : crop
                                  )
                                );
                              } else {
                                showError('Failed to update crop status');
                              }
                            }}
                            style={[
                              styles.statusChip,
                              {
                                backgroundColor:
                                  c.status === s ? theme.accent + '20' : 'transparent',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                { color: c.status === s ? theme.accent : theme.textMuted },
                              ]}
                            >
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveCrop(c.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <AppIcon name="close" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noCropsText, { color: theme.textMuted }]}>
                No crops allocated yet
              </Text>
            )}
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
                {isEdit ? 'Save Changes' : 'Add Plot'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Delete Button — edit only */}
        {isEdit && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={handleDeletePlot}
              style={[styles.deleteButton, { borderColor: theme.error }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Plot</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CropPicker
        visible={showCropPicker}
        onClose={() => setShowCropPicker(false)}
        onSelect={handleAddCrop}
        excludeIds={crops.map((c) => c.cropId)}
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
  inputWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    fontSize: TYPOGRAPHY.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    gap: 4,
  },
  addCropBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  cropList: {
    gap: SPACING.sm,
  },
  cropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
  },
  cropItemInfo: {
    flex: 1,
  },
  cropItemName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  cropStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
    gap: 4,
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  noCropsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
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
  deleteButton: {
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
