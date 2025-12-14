import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Text,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import VoiceRecorder from './VoiceRecorder';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import { ELEVATION } from '../constants/elevation';
import AppIcon from './ui/AppIcon';
import IconButton from './ui/IconButton';
import { t } from '../constants/strings';

export default function InputToolbar({ 
  onSendText, 
  onSendImage, 
  onSendVoiceText,
  transcribeAudio,
  uploadAudioInBackground,
  disabled = false,
}) {
  const { theme } = useApp();
  const { showError, showWarning, showSuccess } = useToast();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [pendingAudioData, setPendingAudioData] = useState(null);
  const [isFromVoice, setIsFromVoice] = useState(false);
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
    
    const keyboardWillShow = Keyboard.addListener(showEvent, (e) => {
      keyboardVisible.current = true;
      const currentWindowHeight = Dimensions.get('window').height;
      const windowResizedForKeyboard =
        Platform.OS === 'android' && windowHeightBaseline.current - currentWindowHeight > 50;
      const targetKeyboardPadding = windowResizedForKeyboard
        ? 0
        : Math.max(0, e.endCoordinates.height - insets.bottom);

      // Animate in sync with keyboard (iOS provides duration)
      Animated.timing(keyboardHeight, {
        toValue: targetKeyboardPadding,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: false, // translateY would need true, but we need padding
      }).start();
    });
    
    const keyboardWillHide = Keyboard.addListener(hideEvent, (e) => {
      keyboardVisible.current = false;
      windowHeightBaseline.current = Dimensions.get('window').height;
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: false,
      }).start();
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

  return (
    <Animated.View style={[styles.wrapper, { paddingBottom: Animated.add(bottomPadding, keyboardHeight) }]}>
      {/* Floating container with blur effect */}
      <View style={[
        styles.floatingContainer,
        { 
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        }
      ]}>
        {/* Voice transcription indicator */}
        {isFromVoice && (
          <View style={styles.voiceIndicator}>
            <AppIcon name="mic" size={14} color={theme.accent} />
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
              <AppIcon name="close-circle" size={18} color={theme.accent} />
            </Pressable>
          </View>
        )}

        {/* Main Input Row */}
        <View style={styles.inputRow}>
          {/* Camera Button */}
          <IconButton
            icon="camera"
            onPress={handleTakePhoto}
            disabled={disabled}
            size={40}
            borderRadius={0}
            backgroundColor={theme.inputBackground}
            color={theme.iconPrimary || theme.accent}
            accessibilityLabel={t('a11y.takePhoto')}
          />

          {/* Gallery Button */}
          <IconButton
            icon="image"
            onPress={handlePickImage}
            disabled={disabled}
            size={40}
            borderRadius={0}
            backgroundColor={theme.inputBackground}
            color={theme.iconPrimary || theme.accent}
            accessibilityLabel={t('a11y.pickImage')}
          />

          {/* Text Input */}
          <View style={[
            styles.textInputContainer, 
            { 
              backgroundColor: theme.inputBackground,
            }
          ]}>
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
          </View>

          {/* Voice / Send Button */}
          {text.trim() ? (
            <IconButton
              icon="arrow-up"
              onPress={handleSendText}
              disabled={disabled}
              size={40}
              borderRadius={0}
              backgroundColor={theme.accent}
              color="#FFFFFF"
              accessibilityLabel={t('a11y.sendMessage')}
            />
          ) : (
            <IconButton
              icon="mic"
              onPress={handleStartRecording}
              disabled={disabled}
              size={40}
              borderRadius={0}
              backgroundColor={theme.accent}
              color="#FFFFFF"
              accessibilityLabel={t('a11y.recordVoice')}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Removed absolute positioning so keyboard avoidance works
    paddingHorizontal: SPACING.floatingInputMargin,
    paddingTop: SPACING.sm,
  },
  floatingContainer: {
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...ELEVATION.lg,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 0,
    marginBottom: SPACING.sm,
    backgroundColor: 'transparent',
  },
  voiceIndicatorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 0,
    paddingHorizontal: SPACING.inputPadding,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
    borderWidth: 0,
  },
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    padding: 0,
    maxHeight: 80,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
