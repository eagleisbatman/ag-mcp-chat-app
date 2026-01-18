import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { t } from '../../constants/strings';
import { error as logError, log } from '../../utils/logger';
import { MAX_RECORDING_DURATION } from './recordingOptions';
import type { AudioData, TranscriptionResult } from './recordingTranscription';
import { useRecorderAnimations } from './useRecorderAnimations';

interface UseWebVoiceRecordingOptions {
  languageCode: string;
  languageName?: string;
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
  showError: (message: string) => void;
  onAudioChunk?: (base64: string) => void;
  liveTranscript?: string;
}

// Convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useWebVoiceRecording({
  languageCode,
  languageName,
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
  showError,
  liveTranscript,
}: UseWebVoiceRecordingOptions) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnimRef = useRef<Animated.Value | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioLevel(0);
    setIsSpeaking(false);
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    const normalizedLevel = Math.min(1, average / 128);

    setAudioLevel(normalizedLevel);
    setIsSpeaking(normalizedLevel > 0.1);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isRecording]);

  const startRecordingSession = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'web') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start audio analysis
      analyzeAudio();

      log('Web voice recording started');
    } catch (error) {
      logError('Web recording start error:', error);
      showError(t('voice.microphonePermission'));
      onCancel();
    }
  }, [analyzeAudio, onCancel, showError]);

  const handleCancel = useCallback(async (): Promise<void> => {
    const anim = slideAnimRef.current;
    if (anim) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        cleanup();
        onCancel();
      });
    } else {
      cleanup();
      onCancel();
    }
  }, [cleanup, onCancel]);

  const handleDone = useCallback(async (): Promise<void> => {
    if (!isRecording || isTranscribing) return;

    setIsTranscribing(true);

    try {
      // Stop recording and get audio data
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        throw new Error('No media recorder');
      }

      // Wait for final data
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        mediaRecorder.stop();
      });

      // Stop tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Create blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const base64 = await blobToBase64(audioBlob);

      // Create a blob URL for the audio
      const uri = URL.createObjectURL(audioBlob);

      // Use live transcript if available, otherwise call API
      if (liveTranscript && liveTranscript.trim()) {
        onTranscriptionComplete(liveTranscript.trim(), { uri, base64, duration: recordingDuration });
        cleanup();
        return;
      }

      // Call transcription API
      const result = await transcribeAudio({
        uri,
        base64,
        duration: recordingDuration,
        language: languageCode,
      });

      if (result.success && result.transcription) {
        onTranscriptionComplete(result.transcription, { uri, base64, duration: recordingDuration });
      } else {
        showError(result.error || t('voice.transcriptionFailed'));
        onCancel();
      }
    } catch (error) {
      logError('Web transcription error:', error);
      showError(t('voice.transcriptionFailed'));
      onCancel();
    } finally {
      cleanup();
    }
  }, [
    isRecording,
    isTranscribing,
    recordingDuration,
    languageCode,
    liveTranscript,
    onCancel,
    onTranscriptionComplete,
    showError,
    transcribeAudio,
    cleanup,
  ]);

  const { slideAnim, pulseAnim, textOpacity } = useRecorderAnimations({
    isRecording,
    onStart: startRecordingSession,
    onCleanup: cleanup,
  });

  // Store slideAnim in ref for use in callbacks
  slideAnimRef.current = slideAnim;

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && recordingDuration >= MAX_RECORDING_DURATION) {
      handleDone();
    }
  }, [handleDone, isRecording, recordingDuration]);

  return {
    audioLevel,
    handleCancel,
    handleDone,
    isRecording,
    isSpeaking,
    isTranscribing,
    pulseAnim,
    recordingDuration,
    slideAnim,
    textOpacity,
  };
}
