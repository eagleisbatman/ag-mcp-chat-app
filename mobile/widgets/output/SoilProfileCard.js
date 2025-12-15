/**
 * SoilProfileCard - Visually appealing soil data display
 *
 * Design: Brown/earth gradient (soil theme)
 * - pH display as main metric
 * - Nutrient bars
 * - Texture composition
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';

// Get status color for nutrient level
const getNutrientColor = (value, low, high) => {
  if (value < low) return '#FF9800'; // Low - orange
  if (value > high) return '#2196F3'; // High - blue
  return '#4CAF50'; // Adequate - green
};

function NutrientBar({ label, value, unit, low, high }) {
  const color = getNutrientColor(value, low, high);
  const percent = Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));

  return (
    <View style={styles.nutrientItem}>
      <View style={styles.nutrientHeader}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientValue}>
          {value?.toFixed(2) || '-'} {unit}
        </Text>
      </View>
      <View style={styles.nutrientBarBg}>
        <View style={[styles.nutrientBarFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function SoilProfileCard({ data = {} }) {
  const { theme } = useApp();

  const { location, depth, properties = {}, texture = {} } = data;

  if (!properties || Object.keys(properties).length === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceVariant }]}>
        <AppIcon name="layers" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Soil data unavailable
        </Text>
      </View>
    );
  }

  // pH color based on value
  const pHColor = properties.pH < 5.5 ? '#FF9800' : properties.pH > 7.5 ? '#2196F3' : '#4CAF50';
  const pHStatus = properties.pH < 5.5 ? 'Acidic' : properties.pH > 7.5 ? 'Alkaline' : 'Neutral';

  return (
    <LinearGradient colors={['#5D4037', '#6D4C41', '#795548']} style={styles.container}>
      {/* Main pH Display */}
      <View style={styles.mainSection}>
        <AppIcon name="layers" size={48} color="#FFFFFF" />
        <View style={styles.phContainer}>
          <Text style={styles.phLarge}>{properties.pH?.toFixed(1) || '?'}</Text>
          <View style={styles.phInfo}>
            <Text style={styles.phLabel}>pH</Text>
            <View style={[styles.phStatusBadge, { backgroundColor: pHColor }]}>
              <Text style={styles.phStatus}>{pHStatus}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Location & Depth */}
      <View style={styles.locationRow}>
        <AppIcon name="location" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={styles.locationText} numberOfLines={1}>
          {location?.displayName || `${location?.latitude?.toFixed(2)}°, ${location?.longitude?.toFixed(2)}°`}
        </Text>
        {depth && <Text style={styles.depthBadge}>{depth}</Text>}
      </View>

      {/* Nutrients Section */}
      <View style={styles.nutrientSection}>
        <Text style={styles.sectionLabel}>Soil Nutrients</Text>
        <NutrientBar label="Nitrogen" value={properties.nitrogen} unit="%" low={0.1} high={0.5} />
        <NutrientBar label="Phosphorus" value={properties.phosphorus} unit="ppm" low={10} high={50} />
        <NutrientBar label="Potassium" value={properties.potassium} unit="ppm" low={150} high={400} />
        <NutrientBar label="Organic Carbon" value={properties.organic_carbon} unit="%" low={1} high={3} />
      </View>

      {/* Texture Strip */}
      {(texture.sand || texture.clay || texture.silt) && (
        <View style={styles.textureSection}>
          <Text style={styles.sectionLabel}>Soil Texture</Text>
          <View style={styles.textureRow}>
            <View style={styles.textureItem}>
              <Text style={styles.textureValue}>{texture.sand?.toFixed(0) || 0}%</Text>
              <Text style={styles.textureLabel}>Sand</Text>
            </View>
            <View style={styles.textureItem}>
              <Text style={styles.textureValue}>{texture.clay?.toFixed(0) || 0}%</Text>
              <Text style={styles.textureLabel}>Clay</Text>
            </View>
            <View style={styles.textureItem}>
              <Text style={styles.textureValue}>{texture.silt?.toFixed(0) || 0}%</Text>
              <Text style={styles.textureLabel}>Silt</Text>
            </View>
          </View>
          {texture.texture_class && (
            <View style={styles.textureClassBadge}>
              <Text style={styles.textureClassText}>{texture.texture_class}</Text>
            </View>
          )}
        </View>
      )}

      {/* Attribution */}
      <Text style={styles.attribution}>iSDAsoil • 30m Resolution</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  phContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  phLarge: {
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  phInfo: {
    alignItems: 'flex-start',
  },
  phLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  phStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  phStatus: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    textAlign: 'center',
  },
  depthBadge: {
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nutrientSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  nutrientItem: {
    marginBottom: SPACING.sm,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nutrientLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  nutrientBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nutrientBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  textureSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  textureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
  },
  textureItem: {
    alignItems: 'center',
  },
  textureValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  textureLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  textureClassBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textureClassText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  attribution: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  errorContainer: {
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
