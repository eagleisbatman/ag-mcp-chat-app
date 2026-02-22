import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import type { RationFlowStep } from '../../types';

interface RationFlowRendererProps {
  flowStep: RationFlowStep;
}

/**
 * Renders a RationSmart flow step using localized strings + structured data.
 * Handles numbered lists (breeds, cows), parameter interpolation, and rich text from backend.
 */
export default function RationFlowRenderer({ flowStep }: RationFlowRendererProps): JSX.Element {
  const { theme } = useApp();
  const { messageKey, data } = flowStep;

  // Resolve the localized message with parameter interpolation
  const params: Record<string, string | number> = {};
  if (data?.min != null) params.min = data.min as number;
  if (data?.max != null) params.max = data.max as number;
  const message = t(messageKey, Object.keys(params).length > 0 ? params : undefined);

  // Build content blocks
  const blocks: JSX.Element[] = [];

  // Main message
  blocks.push(
    <Text key="msg" style={[styles.message, { color: theme.text }]}>
      {message}
    </Text>
  );

  // Numbered cow list
  if (data?.cows && Array.isArray(data.cows)) {
    const cows = data.cows as Array<{ name: string; id: string }>;
    if (cows.length > 0) {
      blocks.push(
        <View key="cows" style={styles.list}>
          {cows.map((cow, idx) => (
            <Text key={cow.id} style={[styles.listItem, { color: theme.text }]}>
              {idx + 1}. {cow.name}
            </Text>
          ))}
        </View>
      );
      blocks.push(
        <Text key="cow-prompt" style={[styles.hint, { color: theme.textSecondary }]}>
          {t('ration.selectCowPrompt')}
        </Text>
      );
    }
  }

  // Numbered breed list
  if (data?.breeds && Array.isArray(data.breeds)) {
    const breeds = data.breeds as string[];
    if (breeds.length > 0) {
      blocks.push(
        <View key="breeds" style={styles.list}>
          {breeds.map((breed, idx) => (
            <Text key={breed} style={[styles.listItem, { color: theme.text }]}>
              {idx + 1}. {breed}
            </Text>
          ))}
        </View>
      );
      blocks.push(
        <Text key="breed-prompt" style={[styles.hint, { color: theme.textSecondary }]}>
          {t('ration.selectBreedPrompt')}
        </Text>
      );
    }
  }

  // Rich text from backend (diet, schedule, history, follow confirmation)
  const richTextFields = ['dietText', 'scheduleText', 'historyText', 'followText', 'stopText'] as const;
  for (const field of richTextFields) {
    if (data?.[field] && typeof data[field] === 'string') {
      blocks.push(
        <Text key={field} style={[styles.richText, { color: theme.text }]}>
          {data[field] as string}
        </Text>
      );
    }
  }

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.5,
  },
  list: {
    marginTop: SPACING.xs,
    marginStart: SPACING.sm,
    gap: 2,
  },
  listItem: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.4,
  },
  hint: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  richText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * 1.5,
    marginTop: SPACING.xs,
  },
});
