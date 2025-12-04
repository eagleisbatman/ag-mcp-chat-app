import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

export default function InputToolbar({ 
  onSendText, 
  onSendImage, 
  onSendVoice,
  disabled = false,
}) {
  const { theme } = useApp();
  const { showError, showWarning } = useToast();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleSendText = () => {
    if (!text.trim() || disabled) return;
    onSendText(text.trim());
    setText('');
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

  const startRecording = async () => {
    if (disabled) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Microphone access is needed to record voice. Enable in Settings.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      showError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      clearInterval(timerRef.current);
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) {
        showError('Recording failed. Please try again.');
        recordingRef.current = null;
        setRecordingDuration(0);
        return;
      }

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      onSendVoice({
        uri,
        base64,
        duration: recordingDuration,
      });

      recordingRef.current = null;
      setRecordingDuration(0);
    } catch (error) {
      console.error('Stop recording error:', error);
      showError('Failed to process recording. Please try again.');
      recordingRef.current = null;
      setRecordingDuration(0);
      setIsRecording(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {/* Recording Indicator */}
      {isRecording && (
        <View style={[styles.recordingBar, { backgroundColor: theme.errorLight }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="radio-button-on" size={16} color={theme.error} />
          </Animated.View>
          <TextInput
            style={[styles.recordingText, { color: theme.text }]}
            editable={false}
            value={`Recording... ${formatDuration(recordingDuration)}`}
          />
          <TouchableOpacity onPress={stopRecording}>
            <Ionicons name="stop-circle" size={28} color={theme.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Input Row */}
      {!isRecording && (
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
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
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
              onPress={startRecording}
              disabled={disabled}
            >
              <Ionicons name="mic" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
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
    maxHeight: 100,
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
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 12,
  },
  recordingText: {
    flex: 1,
    fontSize: 16,
  },
});

