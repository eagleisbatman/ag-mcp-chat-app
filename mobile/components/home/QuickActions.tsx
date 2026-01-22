import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';

interface QuickActionsProps {
  onAskQuestion?: () => void;
  onTakePhoto?: () => void;
  onViewHistory?: () => void;
}

interface ActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

/**
 * QuickActions - Quick action buttons for home screen
 * Actions: Ask Question, Diagnose Plant, View History
 */
const QuickActions: React.FC<QuickActionsProps> = ({ onAskQuestion, onTakePhoto, onViewHistory }) => {
  const { theme } = useApp();

  /**
   * Handle action press with haptic feedback
   */
  const handlePress = (callback?: () => void): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    callback?.();
  };

  const actions: ActionItem[] = [
    {
      id: 'ask',
      icon: 'chatbubble-ellipses',
      label: t('home.askQuestion'),
      color: theme.accent,
      onPress: () => handlePress(onAskQuestion),
    },
    {
      id: 'diagnose',
      icon: 'camera',
      label: t('home.takePhoto'),
      color: theme.info,
      onPress: () => handlePress(onTakePhoto),
    },
    {
      id: 'history',
      icon: 'time',
      label: t('home.viewHistory'),
      color: theme.textSecondary,
      onPress: () => handlePress(onViewHistory),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        {t('home.quickActions')}
      </Text>
      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={action.onPress}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text
              style={[styles.actionLabel, { color: theme.text }]}
              numberOfLines={2}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    borderRadius: SPACING.radiusMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
  },
});

export default QuickActions;
