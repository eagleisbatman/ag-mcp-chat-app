/**
 * DropdownSelector - Native picker wrapped in styled container
 *
 * Used for dropdown selections like breed, crop type, etc.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import AppIcon from '../../components/ui/AppIcon';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export default function DropdownSelector({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select...',
  disabled = false,
}) {
  const { theme } = useApp();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === selectedValue);

  const handleSelect = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(value);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <Pressable
        style={[
          styles.selector,
          {
            backgroundColor: theme.surfaceVariant,
            borderColor: theme.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption?.label || placeholder}`}
      >
        <Text
          style={[
            styles.selectorText,
            { color: selectedValue ? theme.text : theme.textMuted },
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <AppIcon name="chevron-down" size={20} color={theme.textMuted} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <AppIcon name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor:
                        item.value === selectedValue
                          ? theme.accentLight
                          : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          item.value === selectedValue
                            ? theme.accent
                            : theme.text,
                        fontWeight:
                          item.value === selectedValue
                            ? TYPOGRAPHY.weights.semibold
                            : TYPOGRAPHY.weights.regular,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <AppIcon name="checkmark" size={20} color={theme.accent} />
                  )}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.radiusMd,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: TYPOGRAPHY.sizes.base,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    maxHeight: '60%',
    borderTopLeftRadius: SPACING.radiusXl,
    borderTopRightRadius: SPACING.radiusXl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  optionText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
});
