import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { CameraIcon, ImageIcon } from './ui/LineIcons';
import { t } from '../constants/strings';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Claude-style attach bottom sheet
 * Full-width modal with Camera and Photos options
 */
export default function AttachBottomSheet({
  visible,
  onClose,
  onCamera,
  onPhotos,
}) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === 'dark';

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleOption = (callback) => {
    Haptics.selectionAsync();
    handleClose();
    // Small delay to let animation complete
    setTimeout(() => {
      callback();
    }, 250);
  };

  const rippleColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const bottomPadding = Math.max(insets.bottom + 16, 32);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
      >
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            paddingBottom: bottomPadding,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#48484A' : '#D1D1D6' }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('media.addToChat')}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: true } : undefined}
          >
            <View style={[styles.closeButtonCircle, { backgroundColor: isDark ? '#38383A' : '#E5E5EA' }]}>
              <AppIcon name="x" size={16} color={isDark ? '#98989D' : '#8E8E93'} prefer="feather" />
            </View>
          </Pressable>
        </View>

        {/* Options Grid */}
        <View style={styles.optionsGrid}>
          {/* Camera Card */}
          <Pressable
            style={[styles.optionCard, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={() => handleOption(onCamera)}
            android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#38383A' : '#E5E5EA' }]}>
              <CameraIcon size={28} color={theme.iconPrimary} />
            </View>
            <Text style={[styles.optionLabel, { color: theme.text }]}>{t('media.camera')}</Text>
          </Pressable>

          {/* Photos Card */}
          <Pressable
            style={[styles.optionCard, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={() => handleOption(onPhotos)}
            android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#38383A' : '#E5E5EA' }]}>
              <ImageIcon size={28} color={theme.iconPrimary} />
            </View>
            <Text style={[styles.optionLabel, { color: theme.text }]}>{t('media.photos')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.sm,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeButtonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderRadius: 16,
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
  },
});
