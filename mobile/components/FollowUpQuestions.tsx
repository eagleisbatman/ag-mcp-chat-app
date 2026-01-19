/**
 * FollowUpQuestions component
 * Displays tappable follow-up question buttons after bot messages
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';

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
      {questions.map((question, index) => (
        <Pressable
          key={index}
          style={({ pressed }) => [
            styles.questionButton,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(0, 0, 0, 0.08)',
              opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
            },
          ]}
          onPress={() => handleTap(question)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={question}
          accessibilityHint="Tap to ask this question"
        >
          <AppIcon
            name="message-circle"
            size={14}
            color={theme.accent}
            prefer="feather"
          />
          <Text
            style={[styles.questionText, { color: theme.text }]}
            numberOfLines={2}
          >
            {question}
          </Text>
          <AppIcon
            name="chevron-right"
            size={14}
            color={theme.textMuted}
            prefer="feather"
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  questionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  questionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
  },
});
