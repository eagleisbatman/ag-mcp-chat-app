/**
 * FollowUpQuestions component
 * Full-width tappable cards displayed after bot messages
 * Displays follow-up questions in a vertical stack layout
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
      <View style={styles.cardsContainer}>
        {questions.map((question, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.03)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.08)',
                opacity: disabled ? 0.5 : 1,
                transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
              },
            ]}
            onPress={() => handleTap(question)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={question}
            accessibilityHint="Tap to ask this question"
          >
            <Text
              style={[styles.cardText, { color: theme.text }]}
              numberOfLines={2}
            >
              {question}
            </Text>
            <AppIcon
              name="arrow-forward"
              size={18}
              color={theme.textMuted}
              style={styles.arrow}
            />
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
  cardsContainer: {
    gap: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  cardText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    lineHeight: 20,
  },
  arrow: {
    opacity: 0.5,
  },
});
