import React, { useState, useRef, useEffect } from 'react';
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
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import VoiceRecorder from './VoiceRecorder';

export default function InputToolbar({ 
  onSendText, 
  onSendImage, 
  onSendVoiceText, // New: Send transcribed text (not voice bubble)
  transcribeAudio, // Pass through transcription function
  uploadAudioInBackground, // Silent audio upload
  disabled = false,
}) {
  const { theme } = useApp();
  const { showError, showWarning, showSuccess } = useToast();
  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [pendingAudioData, setPendingAudioData] = useState(null); // For background upload
  const [isFromVoice, setIsFromVoice] = useState(false); // Track if text came from voice
  const textInputRef = useRef(null);

  const handleSendText = () => {
    if (!text.trim() || disabled) return;
    
    const messageText = text.trim();
    
    // If this was from voice, upload audio in background
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
    
    // Focus the input so user can edit
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

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {/* Voice transcription indicator */}
      {isFromVoice && (
        <View style={[styles.voiceIndicator, { backgroundColor: theme.accentLight }]}>
          <Ionicons name="mic" size={14} color={theme.accent} />
          <Text style={[styles.voiceIndicatorText, { color: theme.accent }]}>
            From voice — edit if needed
          </Text>
          <TouchableOpacity onPress={handleClearVoiceText}>
            <Ionicons name="close-circle" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Input Row */}
      <View style={styles.inputRow}>
        {/* Image Buttons */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}
          onPress={handleTakePhoto}
          disabled={disabled}
        >
          <Ionicons name="camera" size={22} color={theme.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}
          onPress={handlePickImage}
          disabled={disabled}
        >
          <Ionicons name="image" size={22} color={theme.accent} />
        </TouchableOpacity>

        {/* Text Input */}
        <View style={[styles.textInputContainer, { backgroundColor: theme.inputBackground }]}>
          <TextInput
            ref={textInputRef}
            style={[styles.textInput, { color: theme.text }]}
            placeholder="Type or use voice..."
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={(newText) => {
              setText(newText);
              // If user edits the voice text, keep the audio data but allow changes
            }}
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
          >
            {disabled ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.voiceButton, { backgroundColor: theme.accent }]}
            onPress={handleStartRecording}
            disabled={disabled}
          >
            <Ionicons name="mic" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  voiceIndicatorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
