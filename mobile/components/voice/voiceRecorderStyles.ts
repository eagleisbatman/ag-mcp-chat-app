import { StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { ELEVATION } from '../../constants/elevation';

export const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.floatingInputMargin,
    paddingTop: SPACING.sm,
  },
  container: {
    borderRadius: 24,
    borderWidth: 0,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    ...ELEVATION.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  duration: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  waveformContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginVertical: SPACING.md,
  },
  speakingHint: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveTranscript: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  liveTranscriptLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  liveTranscriptText: {
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.sizes.md * TYPOGRAPHY.lineHeights.relaxed,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING['3xl'],
    marginBottom: SPACING.md,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: 16,
    gap: SPACING.xs,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: 16,
    gap: SPACING.xs,
  },
  buttonLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  hint: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: TYPOGRAPHY.sizes.xs * TYPOGRAPHY.lineHeights.relaxed,
  },
  transcribingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
    gap: SPACING.lg,
  },
  transcribingText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    alignSelf: 'center',
  },
  connectionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionStatusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
