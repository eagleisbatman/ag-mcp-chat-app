/**
 * FeedFormulationWidget - Multi-step form for cattle diet calculation
 *
 * Step 1: Basic Info (lactating, milk target, body weight)
 * Step 2: Cattle Details (breed, days in milk, parity, pregnancy)
 * Step 3: Feed Selection (search and select feeds with prices)
 * Step 4: Confirm & Calculate
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../../components/ui/AppIcon';
import ToggleSwitch from '../shared/ToggleSwitch';
import SliderInput from '../shared/SliderInput';
import NumberInput from '../shared/NumberInput';
import DropdownSelector from '../shared/DropdownSelector';
import ActionButton from '../shared/ActionButton';
import ChipSelector from '../shared/ChipSelector';

// Ethiopian cattle breeds
const BREED_OPTIONS = [
  { value: 'local', label: 'Local/Indigenous' },
  { value: 'crossbred', label: 'Crossbred' },
  { value: 'holstein', label: 'Holstein Friesian' },
  { value: 'jersey', label: 'Jersey' },
  { value: 'zebu', label: 'Zebu' },
];

// Ethiopian defaults for simplification
const ETHIOPIAN_DEFAULTS = {
  temperature: 20, // Average Ethiopian highlands
  topography: 'highland', // Most dairy in highlands
  distance: 2, // Average walking distance km
  calving_interval: 450, // Days
  fat_milk: 3.5, // Milk fat %
  tp_milk: 3.2, // Milk protein %
};

// Body weight presets
const WEIGHT_PRESETS = [
  { value: 300, label: '300 kg' },
  { value: 350, label: '350 kg' },
  { value: 400, label: '400 kg' },
  { value: 450, label: '450 kg' },
];

function StepIndicator({ currentStep, totalSteps, theme }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View key={index} style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: index <= currentStep ? theme.accent : theme.surfaceVariant,
              },
            ]}
          >
            {index < currentStep ? (
              <AppIcon name="checkmark" size={12} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepNumber, { color: index === currentStep ? '#FFFFFF' : theme.textMuted }]}>
                {index + 1}
              </Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: index < currentStep ? theme.accent : theme.surfaceVariant },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function Step1BasicInfo({ formData, setFormData, theme }) {
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Basic Information</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        Tell us about your cattle
      </Text>

      <ToggleSwitch
        label="Is the cattle lactating?"
        value={formData.lactating}
        onValueChange={(v) => setFormData({ ...formData, lactating: v })}
        trueLabel="Yes"
        falseLabel="No"
      />

      {formData.lactating && (
        <SliderInput
          label="Target Milk Production"
          value={formData.milk_production}
          onValueChange={(v) => setFormData({ ...formData, milk_production: v })}
          minimumValue={5}
          maximumValue={25}
          step={1}
          unit="L/day"
        />
      )}

      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Body Weight</Text>
      <ChipSelector
        options={WEIGHT_PRESETS}
        selectedValue={formData.body_weight}
        onSelect={(v) => setFormData({ ...formData, body_weight: v })}
      />
      <NumberInput
        label="Or enter custom weight"
        value={formData.body_weight}
        onChangeValue={(v) => setFormData({ ...formData, body_weight: parseFloat(v) || 350 })}
        unit="kg"
        min={200}
        max={700}
      />
    </View>
  );
}

function Step2Details({ formData, setFormData, theme }) {
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Cattle Details</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        Optional details for more accurate recommendations
      </Text>

      <DropdownSelector
        label="Breed"
        options={BREED_OPTIONS}
        selectedValue={formData.breed}
        onSelect={(v) => setFormData({ ...formData, breed: v })}
        placeholder="Select breed..."
      />

      {formData.lactating && (
        <>
          <SliderInput
            label="Days in Milk"
            value={formData.days_in_milk}
            onValueChange={(v) => setFormData({ ...formData, days_in_milk: Math.round(v) })}
            minimumValue={0}
            maximumValue={400}
            step={10}
            unit="days"
          />

          <SliderInput
            label="Lactation Number (Parity)"
            value={formData.parity}
            onValueChange={(v) => setFormData({ ...formData, parity: Math.round(v) })}
            minimumValue={1}
            maximumValue={10}
            step={1}
          />
        </>
      )}

      <SliderInput
        label="Days Pregnant"
        value={formData.days_of_pregnancy}
        onValueChange={(v) => setFormData({ ...formData, days_of_pregnancy: Math.round(v) })}
        minimumValue={0}
        maximumValue={280}
        step={10}
        unit="days"
      />
    </View>
  );
}

function Step3Summary({ formData, theme }) {
  const SummaryRow = ({ label, value }) => (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Confirm & Calculate</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        Review your inputs before calculating
      </Text>

      <View style={[styles.summaryCard, { backgroundColor: theme.surfaceVariant }]}>
        <SummaryRow label="Lactating" value={formData.lactating ? 'Yes' : 'No'} />
        {formData.lactating && (
          <SummaryRow label="Target Milk" value={`${formData.milk_production} L/day`} />
        )}
        <SummaryRow label="Body Weight" value={`${formData.body_weight} kg`} />
        <SummaryRow label="Breed" value={BREED_OPTIONS.find(b => b.value === formData.breed)?.label || 'Local'} />
        {formData.lactating && (
          <>
            <SummaryRow label="Days in Milk" value={`${formData.days_in_milk} days`} />
            <SummaryRow label="Parity" value={formData.parity} />
          </>
        )}
        <SummaryRow label="Days Pregnant" value={`${formData.days_of_pregnancy} days`} />
      </View>

      <Text style={[styles.note, { color: theme.textMuted }]}>
        Ethiopian conditions (highland climate, local feed availability) will be applied.
      </Text>
    </View>
  );
}

export default function FeedFormulationWidget({ onSubmit, data = {} }) {
  const { theme } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    lactating: data.lactating ?? true,
    milk_production: data.milk_production || 12,
    body_weight: data.body_weight || 350,
    breed: data.breed || 'crossbred',
    days_in_milk: data.days_in_milk || 90,
    parity: data.parity || 2,
    days_of_pregnancy: data.days_of_pregnancy || 0,
    // Ethiopian defaults (hidden from user)
    ...ETHIOPIAN_DEFAULTS,
  });

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit({
      widget_type: 'feed_formulation_input',
      data: {
        cattle_info: formData,
        // Request diet recommendation
        action: 'get_diet_recommendation',
      },
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1BasicInfo formData={formData} setFormData={setFormData} theme={theme} />;
      case 1:
        return <Step2Details formData={formData} setFormData={setFormData} theme={theme} />;
      case 2:
        return <Step3Summary formData={formData} theme={theme} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Feed Calculator</Text>

      <StepIndicator currentStep={currentStep} totalSteps={totalSteps} theme={theme} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.buttonRow}>
        {currentStep > 0 && (
          <ActionButton
            label="Back"
            icon="arrow-back"
            onPress={handleBack}
            variant="outline"
            fullWidth={false}
          />
        )}
        <View style={styles.spacer} />
        {currentStep < totalSteps - 1 ? (
          <ActionButton
            label="Next"
            icon="arrow-forward"
            onPress={handleNext}
            fullWidth={false}
          />
        ) : (
          <ActionButton
            label="Calculate Diet"
            icon="calculator"
            onPress={handleSubmit}
            fullWidth={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    borderRadius: SPACING.radiusMd,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: SPACING.xs,
  },
  scrollContent: {
    maxHeight: 350,
  },
  stepContent: {
    paddingBottom: SPACING.lg,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  note: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  spacer: {
    flex: 1,
  },
});
