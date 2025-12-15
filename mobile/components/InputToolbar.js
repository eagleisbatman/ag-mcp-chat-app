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
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const textInputRef = useRef(null);
  const windowHeightBaseline = useRef(Dimensions.get('window').height);
  const keyboardVisible = useRef(false);
  const mediaMenuAnim = useRef(new Animated.Value(0)).current;
  
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
      const currentWindowHeight = Dimensions.get('window').height;
      const windowResizedForKeyboard =
        Platform.OS === 'android' && windowHeightBaseline.current - currentWindowHeight > 50;
      const targetKeyboardPadding = windowResizedForKeyboard
        ? KEYBOARD_GAP
        : Math.max(0, e.endCoordinates.height - insets.bottom + KEYBOARD_GAP);

      if (Platform.OS === 'android') {
        // Use LayoutAnimation for smoother Android transitions
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        keyboardHeight.setValue(targetKeyboardPadding);
      } else {
        // iOS - use native keyboard animation timing
        Animated.timing(keyboardHeight, {
          toValue: targetKeyboardPadding,
          duration: e.duration || 250,
          easing: Easing.bezier(0.17, 0.59, 0.4, 0.77), // iOS keyboard curve approximation
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

  const toggleMediaMenu = () => {
    const toValue = showMediaMenu ? 0 : 1;
    setShowMediaMenu(!showMediaMenu);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(mediaMenuAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handleMediaOption = (option) => {
    setShowMediaMenu(false);
    Animated.timing(mediaMenuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();

    if (option === 'camera') {
      handleTakePhoto();
    } else if (option === 'gallery') {
      handlePickImage();
    }
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
      {/* Voice transcription indicator */}
      {isFromVoice && (
        <View style={[styles.voiceIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
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

      {/* Main Input Row - Plus button, Text input, mic/send */}
      <View style={styles.mainInputRow}>
        {/* Plus button / Media menu */}
        <View style={styles.mediaButtonContainer}>
          <IconButton
            icon={showMediaMenu ? 'close' : 'add'}
            onPress={toggleMediaMenu}
            disabled={disabled}
            size={40}
            borderRadius={20}
            backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
            color={theme.iconPrimary || theme.accent}
            accessibilityLabel={showMediaMenu ? t('a11y.closeMenu') : t('a11y.attachMedia')}
          />

          {/* Expandable media options */}
          {showMediaMenu && (
            <Animated.View
              style={[
                styles.mediaMenu,
                {
                  backgroundColor: isDark ? theme.cardBackground : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  opacity: mediaMenuAnim,
                  transform: [
                    { scale: mediaMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                    { translateY: mediaMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                  ],
                }
              ]}
            >
              <Pressable
                style={[styles.mediaMenuItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                onPress={() => handleMediaOption('camera')}
                android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
              >
                <AppIcon name="camera" size={20} color={theme.iconPrimary || theme.accent} />
                <Text style={[styles.mediaMenuText, { color: theme.text }]}>{t('media.camera')}</Text>
              </Pressable>
              <Pressable
                style={styles.mediaMenuItem}
                onPress={() => handleMediaOption('gallery')}
                android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
              >
                <AppIcon name="image" size={20} color={theme.iconPrimary || theme.accent} />
                <Text style={[styles.mediaMenuText, { color: theme.text }]}>{t('media.gallery')}</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* Text Input */}
        <View style={[
          styles.textInputContainer,
          {
            backgroundColor: theme.inputBackground,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
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
            size={44}
            borderRadius={22}
            backgroundColor={theme.accent}
            color="#FFFFFF"
            accessibilityLabel={t('a11y.sendMessage')}
          />
        ) : (
          <IconButton
            icon="mic"
            onPress={handleStartRecording}
            disabled={disabled}
            size={44}
            borderRadius={22}
            backgroundColor={theme.accent}
            color="#FFFFFF"
            accessibilityLabel={t('a11y.recordVoice')}
          />
        )}
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
  mainInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  mediaButtonContainer: {
    position: 'relative',
  },
  mediaMenu: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 150,
    ...ELEVATION.lg,
  },
  mediaMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mediaMenuText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: SPACING.lg,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    padding: 0,
    maxHeight: 100,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
