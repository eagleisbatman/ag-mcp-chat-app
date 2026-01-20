/**
 * FollowUpQuestions component
 * Displays tappable follow-up question chips after bot messages
 * Uses a horizontal wrapping layout similar to StarterQuestions
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

interface FollowUpQuestionsProps {
  questions: string[];
  onQuestionTap: (question: string) => void;
  disabled?: boolean;
}

export default function FollowUpQuestions({
  questions,
  onQuestionTap,
  disabled = false,
}: FollowUpQuestionsProps): JSX.Element | null {
  const { theme } = useApp();

  if (!questions || questions.length === 0) {
    return null;
  }

  const handleTap = (question: string): void => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  const isDark = theme.name === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.chipsWrapper}>
        {questions.map((question, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
                opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
              },
            ]}
            onPress={() => handleTap(question)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={question}
            accessibilityHint="Tap to ask this question"
          >
            <Text style={[styles.chipText, { color: theme.text }]}>
              {question}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
