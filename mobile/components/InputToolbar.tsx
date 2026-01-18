import React, { useState, useRef, forwardRef, useImperativeHandle, ForwardedRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Text,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
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
import { log, error as logError } from '../utils/logger';

interface ImageData {
  uri: string;
  base64?: string;
  text?: string;
}

interface AudioData {
  uri: string;
  base64: string;
  duration: number;
}

interface TranscriptionResult {
  success: boolean;
  transcription?: string;
  error?: string;
  errorCode?: string;
  errorDetails?: {
    expected?: string;
    detected?: string;
  };
}

interface InputToolbarProps {
  onSendText: (text: string) => void;
  onSendImage: (data: ImageData) => void;
  onSendVoiceText?: (text: string) => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
  uploadAudioInBackground?: (data: AudioData) => Promise<unknown>;
  onOpenHistory?: () => void;
  disabled?: boolean;
}

export interface InputToolbarRef {
  openAttachSheet: () => void;
}

const InputToolbar = forwardRef(function InputToolbar(
  {
    onSendText,
    onSendImage,
    onSendVoiceText,
    transcribeAudio,
    uploadAudioInBackground,
    onOpenHistory,
    disabled = false,
  }: InputToolbarProps,
  ref: ForwardedRef<InputToolbarRef>
) {
  const { theme, language } = useApp();
  const { showError, showWarning, showSuccess } = useToast();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [pendingAudioData, setPendingAudioData] = useState<AudioData | null>(null);
  const [isFromVoice, setIsFromVoice] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    openAttachSheet: () => setShowMediaMenu(true),
  }));

  const bottomPadding = Math.max(insets.bottom, SPACING.md);

  const handleSendText = (): void => {
    if (!text.trim() || disabled) return;

    const messageText = text.trim();

    if (isFromVoice && pendingAudioData && uploadAudioInBackground) {
      uploadAudioInBackground(pendingAudioData).catch(err => {
        log('Background audio upload failed:', err);
      });
    }

    onSendText(messageText);
    setText('');
    setPendingAudioData(null);
    setIsFromVoice(false);
  };

  const handlePickImage = async (): Promise<void> => {
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
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        onSendImage({
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          text: text.trim(),
        });
        setText('');
      }
    } catch (error) {
      logError('Image picker error:', error);
      showError(t('media.pickImageFailed'));
    }
  };

  const handleTakePhoto = async (): Promise<void> => {
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
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        onSendImage({
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          text: text.trim(),
        });
        setText('');
      }
    } catch (error) {
      logError('Camera error:', error);
      showError(t('media.cameraFailed'));
    }
  };

  const handleStartRecording = (): void => {
    if (disabled) return;
    setIsRecordingMode(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleTranscriptionComplete = (transcription: string, audioData: AudioData): void => {
    setIsRecordingMode(false);
    setText(transcription);
    setPendingAudioData(audioData);
    setIsFromVoice(true);

    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);

    showSuccess(t('chat.voiceTranscribed'));
  };

  const handleCancelRecording = (): void => {
    setIsRecordingMode(false);
    setPendingAudioData(null);
    setIsFromVoice(false);
  };

  const handleClearVoiceText = (): void => {
    setText('');
    setPendingAudioData(null);
    setIsFromVoice(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openMediaMenu = (): void => {
    if (disabled) return;
    setShowMediaMenu(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeMediaMenu = (): void => {
    setShowMediaMenu(false);
  };

  if (isRecordingMode) {
    return (
      <VoiceRecorder
        onTranscriptionComplete={handleTranscriptionComplete}
        onCancel={handleCancelRecording}
        transcribeAudio={(data) => transcribeAudio({ ...data, language: language.code })}
      />
    );
  }

  const isDark = theme.name === 'dark';
  const rippleColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const hasText = text.trim().length > 0;

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={{ backgroundColor: theme.background }}>
      <View style={[styles.wrapper, { paddingBottom: bottomPadding, backgroundColor: theme.background }]}>
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
            >
              <AppIcon name="x-circle" size={18} color={theme.accent} prefer="feather" />
            </Pressable>
          </View>
        )}

        <AttachBottomSheet
          visible={showMediaMenu}
          onClose={closeMediaMenu}
          onCamera={handleTakePhoto}
          onPhotos={handlePickImage}
        />

        <View style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          }
        ]}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              { color: theme.text },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            ]}
            placeholder={t('chat.messagePlaceholder')}
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={!disabled}
            accessibilityLabel={t('a11y.messageInput')}
            autoCapitalize="sentences"
            autoCorrect={true}
            underlineColorAndroid="transparent"
          />

          <View style={styles.iconsRow}>
            <View style={styles.leftIcons}>
              <Pressable
                style={[
                  styles.iconButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }
                ]}
                onPress={openMediaMenu}
                disabled={disabled}
                accessibilityLabel={t('a11y.attachMedia')}
              >
                <PlusIcon size={20} color={theme.icon} />
              </Pressable>

              {onOpenHistory && (
                <Pressable
                  style={[
                    styles.iconButton,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }
                  ]}
                  onPress={onOpenHistory}
                  disabled={disabled}
                  accessibilityLabel={t('a11y.openHistory')}
                >
                  <ClockIcon size={20} color={theme.icon} />
                </Pressable>
              )}
            </View>

            <View style={styles.rightIcons}>
              <Pressable
                style={[
                  styles.sendButton,
                  { backgroundColor: hasText
                      ? (isDark ? '#FFFFFF' : '#000000')
                      : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                  }
                ]}
                onPress={hasText ? handleSendText : handleStartRecording}
                disabled={disabled}
                accessibilityLabel={hasText ? t('a11y.sendMessage') : t('a11y.recordVoice')}
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
      </View>
    </KeyboardStickyView>
  );
});

export default InputToolbar;

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
