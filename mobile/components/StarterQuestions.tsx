/**
 * StarterQuestions component
 * Full-width tappable cards for empty chat state
 * Displays personalized suggested questions fetched from API
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
  const isDark = theme.name === 'dark';

  // Start empty - wait for API
  const [questions, setQuestions] = useState<StarterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch personalized questions on mount
  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      log('📋 [StarterQuestions] Starting fetch...');
      setIsLoading(true);

      try {
        const personalizedQuestions = await fetchStarterQuestions({
          latitude: location?.latitude,
          longitude: location?.longitude,
          language: language?.code,
          weatherSummary,
        });

        log('📋 [StarterQuestions] Received questions:', personalizedQuestions.length);

        if (isMounted && personalizedQuestions.length > 0) {
          setQuestions(personalizedQuestions);
        }
      } catch (error) {
        log('❌ [StarterQuestions] Failed to load:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [location?.latitude, location?.longitude, language?.code, weatherSummary]);

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
      <Text style={[styles.title, { color: theme.textMuted }]}>
        Try asking about...
      </Text>
      <View style={styles.cardsContainer}>
        {questions.map((q, index) => (
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
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={() => handleTap(q.text)}
            accessibilityRole="button"
            accessibilityLabel={q.text}
            accessibilityHint="Tap to ask this question"
          >
            <Text
              style={[styles.cardText, { color: theme.text }]}
              numberOfLines={2}
            >
              {q.text}
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
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
    marginBottom: SPACING.md,
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
