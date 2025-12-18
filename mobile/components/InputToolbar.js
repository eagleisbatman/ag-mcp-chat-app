import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Text,
  Keyboard,
  Animated,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Easing,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import VoiceRecorder from './VoiceRecorder';
import AttachBottomSheet from './AttachBottomSheet';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { PlusIcon, ClockIcon, VoiceWaveIcon } from './ui/LineIcons';
import { t } from '../constants/strings';

export default function InputToolbar({
  onSendText,
  onSendImage,
  onSendVoiceText,
  transcribeAudio,
  uploadAudioInBackground,
  onOpenHistory,
  disabled = false,
}) {
  const { theme } = useApp();
  const { showError, showWarning, showSuccess } = useToast();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [pendingAudioData, setPendingAudioData] = useState(null);
  const [isFromVoice, setIsFromVoice] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const textInputRef = useRef(null);
  const windowHeightBaseline = useRef(Dimensions.get('window').height);
  const keyboardVisible = useRef(false);

  // Keyboard animation - syncs with iOS keyboard animation
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Use keyboard will show/hide for smooth animation sync
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const dimSub = Dimensions.addEventListener('change', () => {
      if (!keyboardVisible.current) {
        windowHeightBaseline.current = Dimensions.get('window').height;
      }
    });

    // Gap between keyboard and input
    const KEYBOARD_GAP = SPACING.sm;

    const keyboardWillShow = Keyboard.addListener(showEvent, (e) => {
      keyboardVisible.current = true;

      // With edge-to-edge, both platforms need manual keyboard offset
      const targetKeyboardPadding = Math.max(0, e.endCoordinates.height - insets.bottom + KEYBOARD_GAP);

      if (Platform.OS === 'android') {
        // Android uses LayoutAnimation for smoother transitions
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        keyboardHeight.setValue(targetKeyboardPadding);
      } else {
        // iOS - animated timing synced with keyboard
        Animated.timing(keyboardHeight, {
          toValue: targetKeyboardPadding,
          duration: e.duration || 250,
          easing: Easing.bezier(0.17, 0.59, 0.4, 0.77),
          useNativeDriver: false,
        }).start();
      }
    });

    const keyboardWillHide = Keyboard.addListener(hideEvent, (e) => {
      keyboardVisible.current = false;
      windowHeightBaseline.current = Dimensions.get('window').height;

      if (Platform.OS === 'android') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        keyboardHeight.setValue(0);
      } else {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: e?.duration || 250,
          easing: Easing.bezier(0.17, 0.59, 0.4, 0.77),
          useNativeDriver: false,
        }).start();
      }
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      dimSub?.remove?.();
    };
  }, [keyboardHeight, insets.bottom]);

  const handleSendText = () => {
    if (!text.trim() || disabled) return;

    const messageText = text.trim();

    if (isFromVoice && pendingAudioData && uploadAudioInBackground) {
      uploadAudioInBackground(pendingAudioData).catch(err => {
        console.log('Background audio upload failed:', err);
      });
    }

    onSendText(messageText);
    setText('');
    setPendingAudioData(null);
    setIsFromVoice(false);
  };

  const handlePickImage = async () => {
    if (disabled) return;
    setShowMediaMenu(false);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('media.photoLibraryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        onSendImage({
          uri: asset.uri,
          base64: asset.base64,
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showError(t('media.pickImageFailed'));
    }
  };

  const handleTakePhoto = async () => {
    if (disabled) return;
    setShowMediaMenu(false);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('media.cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        onSendImage({
          uri: asset.uri,
          base64: asset.base64,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      showError(t('media.cameraFailed'));
    }
  };

  const handleStartRecording = () => {
    if (disabled) return;
    setIsRecordingMode(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleTranscriptionComplete = (transcription, audioData) => {
    setIsRecordingMode(false);
    setText(transcription);
    setPendingAudioData(audioData);
    setIsFromVoice(true);

    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);

    showSuccess(t('chat.voiceTranscribed'));
  };

  const handleCancelRecording = () => {
    setIsRecordingMode(false);
    setPendingAudioData(null);
    setIsFromVoice(false);
  };

  const handleClearVoiceText = () => {
    setText('');
    setPendingAudioData(null);
    setIsFromVoice(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openMediaMenu = () => {
    if (disabled) return;
    setShowMediaMenu(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeMediaMenu = () => {
    setShowMediaMenu(false);
  };

  // Show VoiceRecorder when in recording mode
  if (isRecordingMode) {
    return (
      <VoiceRecorder
        onTranscriptionComplete={handleTranscriptionComplete}
        onCancel={handleCancelRecording}
        transcribeAudio={transcribeAudio}
      />
    );
  }

  const bottomPadding = Math.max(insets.bottom, SPACING.md);
  const isDark = theme.name === 'dark';
  const rippleColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const hasText = text.trim().length > 0;

  return (
    <Animated.View style={[styles.wrapper, { paddingBottom: Animated.add(bottomPadding, keyboardHeight) }]}>
      {/* Voice transcription indicator */}
      {isFromVoice && (
        <View style={[styles.voiceIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          <AppIcon name="mic" size={14} color={theme.accent} prefer="feather" />
          <Text style={[styles.voiceIndicatorText, { color: theme.accent }]}>
            {t('chat.fromVoice')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.clearVoiceTranscription')}
            onPress={handleClearVoiceText}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: true } : undefined}
          >
            <AppIcon name="x-circle" size={18} color={theme.accent} prefer="feather" />
          </Pressable>
        </View>
      )}

      {/* Claude-style Attach Bottom Sheet */}
      <AttachBottomSheet
        visible={showMediaMenu}
        onClose={closeMediaMenu}
        onCamera={handleTakePhoto}
        onPhotos={handlePickImage}
      />

      {/* Unified Input Container - Claude-style */}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        }
      ]}>
        {/* Text Input Area */}
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, { color: theme.text }]}
          placeholder={t('chat.messagePlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!disabled}
          accessibilityLabel={t('a11y.messageInput')}
        />

        {/* Bottom Icons Row */}
        <View style={styles.iconsRow}>
          {/* Left Icons */}
          <View style={styles.leftIcons}>
            {/* Plus/Attach Button - with background circle like voice button */}
            <Pressable
              style={[
                styles.iconButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }
              ]}
              onPress={openMediaMenu}
              disabled={disabled}
              accessibilityLabel={t('a11y.attachMedia')}
              android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: true } : undefined}
            >
              <PlusIcon size={20} color={theme.icon} />
            </Pressable>

            {/* History Button */}
            {onOpenHistory && (
              <Pressable
                style={[
                  styles.iconButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }
                ]}
                onPress={onOpenHistory}
                disabled={disabled}
                accessibilityLabel={t('a11y.openHistory')}
                android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: true } : undefined}
              >
                <ClockIcon size={20} color={theme.icon} />
              </Pressable>
            )}
          </View>

          {/* Right Icons */}
          <View style={styles.rightIcons}>
            {/* Send/Voice Button - black/white based on theme */}
            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: hasText
                    ? (isDark ? '#FFFFFF' : '#000000')  // Solid white/black when active
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')  // Subtle when inactive
                }
              ]}
              onPress={hasText ? handleSendText : handleStartRecording}
              disabled={disabled}
              accessibilityLabel={hasText ? t('a11y.sendMessage') : t('a11y.recordVoice')}
              android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: true } : undefined}
            >
              {hasText ? (
                <AppIcon name="arrow-up" size={20} color={isDark ? '#000000' : '#FFFFFF'} prefer="feather" />
              ) : (
                <VoiceWaveIcon size={20} color={theme.icon} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  voiceIndicatorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  // Claude-style unified container
  inputContainer: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    minHeight: 100,
  },
  textInput: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    padding: 0,
    paddingHorizontal: SPACING.xs,
    minHeight: 24,
    maxHeight: 100,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
