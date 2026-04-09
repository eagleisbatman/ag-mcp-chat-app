/**
 * PickerSheet — Generic reusable picker modal for A2UI widgets.
 *
 * Renders any PickerConfig: list step (with search + category grouping + suggested section)
 * followed by an optional form step. New picker types only need a config — no new component.
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../../constants/themes';
import AppIcon from '../../ui/AppIcon';
import { t } from '../../../constants/strings';
import PickerFormStep from './PickerFormStep';
import type { PickerConfig, PickerItem, PickerStep as PickerStepType, ProfileActions } from './types';

// ============================================
// NumberInputStep — standalone numeric input
// ============================================

function NumberInputStep({
  step,
  theme,
  submitting,
  onSubmit,
}: {
  step: PickerStepType;
  theme: { text: string; textMuted: string; accent: string; surfaceVariant: string; border: string; name: string };
  submitting: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValueState] = React.useState('');
  const numVal = parseFloat(value);
  const isValid =
    value.trim().length > 0 &&
    !isNaN(numVal) &&
    (step.min === undefined || numVal >= step.min) &&
    (step.max === undefined || numVal <= step.max);

  return (
    <View style={{ flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: TYPOGRAPHY.sizes['2xl'],
            fontWeight: TYPOGRAPHY.weights.bold,
            color: theme.text,
            textAlign: 'center',
            paddingVertical: SPACING.lg,
            borderBottomWidth: 2,
            borderBottomColor: isValid ? theme.accent : theme.border,
          }}
          value={value}
          onChangeText={setValueState}
          placeholder={step.numberPlaceholder || '0'}
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          autoFocus
        />
        {step.unit && (
          <Text style={{ fontSize: TYPOGRAPHY.sizes.lg, color: theme.textMuted }}>
            {step.unit}
          </Text>
        )}
      </View>

      {step.min !== undefined && step.max !== undefined && (
        <Text style={{ color: theme.textMuted, fontSize: TYPOGRAPHY.sizes.xs, textAlign: 'center', marginTop: SPACING.sm }}>
          {step.min} – {step.max}
        </Text>
      )}

      <TouchableOpacity
        style={{
          marginTop: SPACING.xl,
          paddingVertical: SPACING.md,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: isValid && !submitting ? theme.accent : theme.border,
          opacity: isValid && !submitting ? 1 : 0.4,
        }}
        onPress={() => isValid && !submitting && onSubmit(value)}
        disabled={!isValid || submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ color: '#fff', fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold }}>
            {step.submitLabel || t('common.submit')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}


// ============================================
// Internal list types
// ============================================

type SectionItem =
  | { type: 'header'; title: string }
  | { type: 'item'; item: PickerItem };

// ============================================
// Props
// ============================================

interface PickerSheetProps {
  visible: boolean;
  onClose: () => void;
  config: PickerConfig;
  /** Items to display (mapped from master data by the caller). */
  items: PickerItem[];
  /** Override config.title with widget-specific title. */
  title?: string;
  /** Suggested item labels to highlight at top of list. */
  suggestedItems?: string[];
  /** 'clarify' or 'collect' — passed through to config.onComplete. */
  purpose?: 'clarify' | 'collect';
  /** Profile actions injected from caller (avoids hooks in configs). */
  profileActions: ProfileActions;
  /** Called with display text and optional structured data when flow completes. */
  onComplete: (text: string, responseData?: Record<string, unknown>) => void;
  /** Called when a collect save fails. */
  onSaveError?: () => void;
  /** Called after a successful collect save. */
  onSaveSuccess?: () => void;
}

