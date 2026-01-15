import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ExpoAudioStreamModule, useAudioRecorder } from '@siteed/expo-audio-studio';
import { t } from '../../constants/strings';
import { error as logError } from '../../utils/logger';
import { MAX_RECORDING_DURATION } from './recordingOptions';
import { buildRecordingConfig } from './recordingHelpers';
import { finishRecording, type AudioData, type TranscriptionResult } from './recordingTranscription';
import { createAudioAnalysisHandler, createAudioStreamHandler } from './recordingHandlers';
import { useRecorderAnimations } from './useRecorderAnimations';
interface UseVoiceRecordingOptions {
  languageCode: string;
  languageName?: string;
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
  showError: (message: string) => void;
  onAudioChunk?: (base64: string) => void;
  liveTranscript?: string;
}

export function useVoiceRecording({
  languageCode,
  languageName,
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
  showError,
  onAudioChunk,
  liveTranscript,
}: UseVoiceRecordingOptions) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLevelRef = useRef(0);
  const lastRecordingUriRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);
  const {
    startRecording,
    stopRecording,
    isRecording: isAudioRecording,
    durationMs,
  } = useAudioRecorder({ logger: console });
  const recordingDuration = useMemo(
    () => Math.floor((durationMs || 0) / 1000),
    [durationMs]
  );

  const safeStopRecording = useCallback(async () => {
    if (isStoppingRef.current) return null;
    if (!isRecordingRef.current && !isAudioRecording) return null;
    isStoppingRef.current = true;
    try {
      const result = await stopRecording();
      return result;
    } catch (err) {
      logError('Recording cleanup error:', err);
      return null;
    } finally {
      isStoppingRef.current = false;
      isRecordingRef.current = false;
    }
  }, [isAudioRecording, stopRecording]);

  const cleanup = useCallback((): void => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    void safeStopRecording();
  }, [safeStopRecording]);

  const handleAudioAnalysis = useMemo(
    () => createAudioAnalysisHandler({ setAudioLevel, setIsSpeaking, silenceTimeoutRef, lastLevelRef }),
    []
  );

  const handleAudioStream = useMemo(
    () => createAudioStreamHandler({ onAudioChunk }),
    [onAudioChunk]
  );

  const startRecordingSession = useCallback(async (): Promise<void> => {
    if (isStartingRef.current || isRecordingRef.current || isAudioRecording) return;
    isStartingRef.current = true;
    try {
      const permission = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showError(t('voice.microphonePermission'));
        onCancel();
        return;
      }
      const result = await startRecording(
        buildRecordingConfig(handleAudioStream, handleAudioAnalysis)
      );
      lastRecordingUriRef.current = result?.fileUri || null;
      isRecordingRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      logError('Recording start error:', error);
      showError(t('voice.startRecordingFailed'));
      onCancel();
      isRecordingRef.current = false;
    } finally {
      isStartingRef.current = false;
    }
  }, [
    handleAudioAnalysis,
    handleAudioStream,
    isAudioRecording,
    onCancel,
    showError,
    startRecording,
  ]);

  const handleCancel = useCallback(async (): Promise<void> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      cleanup();
      onCancel();
    });
  }, [cleanup, onCancel, slideAnim]);

  const handleDone = useCallback(async (): Promise<void> => {
    if ((!isAudioRecording && !isRecordingRef.current) || isTranscribing) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsTranscribing(true);

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    try {
      const result = await finishRecording({
        stopRecording: safeStopRecording,
        lastRecordingUri: lastRecordingUriRef.current,
        recordingDuration,
        languageCode,
        languageName,
        transcribeAudio,
        liveTranscript,
      });

      if (result.success) {
        onTranscriptionComplete(result.transcription, result.audio);
        return;
      }

      showError(result.errorMessage);
      onCancel();
    } catch (error) {
      logError('Transcription error:', error);
      showError(t('voice.transcriptionFailed'));
      onCancel();
    }
  }, [
    isAudioRecording,
    isTranscribing,
    recordingDuration,
    languageCode,
    languageName,
    liveTranscript,
    onCancel,
    onTranscriptionComplete,
    showError,
    transcribeAudio,
    safeStopRecording,
  ]);

  const { slideAnim, pulseAnim, textOpacity } = useRecorderAnimations({
    isRecording: isAudioRecording,
    onStart: startRecordingSession,
    onCleanup: cleanup,
  });

  useEffect(() => {
    if (!isAudioRecording) return;
    if (recordingDuration >= MAX_RECORDING_DURATION) {
      handleDone();
    }
  }, [handleDone, isAudioRecording, recordingDuration]);

  return {
    audioLevel,
    handleCancel,
    handleDone,
    isRecording: isAudioRecording,
    isSpeaking,
    isTranscribing,
    pulseAnim,
    recordingDuration,
    slideAnim,
    textOpacity,
  };
}
