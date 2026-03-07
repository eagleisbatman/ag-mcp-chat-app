/**
 * FollowUpQuestions component
 * Minimal tappable suggestions displayed after bot messages
 * Matches StarterQuestions styling for consistency
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import { t } from '../constants/strings';

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

  // Animation refs for smooth fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef(
    [0, 1, 2].map(() => new Animated.Value(10))
  ).current;

  // Animate on mount with stagger effect
  useEffect(() => {
    if (questions && questions.length > 0) {
      // Fade in the container
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();

      // Stagger slide-up animations for each row
      const staggerAnimations = slideAnims.slice(0, Math.min(questions.length, 3)).map((anim, index) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 150,
          delay: index * 30, // 30ms stagger between each row
          useNativeDriver: true,
        })
      );

      Animated.parallel(staggerAnimations).start();
    }
  }, [questions, fadeAnim, slideAnims]);

  if (!questions || questions.length === 0) {
    return null;
  }

  const handleTap = (question: string): void => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={[styles.headerText, { color: theme.textMuted }]}>
        {t('chat.followUpQuestionsHeader')}
      </Text>
      <View style={styles.questionsContainer}>
        {questions.slice(0, 3).map((question, index) => (
          <Animated.View
            key={index}
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnims[index] }],
            }}
          >
            <Pressable
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
              <View style={[styles.askButton, { backgroundColor: theme.accent }]}>
                <Text style={styles.askButtonText}>{t('chat.askButton')}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  headerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.sm,
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
  askButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  askButtonText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
});