export default function PickerSheet({
  visible,
  onClose,
  config,
  items,
  title,
  suggestedItems,
  purpose,
  profileActions,
  onComplete,
  onSaveError,
  onSaveSuccess,
}: PickerSheetProps) {
  const { theme } = useApp();
  const [search, setSearch] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<PickerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = config.steps[stepIndex];
  const hasFormStep = config.steps.length > 1 && config.steps.some((s) => s.type === 'form');

  // ---- Search filtering ----
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q),
    );
  }, [items, search]);

  // ---- Category grouping + suggested section ----
  const sections = useMemo(() => {
    const result: SectionItem[] = [];
    const suggestedIds = new Set<string>();

    // Suggested section (only when no active search)
    if (suggestedItems?.length && !search.trim()) {
      const suggestedLower = suggestedItems.map((s) => s.toLowerCase());
      const suggested = items.filter(
        (item) =>
          suggestedLower.includes(item.label.toLowerCase()) ||
          (item.sublabel && suggestedLower.includes(item.sublabel.toLowerCase())),
      );
      if (suggested.length > 0) {
        result.push({ type: 'header', title: t('chat.suggested') || 'Suggested' });
        for (const item of suggested) {
          result.push({ type: 'item', item });
          suggestedIds.add(item.id);
        }
      }
    }

    // Group remaining by category, excluding already-shown suggested items
    const groups: Record<string, PickerItem[]> = {};
    for (const item of filtered) {
      if (suggestedIds.has(item.id)) continue;
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }

    for (const [category, groupItems] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
      result.push({ type: 'header', title: category });
      for (const item of groupItems) {
        result.push({ type: 'item', item });
      }
    }

    return result;
  }, [filtered, items, suggestedItems, search]);

  // ---- Handlers ----

  // Track whether the picker is currently active (visible and not yet closed).
  // Initialized to `visible` so it reflects the correct state when the sheet opens.
  // Set to true when visible and false when closed — never set inside click handlers.
  const isActiveRef = useRef(visible);
  useEffect(() => {
    isActiveRef.current = visible;
  }, [visible]);

  const resetState = useCallback(() => {
    setSearch('');
    setStepIndex(0);
    setSelectedItem(null);
    setSubmitting(false);
  }, []);

  // Close always works — even during submission (user escape hatch)
  const handleClose = useCallback(() => {
    isActiveRef.current = false;
    resetState();
    onClose();
  }, [resetState, onClose]);

  /** Run config.onComplete with a configurable timeout to prevent indefinite hang. */
  const runCompletion = useCallback(
    (item: PickerItem | null, formData: Record<string, string> | undefined) => {
      setSubmitting(true);
      const timeoutMs = config.timeoutMs ?? 10_000;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      );
      Promise.race([
        config.onComplete(item, formData, purpose, profileActions),
        timeout,
      ])
        .then((result) => {
          // Guard: if the user dismissed the picker before completion resolved,
          // do NOT send a chat message or show toasts — the user intentionally cancelled.
          if (!isActiveRef.current) return;
          if (!result.saved && purpose === 'collect') {
            onSaveError?.();
          } else if (result.saved && purpose === 'collect') {
            onSaveSuccess?.();
          }
          onComplete(result.text, result.responseData);
          resetState();
        })
        .catch((err) => {
          // Guard: same — suppress all side effects if user already dismissed
          if (!isActiveRef.current) return;
          // Only show the save error for genuine failures (not timeouts from a
          // dismiss-then-wait scenario, which isActiveRef already filters above).
          const isTimeout = err instanceof Error && err.message === 'timeout';
          if (!isTimeout || purpose === 'collect') {
            onSaveError?.();
          }
          resetState();
        });
    },
    [config, purpose, profileActions, onComplete, onSaveError, onSaveSuccess, resetState],
  );

  const handleItemSelect = useCallback(
    (item: PickerItem) => {
      if (submitting) return;
      setSelectedItem(item);
      setSearch('');
      if (hasFormStep) {
        // Advance to form step
        setStepIndex(1);
      } else {
        // Single-step: complete immediately
        runCompletion(item, undefined);
      }
    },
    [submitting, hasFormStep, runCompletion],
  );

  const handleFormSubmit = useCallback(
    (formData: Record<string, string>) => {
      if (!selectedItem || submitting) return;
      runCompletion(selectedItem, formData);
    },
    [selectedItem, submitting, runCompletion],
  );

  const handleBack = useCallback(() => {
    setStepIndex(0);
    setSelectedItem(null);
  }, []);

  // ---- Confirmation step rendering ----
  if (currentStep?.type === 'confirmation') {
    return (
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {title || config.title}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
              <AppIcon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.confirmContent} accessibilityRole="alert">
            {purpose && (
              <Text style={[styles.confirmDescription, { color: theme.textSecondary }]}>
                {title || config.title}
              </Text>
            )}

            {submitting ? (
              <ActivityIndicator size="large" color={theme.accent} />
            ) : (
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.accent }]}
                  onPress={() => runCompletion(null, { response: 'yes' })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={currentStep.confirmLabel || t('common.yes')}
                >
                  <Text style={styles.confirmButtonText}>
                    {currentStep.confirmLabel || t('common.yes')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => runCompletion(null, { response: 'no' })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={currentStep.cancelLabel || t('common.no')}
                >
                  <Text style={[styles.confirmButtonText, { color: theme.text }]}>
                    {currentStep.cancelLabel || t('common.no')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // ---- Number input step rendering ----
  if (currentStep?.type === 'number_input') {
    return (
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>
                {title || config.title}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AppIcon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <NumberInputStep
              step={currentStep}
              theme={theme}
              submitting={submitting}
              onSubmit={(value) => runCompletion(null, { value })}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ---- Form step rendering (standalone or after list) ----
  if (currentStep?.type === 'form') {
    const isStandalone = stepIndex === 0;
    return (
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              {!isStandalone && (
                <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <AppIcon name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: theme.text, flex: 1, marginLeft: isStandalone ? 0 : SPACING.md }]}>
                {isStandalone ? (title || config.title) : selectedItem?.label}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AppIcon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <PickerFormStep
              fields={currentStep.fields || []}
              submitLabel={currentStep.submitLabel}
              onSubmit={(formData) => {
                if (isStandalone) {
                  runCompletion(null, formData);
                } else {
                  handleFormSubmit(formData);
                }
              }}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ---- List step rendering ----
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {title || config.title}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <AppIcon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: theme.surfaceVariant }]}>
            <AppIcon name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={currentStep?.searchPlaceholder || t('chat.search') || 'Search...'}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AppIcon name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Loading overlay when saving */}
          {submitting && (
            <View style={styles.submittingBar}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.submittingText, { color: theme.textMuted }]}>
                {t('chat.saving') || 'Saving...'}
              </Text>
            </View>
          )}

          {/* List */}
          <FlatList
            data={sections}
            keyExtractor={(sectionItem, i) =>
              sectionItem.type === 'header' ? `h-${sectionItem.title}-${i}` : `i-${sectionItem.item.id}-${i}`
            }
            renderItem={({ item: sectionItem }) => {
              if (sectionItem.type === 'header') {
                return (
                  <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                    {sectionItem.title}
                  </Text>
                );
              }
              const { item } = sectionItem;
              return (
                <TouchableOpacity
                  onPress={() => handleItemSelect(item)}
                  activeOpacity={0.7}
                  style={styles.itemRow}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemLabel, { color: theme.text }]}>
                      {item.label}
                    </Text>
                    {item.sublabel && (
                      <Text style={[styles.itemSublabel, { color: theme.textMuted }]}>
                        {item.sublabel}
                      </Text>
                    )}
                  </View>
                  <AppIcon
                    name={hasFormStep ? 'chevron-forward' : 'plus'}
                    size={18}
                    color={theme.accent}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                {items.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    {currentStep?.loadingText || t('chat.loading') || 'Loading...'}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      {currentStep?.emptyText || t('chat.noResults') || 'No results found'}
                    </Text>
                    {/* "Add custom" option — send search text directly as response */}
                    {search.trim().length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          const customItem: PickerItem = { id: `custom_${search.trim()}`, label: search.trim() };
                          handleItemSelect(customItem);
                        }}
                        activeOpacity={0.7}
                        style={[styles.customOption, { borderColor: theme.accent }]}
                      >
                        <AppIcon name="add" size={18} color={theme.accent} />
                        <Text style={[styles.customOptionText, { color: theme.accent }]}>
                          {t('a2ui.notListed') || 'Not listed? Type a name'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    paddingVertical: 4,
  },
  listContent: {
    paddingBottom: SPACING['3xl'],
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  itemSublabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  emptyList: {
    padding: SPACING['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  submittingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  submittingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  customOptionText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  confirmContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING['2xl'],
    justifyContent: 'center',
  },
  confirmDescription: {
    fontSize: TYPOGRAPHY.sizes.md,
    textAlign: 'center',
    marginBottom: SPACING['2xl'],
    lineHeight: 22,
  },
  confirmButtons: {
    gap: SPACING.md,
  },
  confirmButton: {
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
