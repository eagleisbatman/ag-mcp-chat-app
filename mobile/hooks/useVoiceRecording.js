/**
 * Voice recording state management hook
 * Handles audio recording, metering, and transcription
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useToast } from '../contexts/ToastContext';
import { t } from '../constants/strings';

const MAX_RECORDING_DURATION = 120; // 2 minutes max
const SILENCE_THRESHOLD = -45; // dB threshold for silence detection

export default function useVoiceRecording({
  transcribeAudio,
  language,
  onTranscriptionComplete,
  onCancel,
}) {
  const { showError } = useToast();
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wavePhase = useRef(new Animated.Value(0)).current;
  const waveAmplitude = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0.6)).current;

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recordingRef.current) {
      try {
        recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      recordingRef.current = null;
    }
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showError(t('voice.microphonePermission'));
        onCancel?.();
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording with high quality settings
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      // Set up metering callback
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          setAudioLevel(normalizedLevel);
          
          // Detect speech
          const speaking = status.metering > SILENCE_THRESHOLD;
          setIsSpeaking(speaking);
        }
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_DURATION) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

    } catch (error) {
      showError(t('voice.recordingFailed'));
      onCancel?.();
    }
  }, [showError, onCancel]);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);

      // Stop the recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Read audio as base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Transcribe
      const result = await transcribeAudio({
        base64: base64Audio,
        language: language?.code || 'en',
        duration: recordingDuration,
      });

      if (result.success && result.transcription) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onTranscriptionComplete?.(result.transcription, {
          base64: base64Audio,
          duration: recordingDuration,
          uri,
        });
      } else {
        showError(result.error || t('voice.transcriptionFailed'));
        onCancel?.();
      }

    } catch (error) {
      showError(t('voice.transcriptionFailed'));
      onCancel?.();
    } finally {
      setIsTranscribing(false);
      cleanup();
    }
  }, [recordingDuration, transcribeAudio, language, onTranscriptionComplete, onCancel, showError, cleanup]);

  /**
   * Cancel recording
   */
  const cancelRecording = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cleanup();
    onCancel?.();
  }, [cleanup, onCancel]);

  /**
   * Format duration for display
   */
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isRecording,
    isTranscribing,
    recordingDuration,
    isSpeaking,
    audioLevel,
    
    // Animation values
    slideAnim,
    pulseAnim,
    wavePhase,
    waveAmplitude,
    textOpacity,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    
    // Helpers
    formatDuration,
  };
}
