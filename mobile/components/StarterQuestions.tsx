/**
 * StarterQuestions component
 * Minimal tappable suggestions for empty chat state
 * Fetches personalized questions from API once on mount
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { fetchStarterQuestions, StarterQuestion } from '../services/api/starterQuestions';
import { log } from '../utils/logger';
import { t } from '../constants/strings';

interface StarterQuestionsProps {
  onQuestionTap: (question: string) => void;
}

export default function StarterQuestions({
  onQuestionTap,
}: StarterQuestionsProps): JSX.Element | null {
  const { theme, location, language, locationDetails } = useApp();

  const [questions, setQuestions] = useState<StarterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch once on mount - backend handles weather and time calculation
  useEffect(() => {
    if (hasFetched) return;

    async function loadQuestions() {
      log('📋 [StarterQuestions] Component mounted, starting fetch...');
      setIsLoading(true);
      try {
        const result = await fetchStarterQuestions({
          latitude: location?.latitude,
          longitude: location?.longitude,
          language: language?.code,
          country: locationDetails?.level1Country,
        });
        log('📋 [StarterQuestions] Got', result.length, 'questions');
        setQuestions(result.slice(0, 3));

        // Fade in when questions are loaded
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        log('❌ [StarterQuestions] Failed:', error);
      } finally {
        setIsLoading(false);
        setHasFetched(true);
      }
    }

    loadQuestions();
  }, [hasFetched, location?.latitude, location?.longitude, language?.code, fadeAnim]);

  const handleTap = (question: string): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  // Show placeholder while loading (no spinner - cleaner UX)
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.headerText, { color: theme.textMuted }]}>
          {t('chat.starterQuestionsLoading')}
        </Text>
      </View>
    );
  }

  // Don't render if no questions
  if (questions.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={[styles.headerText, { color: theme.textMuted }]}>
        {t('chat.starterQuestionsHeader')}
      </Text>
      <View style={styles.questionsContainer}>
        {questions.map((q, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.questionRow,
              {
                backgroundColor: pressed ? theme.surfaceVariant : theme.surface,
                borderColor: theme.border,
              },
            ]}
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
            <AppIcon
              name="chevron-forward"
              size={16}
              color={theme.textMuted}
            />
          </Pressable>
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
});
