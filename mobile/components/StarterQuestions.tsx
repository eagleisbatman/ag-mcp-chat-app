/**
 * StarterQuestions component
 * Minimal tappable suggestions for empty chat state
 * Fetches personalized questions from API once on mount
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { fetchStarterQuestions, StarterQuestion } from '../services/api/starterQuestions';
import { log } from '../utils/logger';

interface StarterQuestionsProps {
  onQuestionTap: (question: string) => void;
  weatherSummary?: {
    temperature?: number;
    conditions?: string;
    hasRain?: boolean;
  };
}

export default function StarterQuestions({
  onQuestionTap,
  weatherSummary,
}: StarterQuestionsProps): JSX.Element | null {
  const { theme, location, language } = useApp();

  const [questions, setQuestions] = useState<StarterQuestion[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch once when location is available
  useEffect(() => {
    if (hasFetched) return;

    async function loadQuestions() {
      log('📋 [StarterQuestions] Fetching...');
      try {
        const result = await fetchStarterQuestions({
          latitude: location?.latitude,
          longitude: location?.longitude,
          language: language?.code,
          weatherSummary,
        });
        log('📋 [StarterQuestions] Got', result.length, 'questions');
        setQuestions(result.slice(0, 3));
        setHasFetched(true);
      } catch (error) {
        log('❌ [StarterQuestions] Failed:', error);
        setHasFetched(true); // Don't retry on error
      }
    }

    loadQuestions();
  }, [hasFetched, location?.latitude, location?.longitude, language?.code, weatherSummary]);

  const handleTap = (question: string): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  // Don't render if no questions yet
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
