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

  // All refs for managing recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioAnalysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnimRef = useRef<Animated.Value | null>(null);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);

  // Stable refs for callbacks to avoid dependency issues
  const onCancelRef = useRef(onCancel);
  const showErrorRef = useRef(showError);
  const transcribeAudioRef = useRef(transcribeAudio);
  const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);

  // Update refs when props change
  useEffect(() => {
    onCancelRef.current = onCancel;
    showErrorRef.current = showError;
    transcribeAudioRef.current = transcribeAudio;
    onTranscriptionCompleteRef.current = onTranscriptionComplete;
  }, [onCancel, showError, transcribeAudio, onTranscriptionComplete]);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanup = useCallback(() => {
    log('[WebVoice] Cleanup');

    // Clear intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (audioAnalysisIntervalRef.current) {
      clearInterval(audioAnalysisIntervalRef.current);
      audioAnalysisIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // Ignore
        }
      });
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore
      }
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];

    if (mountedRef.current) {
      setIsRecording(false);
      setRecordingDuration(0);
      setAudioLevel(0);
      setIsSpeaking(false);
    }
  }, []);

  // Stable start function using refs
  const startRecordingSession = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'web') return;
    if (startedRef.current) {
      log('[WebVoice] Already started');
      return;
    }
    startedRef.current = true;

    log('[WebVoice] Starting...');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      // Audio analysis setup (simple, no requestAnimationFrame)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder setup
      const mimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      // Duration timer (using setInterval, not requestAnimationFrame)
      durationIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          setRecordingDuration(prev => prev + 1);
        }
      }, 1000);

      // Audio level analysis (using setInterval at 100ms, much safer than rAF)
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastLevel = 0;
      audioAnalysisIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !mountedRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        const rawLevel = Math.min(1, avg / 128);

        // Smooth decay: rise fast, fall slowly
        const level = rawLevel > lastLevel
          ? rawLevel  // Rise immediately
          : lastLevel * 0.7;  // Decay by 30% each interval
        lastLevel = level;

        // Apply minimum threshold to show flat when truly silent
        const displayLevel = level < 0.02 ? 0 : level;
        setAudioLevel(displayLevel);
        setIsSpeaking(displayLevel > 0.08);
      }, 100);

      log('[WebVoice] Recording started');

    } catch (error) {
      logError('[WebVoice] Start error:', error);
      startedRef.current = false;
      showErrorRef.current(t('voice.microphonePermission'));
      onCancelRef.current();
    }
  }, []);

  const handleCancel = useCallback(() => {
    log('[WebVoice] Cancel');
    const anim = slideAnimRef.current;
    if (anim) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        cleanup();
        onCancelRef.current();
      });
    } else {
      cleanup();
      onCancelRef.current();
    }
  }, [cleanup]);

  const handleDone = useCallback(async (): Promise<void> => {
    if (!mediaRecorderRef.current || isTranscribing) return;

    log('[WebVoice] Done pressed');
    setIsTranscribing(true);

    // Stop intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (audioAnalysisIntervalRef.current) {
      clearInterval(audioAnalysisIntervalRef.current);
      audioAnalysisIntervalRef.current = null;
    }

    try {
      const mediaRecorder = mediaRecorderRef.current;

      // Stop and wait for final data
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        } else {
          resolve();
        }
      });

      // Stop tracks
      streamRef.current?.getTracks().forEach(t => t.stop());

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      log('[WebVoice] Blob size:', audioBlob.size, 'mimeType:', mimeType);

      const rawBase64 = await blobToBase64(audioBlob);
      // Prepend data URL prefix with correct mime type for the API
      const base64 = `data:${mimeType};base64,${rawBase64}`;
      const uri = URL.createObjectURL(audioBlob);
      const duration = recordingDuration;

      // Use live transcript or call API
      if (liveTranscript?.trim()) {
        onTranscriptionCompleteRef.current(liveTranscript.trim(), { uri, base64, duration });
        cleanup();
        return;
      }

      const result = await transcribeAudioRef.current({
        uri,
        base64,
        duration,
        language: languageCode,
      });

      if (result.success && result.transcription) {
        onTranscriptionCompleteRef.current(result.transcription, { uri, base64, duration });
      } else {
        showErrorRef.current(result.error || t('voice.transcriptionFailed'));
        onCancelRef.current();
      }
    } catch (error) {
      logError('[WebVoice] Done error:', error);
      showErrorRef.current(t('voice.transcriptionFailed'));
      onCancelRef.current();
    } finally {
      cleanup();
    }
  }, [isTranscribing, recordingDuration, languageCode, liveTranscript, cleanup]);

  const { slideAnim, pulseAnim, textOpacity } = useRecorderAnimations({
    isRecording,
    onStart: startRecordingSession,
    onCleanup: cleanup,
  });

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
