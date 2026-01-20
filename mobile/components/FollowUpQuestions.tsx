/**
 * FollowUpQuestions component
 * Minimal tappable suggestions displayed after bot messages
 * Matches StarterQuestions styling for consistency
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

  return (
    <View style={styles.container}>
      <View style={styles.questionsContainer}>
        {questions.slice(0, 3).map((question, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.questionRow,
              { opacity: disabled ? 0.5 : pressed ? 0.6 : 1 },
            ]}
            onPress={() => handleTap(question)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={question}
            accessibilityHint="Tap to ask this question"
          >
            <Text
              style={[styles.questionText, { color: theme.text }]}
              numberOfLines={2}
            >
              {question}
            </Text>
            <AppIcon
              name="chevron-forward"
              size={16}
              color={theme.textMuted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  questionsContainer: {
    gap: SPACING.xs,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  questionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: 22,
  },
});
