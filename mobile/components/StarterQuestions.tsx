/**
 * StarterQuestions component
 * Minimal tappable suggestions for empty chat state
 * Prop-driven: receives questions and loading state from parent hook
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import type { StarterQuestion } from '../services/api/starterQuestions';
import { t } from '../constants/strings';

/**
 * Skeleton loading placeholder with pulsing animation
 */
const SkeletonRow: React.FC<{ theme: any; index: number }> = ({ theme, index }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, index]);

  return (
    <Animated.View
      style={[
        styles.skeletonRow,
        { backgroundColor: theme.surfaceVariant, opacity: pulseAnim },
      ]}
    >
      <View style={[styles.skeletonEmoji, { backgroundColor: theme.border }]} />
      <View style={styles.skeletonTextContainer}>
        <View style={[styles.skeletonTextLine, { backgroundColor: theme.border, width: '85%' }]} />
        <View style={[styles.skeletonTextLine, { backgroundColor: theme.border, width: '60%' }]} />
      </View>
    </Animated.View>
  );
};

interface StarterQuestionsProps {
  questions: StarterQuestion[];
  isLoading: boolean;
  onQuestionTap: (question: string) => void;
}

export default function StarterQuestions({
  questions,
  isLoading,
  onQuestionTap,
}: StarterQuestionsProps): JSX.Element | null {
  const { theme } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in when questions arrive
  useEffect(() => {
    if (questions.length > 0 && !isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [questions.length, isLoading, fadeAnim]);

  const handleTap = (question: string): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  // Show skeleton loading state
  if (isLoading && questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingHeader}>
          <ActivityIndicator size="small" color={theme.accent} style={styles.loadingSpinner} />
          <Text style={[styles.headerText, { color: theme.textMuted }]}>
            {t('chat.starterQuestionsLoading')}
          </Text>
        </View>
        <View style={styles.questionsContainer}>
          {[0, 1, 2].map((index) => (
            <SkeletonRow key={index} theme={theme} index={index} />
          ))}
        </View>
      </View>
    );
  }

  // Don't render if no questions
  if (questions.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={[styles.headerText, styles.headerTextStandalone, { color: theme.textMuted }]}>
        {t('chat.starterQuestionsHeader')}
      </Text>
      <View style={styles.questionsContainer}>
        {questions.map((q, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.questionRow,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => handleTap(q.text)}
            accessibilityRole="button"
            accessibilityLabel={q.text}
            accessibilityHint="Tap to ask this question"
          >
            <Text style={styles.emoji}>{q.emoji}</Text>
            <Text
              style={[styles.questionText, { color: theme.text }]}
              numberOfLines={2}
            >
              {q.text}
            </Text>
            <View style={[styles.askButton, { backgroundColor: theme.accent }]}>
              <Text style={styles.askButtonText}>{t('chat.askButton')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  loadingSpinner: {
    marginRight: SPACING.xs,
  },
  headerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  headerTextStandalone: {
    marginBottom: SPACING.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  skeletonEmoji: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  skeletonTextContainer: {
    flex: 1,
    gap: 6,
  },
  skeletonTextLine: {
    height: 12,
    borderRadius: 6,
  },
  questionsContainer: {
    gap: SPACING.xs,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  emoji: {
    fontSize: 18,
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
