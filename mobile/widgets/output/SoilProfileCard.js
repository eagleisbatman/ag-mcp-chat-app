/**
 * SoilProfileCard - Output widget for ISDA Soil data
 *
 * Features:
 * - Location header with coordinates
 * - Soil properties table (pH, N, P, K, etc.)
 * - Confidence indicators
 * - Crop suitability indicators
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';
import DataTable from '../shared/DataTable';

// Nutrient sufficiency thresholds (simplified)
const getSufficiencyStatus = (property, value, theme) => {
  // Simplified status based on general thresholds
  const thresholds = {
    pH: { low: 5.5, high: 7.5 },
    nitrogen: { low: 0.1, high: 0.5 },
    phosphorus: { low: 10, high: 50 },
    potassium: { low: 150, high: 400 },
    organic_carbon: { low: 1, high: 3 },
  };

  const range = thresholds[property];
  if (!range || value === undefined) return null;

  if (value < range.low) return { label: 'Low', color: theme.warning };
  if (value > range.high) return { label: 'High', color: theme.info };
  return { label: 'Adequate', color: theme.success };
};

function PropertyRow({ label, value, unit, uncertainty, theme }) {
  const status = getSufficiencyStatus(label.toLowerCase().replace(' ', '_'), value, theme);

  return (
    <View style={[styles.propertyRow, { borderBottomColor: theme.border }]}>
      <View style={styles.propertyInfo}>
        <Text style={[styles.propertyLabel, { color: theme.text }]}>{label}</Text>
        {uncertainty !== undefined && (
          <Text style={[styles.uncertainty, { color: theme.textMuted }]}>
            ±{uncertainty.toFixed(2)}
          </Text>
        )}
      </View>
      <View style={styles.propertyValue}>
        <Text style={[styles.valueText, { color: theme.text }]}>
          {typeof value === 'number' ? value.toFixed(2) : value || '-'}
          {unit && <Text style={styles.unitText}> {unit}</Text>}
        </Text>
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SoilProfileCard({ data = {} }) {
  const { theme } = useApp();

  const { location, depth, properties = {}, texture = {} } = data;

  if (!properties || Object.keys(properties).length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          No soil data available for this location
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppIcon name="layers" size={24} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>Soil Profile</Text>
      </View>

      {/* Location info */}
      {location && (
        <View style={[styles.locationBox, { backgroundColor: theme.surfaceVariant }]}>
          <AppIcon name="location" size={16} color={theme.accent} />
          <Text style={[styles.locationText, { color: theme.text }]}>
            {location.displayName || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`}
          </Text>
          {depth && (
            <Text style={[styles.depthBadge, { backgroundColor: theme.accentLight, color: theme.accent }]}>
              {depth}
            </Text>
          )}
        </View>
      )}

      {/* Soil Properties */}
      <ScrollView style={styles.propertiesList} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Chemical Properties
        </Text>

        <PropertyRow
          label="pH"
          value={properties.pH}
          uncertainty={properties.pH_uncertainty}
          theme={theme}
        />
        <PropertyRow
          label="Nitrogen"
          value={properties.nitrogen}
          unit="%"
          uncertainty={properties.nitrogen_uncertainty}
          theme={theme}
        />
        <PropertyRow
          label="Phosphorus"
          value={properties.phosphorus}
          unit="ppm"
          uncertainty={properties.phosphorus_uncertainty}
          theme={theme}
        />
        <PropertyRow
          label="Potassium"
          value={properties.potassium}
          unit="ppm"
          uncertainty={properties.potassium_uncertainty}
          theme={theme}
        />
        <PropertyRow
          label="Organic Carbon"
          value={properties.organic_carbon}
          unit="%"
          uncertainty={properties.organic_carbon_uncertainty}
          theme={theme}
        />

        {/* Texture */}
        {(texture.sand || texture.clay || texture.silt) && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: SPACING.md }]}>
              Soil Texture
            </Text>
            <PropertyRow label="Sand" value={texture.sand} unit="%" theme={theme} />
            <PropertyRow label="Clay" value={texture.clay} unit="%" theme={theme} />
            <PropertyRow label="Silt" value={texture.silt} unit="%" theme={theme} />
            {texture.texture_class && (
              <View style={[styles.textureClass, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.textureClassText, { color: theme.accent }]}>
                  {texture.texture_class}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Data source */}
      <Text style={[styles.sourceText, { color: theme.textMuted }]}>
        Data: iSDAsoil | 30m resolution
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: SPACING.radiusMd,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    padding: SPACING.sm,
    borderRadius: SPACING.radiusSm,
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
  },
  depthBadge: {
    fontSize: TYPOGRAPHY.sizes.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: SPACING.radiusFull,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  propertiesList: {
    maxHeight: 350,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  uncertainty: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  propertyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  valueText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  unitText: {
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: SPACING.radiusFull,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  textureClass: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusMd,
    marginTop: SPACING.sm,
  },
  textureClassText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  sourceText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    padding: SPACING.sm,
  },
  errorText: {
    padding: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
