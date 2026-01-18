import { useCallback, useEffect, useRef, useState } from 'react';
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnimRef = useRef<Animated.Value | null>(null);
  const isRecordingRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Audio analysis function - uses ref to check recording state
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    const normalizedLevel = Math.min(1, average / 128);

    setAudioLevel(normalizedLevel);
    setIsSpeaking(normalizedLevel > 0.1);

    // Continue analyzing while recording
    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, []);

  const cleanup = useCallback(() => {
    log('[WebVoice] Cleanup called');
    isRecordingRef.current = false;

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
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore
      }
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioLevel(0);
    setIsSpeaking(false);
  }, []);

  const startRecordingSession = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      log('[WebVoice] Not on web, skipping');
      return;
    }

    // Prevent multiple starts
    if (hasStartedRef.current) {
      log('[WebVoice] Already started, skipping');
      return;
    }
    hasStartedRef.current = true;

    log('[WebVoice] Starting recording session...');

    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available');
      }

      log('[WebVoice] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      log('[WebVoice] Got media stream');
      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        }
      }

      log('[WebVoice] Creating MediaRecorder with mimeType:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        logError('[WebVoice] MediaRecorder error:', event);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      isRecordingRef.current = true;
      setIsRecording(true);

      log('[WebVoice] Recording started');

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start audio analysis
      analyzeAudio();

    } catch (error) {
      logError('[WebVoice] Recording start error:', error);
      hasStartedRef.current = false;
      showError(t('voice.microphonePermission'));
      onCancel();
    }
  }, [analyzeAudio, onCancel, showError]);

  const handleCancel = useCallback(async (): Promise<void> => {
    log('[WebVoice] Cancel pressed');
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
    log('[WebVoice] Done pressed, isRecording:', isRecordingRef.current);
    if (!isRecordingRef.current || isTranscribing) return;

    setIsTranscribing(true);
    isRecordingRef.current = false;

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        throw new Error('No media recorder');
      }

      // Wait for final data
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        } else {
          resolve();
        }
      });

      // Stop tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Create blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      log('[WebVoice] Created audio blob, size:', audioBlob.size);

      const base64 = await blobToBase64(audioBlob);
      const uri = URL.createObjectURL(audioBlob);

      // Use live transcript if available, otherwise call API
      if (liveTranscript && liveTranscript.trim()) {
        log('[WebVoice] Using live transcript');
        onTranscriptionComplete(liveTranscript.trim(), { uri, base64, duration: recordingDuration });
        cleanup();
        return;
      }

      // Call transcription API
      log('[WebVoice] Calling transcription API...');
      const result = await transcribeAudio({
        uri,
        base64,
        duration: recordingDuration,
        language: languageCode,
      });

      if (result.success && result.transcription) {
        log('[WebVoice] Transcription successful:', result.transcription);
        onTranscriptionComplete(result.transcription, { uri, base64, duration: recordingDuration });
      } else {
        log('[WebVoice] Transcription failed:', result.error);
        showError(result.error || t('voice.transcriptionFailed'));
        onCancel();
      }
    } catch (error) {
      logError('[WebVoice] Transcription error:', error);
      showError(t('voice.transcriptionFailed'));
      onCancel();
    } finally {
      cleanup();
    }
  }, [
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
