import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import VoiceRecorder from './VoiceRecorder';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

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
        showWarning('Photo library access is needed to select images. Enable in Settings.');
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
      showError('Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    if (disabled) return;

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Camera access is needed to take photos. Enable in Settings.');
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
      showError('Failed to access camera. Please try again.');
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
    
    showSuccess('Voice transcribed! Edit if needed, then send.');
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

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
      {/* Floating container with blur effect */}
      <View style={[
        styles.floatingContainer,
        { 
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: theme.border,
        }
      ]}>
        {/* Voice transcription indicator */}
        {isFromVoice && (
          <View style={[styles.voiceIndicator, { backgroundColor: theme.accentLight }]}>
            <Ionicons name="mic" size={14} color={theme.accent} />
            <Text style={[styles.voiceIndicatorText, { color: theme.accent }]}>
              From voice — edit if needed
            </Text>
            <TouchableOpacity onPress={handleClearVoiceText} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Input Row */}
        <View style={styles.inputRow}>
          {/* Camera Button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={handleTakePhoto}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={20} color={theme.iconPrimary || theme.accent} />
          </TouchableOpacity>

          {/* Gallery Button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={handlePickImage}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Ionicons name="image" size={20} color={theme.iconPrimary || theme.accent} />
          </TouchableOpacity>

          {/* Text Input - Pill shaped */}
          <View style={[
            styles.textInputContainer, 
            { 
              backgroundColor: theme.surfaceVariant,
              borderColor: text.trim() ? theme.accent : 'transparent',
            }
          ]}>
            <TextInput
              ref={textInputRef}
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Message..."
              placeholderTextColor={theme.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              editable={!disabled}
            />
          </View>

          {/* Voice / Send Button */}
          {text.trim() ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.accent }]}
              onPress={handleSendText}
              disabled={disabled}
              activeOpacity={0.7}
            >
              {disabled ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.voiceButton, { backgroundColor: theme.accent }]}
              onPress={handleStartRecording}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Ionicons name="mic" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Removed absolute positioning so keyboard avoidance works
    paddingHorizontal: SPACING.floatingInputMargin,
    paddingTop: SPACING.sm,
  },
  floatingContainer: {
    borderRadius: SPACING.radiusXl,
    borderWidth: 0.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SPACING.radiusMd,
    marginBottom: SPACING.sm,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: SPACING.inputPadding,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  textInput: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    padding: 0,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
