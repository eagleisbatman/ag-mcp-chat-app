/**
 * StarterQuestions component
 * Minimal tappable suggestions for empty chat state
 * Fetches personalized questions from API once on mount
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { fetchStarterQuestions, StarterQuestion } from '../services/api/starterQuestions';
import { log } from '../utils/logger';

interface StarterQuestionsProps {
  onQuestionTap: (question: string) => void;
}

export default function StarterQuestions({
  onQuestionTap,
}: StarterQuestionsProps): JSX.Element | null {
  const { theme, location, language } = useApp();

  const [questions, setQuestions] = useState<StarterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

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
        });
        log('📋 [StarterQuestions] Got', result.length, 'questions');
        setQuestions(result.slice(0, 3));
      } catch (error) {
        log('❌ [StarterQuestions] Failed:', error);
      } finally {
        setIsLoading(false);
        setHasFetched(true);
      }
    }

    loadQuestions();
  }, [hasFetched, location?.latitude, location?.longitude, language?.code]);

  const handleTap = (question: string): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  // Show loading spinner while fetching
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.textMuted} />
      </View>
    );
  }

  // Don't render if no questions
  if (questions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.questionsContainer}>
        {questions.map((q, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.questionRow,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => handleTap(q.text)}
            accessibilityRole="button"
            accessibilityLabel={q.text}
            accessibilityHint="Tap to ask this question"
          >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
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
