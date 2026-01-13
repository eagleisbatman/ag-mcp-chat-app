/**
 * Shared styles for diagnosis components
 */
import { StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export const diagnosisStyles = StyleSheet.create({
  // No card styling - transparent, flows naturally
  container: {
    marginTop: SPACING.xs,
  },

  // Two-column metadata row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  label: {
    width: 90,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  value: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Section styling
  section: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.xs,
  },

  // Issue items
  issueItem: {
    marginBottom: SPACING.xs,
  },

  // Treatment block - groups treatments for each issue
  treatmentBlock: {
    marginBottom: SPACING.md,
  },

  // Treatment rows
  treatmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Common text - matches markdown body
  text: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },

  // Header row for errors/rejections
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
  },

  // Retry button - simple outlined style
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

// Alias for simpler imports
export const styles = diagnosisStyles;
