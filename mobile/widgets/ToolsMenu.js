/**
 * ToolsMenu - Bottom sheet menu for launching widgets
 *
 * Displays all available widget tools for the user to select.
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import AppIcon from '../components/ui/AppIcon';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import { getInputWidgets, WIDGET_CATEGORIES } from './schemas/WidgetSchemas';

// Group widgets by category for organized display
const groupWidgetsByCategory = (widgets) => {
  const groups = {};
  widgets.forEach((widget) => {
    const category = widget.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(widget);
  });
  return groups;
};

// Category display names
const CATEGORY_NAMES = {
  [WIDGET_CATEGORIES.WEATHER]: 'Weather',
  [WIDGET_CATEGORIES.NUTRITION]: 'Nutrition',
  [WIDGET_CATEGORIES.SOIL]: 'Soil',
  [WIDGET_CATEGORIES.FERTILIZER]: 'Fertilizer',
  [WIDGET_CATEGORIES.CLIMATE]: 'Climate',
  [WIDGET_CATEGORIES.ADVISORY]: 'Advisory',
};

function WidgetItem({ widget, onPress, theme }) {
  return (
    <Pressable
      style={[styles.widgetItem, { backgroundColor: theme.surfaceVariant }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(widget);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${widget.name}: ${widget.description}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
        <AppIcon name={widget.icon} size={24} color={theme.accent} />
      </View>
      <View style={styles.widgetInfo}>
        <Text style={[styles.widgetName, { color: theme.text }]}>{widget.name}</Text>
        <Text style={[styles.widgetDescription, { color: theme.textMuted }]} numberOfLines={1}>
          {widget.description}
        </Text>
      </View>
      <AppIcon name="chevron-forward" size={20} color={theme.textMuted} />
    </Pressable>
  );
}

export default function ToolsMenu({ visible, onClose, onSelectWidget }) {
  const { theme } = useApp();
  const widgets = getInputWidgets();
  const groupedWidgets = groupWidgetsByCategory(widgets);

  // Flatten grouped widgets for FlatList with section headers
  const listData = [];
  Object.entries(groupedWidgets).forEach(([category, categoryWidgets]) => {
    listData.push({ type: 'header', category, title: CATEGORY_NAMES[category] || category });
    categoryWidgets.forEach((widget) => {
      listData.push({ type: 'widget', ...widget });
    });
  });

  const handleSelectWidget = (widget) => {
    onClose();
    setTimeout(() => {
      onSelectWidget(widget);
    }, 100);
  };

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
          {item.title}
        </Text>
      );
    }
    return <WidgetItem widget={item} onPress={handleSelectWidget} theme={theme} />;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: theme.text }]}>Tools</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Select a tool to get started
            </Text>
          </View>

          {/* Widget List */}
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              item.type === 'header' ? `header-${item.category}` : item.type
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Close button */}
          <Pressable
            style={[styles.closeButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: SPACING.radiusXl,
    borderTopRightRadius: SPACING.radiusXl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  listContent: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  widgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  widgetInfo: {
    flex: 1,
  },
  widgetName: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  widgetDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  closeButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
  },
  closeText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
