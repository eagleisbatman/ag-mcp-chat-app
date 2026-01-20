/**
 * StarterQuestions component
 * Reddit-style flowing chips for empty chat state
 * Displays suggested questions in a horizontally wrapping layout
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

// Agriculture-focused starter questions with emojis
const STARTER_QUESTIONS = [
  { emoji: '🌾', text: 'Best rice varieties' },
  { emoji: '🌧️', text: 'Weather for spraying' },
  { emoji: '🐛', text: 'Pest control tips' },
  { emoji: '🌱', text: 'When to plant maize' },
  { emoji: '💧', text: 'Irrigation schedule' },
  { emoji: '🧪', text: 'Soil testing guide' },
  { emoji: '🍅', text: 'Tomato diseases' },
  { emoji: '🌿', text: 'Organic fertilizers' },
  { emoji: '☀️', text: 'Heat stress signs' },
  { emoji: '🥔', text: 'Potato blight cure' },
  { emoji: '🌽', text: 'Maize storage tips' },
  { emoji: '🐄', text: 'Cattle feed guide' },
  { emoji: '🌻', text: 'Crop rotation plan' },
  { emoji: '💰', text: 'Market prices today' },
  { emoji: '🌾', text: 'Wheat sowing time' },
];

interface StarterQuestionsProps {
  onQuestionTap: (question: string) => void;
}

export default function StarterQuestions({
  onQuestionTap,
}: StarterQuestionsProps): JSX.Element {
  const { theme } = useApp();
  const isDark = theme.name === 'dark';

  const handleTap = (question: string): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuestionTap(question);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textMuted }]}>
        Try asking about...
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.chipsContainer}>
          {/* Row 1 */}
          <View style={styles.row}>
            {STARTER_QUESTIONS.slice(0, 5).map((q, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleTap(`${q.emoji} ${q.text}`)}
              >
                <Text style={styles.emoji}>{q.emoji}</Text>
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {q.text}
                </Text>
              </Pressable>
            ))}
          </View>
          {/* Row 2 */}
          <View style={styles.row}>
            {STARTER_QUESTIONS.slice(5, 10).map((q, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleTap(`${q.emoji} ${q.text}`)}
              >
                <Text style={styles.emoji}>{q.emoji}</Text>
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {q.text}
                </Text>
              </Pressable>
            ))}
          </View>
          {/* Row 3 */}
          <View style={styles.row}>
            {STARTER_QUESTIONS.slice(10, 15).map((q, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleTap(`${q.emoji} ${q.text}`)}
              >
                <Text style={styles.emoji}>{q.emoji}</Text>
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {q.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  chipsContainer: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
