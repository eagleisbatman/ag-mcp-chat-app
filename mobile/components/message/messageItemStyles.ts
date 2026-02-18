import { StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  // User message: right-aligned bubble
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '80%',
    borderRadius: SPACING.radiusLg,
    borderTopRightRadius: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  // Bot message: full-width, no bubble (clean markdown layout)
  botRow: {
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  senderName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: SPACING.radiusMd,
    marginBottom: SPACING.md,
  },
  markdownContainer: {
    width: '100%',
    paddingVertical: SPACING.sm,
  },
  messageText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  userTimestamp: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
});
