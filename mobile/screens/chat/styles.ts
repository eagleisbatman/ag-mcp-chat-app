import { StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesContainer: { flex: 1, position: 'relative' },
  messagesList: {
    paddingTop: SPACING.sm,
    paddingHorizontal: 0,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingText: { fontSize: TYPOGRAPHY.sizes.base },
});
