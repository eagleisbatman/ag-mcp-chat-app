/**
 * FarmDetailScreen — Shows farm info, plots list with crop tags.
 */

import React from 'react';
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
import type { RootStackParamList, Plot } from '../types';

interface FarmDetailScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FarmDetail'>;
  route: RouteProp<RootStackParamList, 'FarmDetail'>;
}

export default function FarmDetailScreen({ navigation, route }: FarmDetailScreenProps) {
  const { farmId } = route.params;
  const { theme } = useApp();
  const { farms, deleteFarm } = useProfile();
  const { showSuccess, showError } = useToast();

  const farm = farms.find((f) => f.id === farmId);

  if (!farm) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title="Farm"
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
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Farm not found</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Farm',
      `Are you sure you want to delete "${farm.name}"? This will also delete all plots and crop data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteFarm(farm.id);
            if (success) {
              showSuccess('Farm deleted');
              navigation.goBack();
            } else {
              showError('Failed to delete farm');
            }
          },
        },
      ]
    );
  };

  const renderPlotCard = (plot: Plot) => {
    const crops = plot.cropAllocations || [];
    return (
      <TouchableOpacity
        key={plot.id}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PlotEdit', { farmId: farm.id, plotId: plot.id })}
        style={[styles.plotCard, { backgroundColor: theme.surfaceVariant }]}
      >
        <View style={styles.plotHeader}>
          <View style={styles.plotInfo}>
            <Text style={[styles.plotName, { color: theme.text }]} numberOfLines={1}>
              {plot.name}
            </Text>
            <Text style={[styles.plotMeta, { color: theme.textMuted }]}>
              {plot.areaHectares ? `${plot.areaHectares} ha` : 'Area not set'}
              {plot.soilType ? ` · ${plot.soilType}` : ''}
              {plot.irrigationType ? ` · ${plot.irrigationType}` : ''}
            </Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color={theme.textMuted} />
        </View>

        {crops.length > 0 && (
          <View style={styles.cropRow}>
            {crops.map((c) => (
              <View
                key={c.id}
                style={[styles.cropTag, { backgroundColor: theme.accent + '15' }]}
              >
                <Text style={[styles.cropTagText, { color: theme.accent }]}>
                  {c.cropName || 'Crop'}
                  {c.status && c.status !== 'planted' ? ` [${c.status}]` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={farm.name}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel="Back"
          />
        }
        right={
          <IconButton
            icon="edit-2"
            onPress={() => navigation.navigate('FarmEdit', { farmId: farm.id })}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel="Edit farm"
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Farm summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surfaceVariant }]}>
          {farm.totalAreaHectares && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Total Area</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {farm.totalAreaHectares} hectares
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Plots</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {farm.plots?.length || 0}
            </Text>
          </View>
        </View>

        {/* Plots section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Plots</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('PlotEdit', { farmId: farm.id })}
            style={[styles.addButton, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
          >
            <AppIcon name="plus" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Plot</Text>
          </TouchableOpacity>
        </View>

        {farm.plots?.length ? (
          farm.plots.map(renderPlotCard)
        ) : (
          <View style={styles.emptyPlots}>
            <Text style={[styles.emptyPlotsText, { color: theme.textMuted }]}>
              No plots yet. Add your first plot to start tracking crops.
            </Text>
          </View>
        )}

        {/* Delete button */}
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteButton, { borderColor: theme.error }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Farm</Text>
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
  empty: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  plotCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  plotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plotInfo: {
    flex: 1,
  },
  plotName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  plotMeta: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  cropRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  cropTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cropTagText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  emptyPlots: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyPlotsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
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
