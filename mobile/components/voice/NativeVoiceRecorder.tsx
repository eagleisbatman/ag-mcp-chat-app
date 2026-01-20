/**
 * Native Voice Recorder using expo-av
 * Works on iOS and Android through Expo
 */
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { SPACING } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import WaveformTravelingBars from './WaveformTravelingBars';
import { styles } from './voiceRecorderStyles';
import { MAX_RECORDING_DURATION } from './recordingOptions';
import { useRecorderAnimations } from './useRecorderAnimations';
import { log, error as logError } from '../../utils/logger';
import type { AudioData, TranscriptionResult } from './recordingTranscription';

interface NativeVoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
}

export default function NativeVoiceRecorder({
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
}: NativeVoiceRecorderProps): JSX.Element {
  const { theme, language } = useApp();
  const { showError } = useToast();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === 'dark';
  const languageCode = language?.code || 'en';

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnimRef = useRef<Animated.Value | null>(null);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanup = useCallback(async () => {
    log('[NativeVoice] Cleanup');

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (e) {
        // Ignore
      }
      recordingRef.current = null;
    }

    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (e) {
      // Ignore
    }

    if (mountedRef.current) {
      setIsRecording(false);
      setRecordingDuration(0);
      setAudioLevel(0);
      setIsSpeaking(false);
    }
  }, []);

  const startRecordingSession = useCallback(async (): Promise<void> => {
    if (startedRef.current) {
      log('[NativeVoice] Already started');
      return;
    }
    startedRef.current = true;
    log('[NativeVoice] Starting native recording');

    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        },
        isMeteringEnabled: true,
      });

      await recording.startAsync();
      recordingRef.current = recording;

      if (!mountedRef.current) {
        await recording.stopAndUnloadAsync();
        return;
      }

      setIsRecording(true);

      // Duration timer
      durationIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          setRecordingDuration(prev => prev + 1);
        }
      }, 1000);

      // Audio metering
      meterIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current || !mountedRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Convert dB to 0-1 scale (metering is typically -160 to 0)
            const db = status.metering;
            const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
            setAudioLevel(normalized);
            setIsSpeaking(normalized > 0.15);
          }
        } catch (e) {
          // Ignore metering errors
        }
      }, 100);

      log('[NativeVoice] Recording started');

    } catch (error) {
      logError('[NativeVoice] Start error:', error);
      startedRef.current = false;
      const err = error as Error;
      if (err.message?.includes('permission')) {
        showError(t('voice.microphonePermission'));
      } else {
        showError(err.message || t('voice.recordingFailed'));
      }
      onCancel();
    }
  }, [onCancel, showError]);

  const handleCancel = useCallback(() => {
    log('[NativeVoice] Cancel');
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
    if (!recordingRef.current || isTranscribing) return;

    log('[NativeVoice] Done pressed');
    setIsTranscribing(true);

    // Stop intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }

    try {
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (!uri) {
        throw new Error('No recording URI');
      }

      log('[NativeVoice] Recording URI:', uri);

      // Read file as base64
      const base64Raw = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const base64 = `data:audio/m4a;base64,${base64Raw}`;
      const duration = recordingDuration;

      log('[NativeVoice] Calling transcription API, base64 length:', base64Raw.length);

      const result = await transcribeAudio({
        uri,
        base64,
        duration,
        language: languageCode,
      });

      if (result.success && result.transcription) {
        onTranscriptionComplete(result.transcription, { uri, base64, duration });
      } else {
        const errorMsg = result.error || t('voice.transcriptionFailed');
        log('[NativeVoice] Transcription failed:', errorMsg);
        showError(errorMsg);
        onCancel();
      }

    } catch (error) {
      logError('[NativeVoice] Done error:', error);
      showError(t('voice.transcriptionFailed'));
      onCancel();
    } finally {
      await cleanup();
    }
  }, [isTranscribing, recordingDuration, languageCode, cleanup, transcribeAudio, onTranscriptionComplete, showError, onCancel]);

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

  const bottomPadding = Math.max(insets.bottom, SPACING.md);
  const rippleColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(recordingDuration / 60);
    const secs = recordingDuration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [recordingDuration]);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: theme.border,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: slideAnim,
          },
        ]}
      >
        {isTranscribing ? (
          <View style={styles.transcribingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.transcribingText, { color: theme.text }]}>
              {t('voice.transcribing')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <View style={styles.recordingIndicator}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
                </Animated.View>
                <Text style={[styles.recordingLabel, { color: theme.error }]}>
                  {t('voice.recording')}
                </Text>
              </View>
              <Text style={[styles.duration, { color: theme.text }]}>{formattedDuration}</Text>
            </View>

            <View style={styles.waveformContainer}>
              <WaveformTravelingBars
                level={audioLevel}
                isSpeaking={isSpeaking}
                accentColor={theme.accent}
                mutedColor={theme.textMuted}
                barCount={36}
              />
              <Animated.Text style={[styles.speakingHint, { color: theme.textMuted, opacity: textOpacity }]}>
                {isSpeaking ? t('voice.listening') : t('voice.waitingForSpeech')}
              </Animated.Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[
                  styles.cancelButton,
                  { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : theme.errorLight },
                ]}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.cancelRecording')}
                android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
              >
                <AppIcon name="close" size={24} color={theme.error} />
                <Text style={[styles.buttonLabel, { color: theme.error }]}>{t('voice.cancel')}</Text>
              </Pressable>

              <Pressable
                style={[styles.doneButton, { backgroundColor: theme.accent }]}
                onPress={handleDone}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.finishRecording')}
                android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.12)' } : undefined}
              >
                <AppIcon name="checkmark" size={24} color="#FFFFFF" />
                <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>{t('voice.done')}</Text>
              </Pressable>
            </View>

            <Text style={[styles.hint, { color: theme.textMuted }]}>{t('voice.recordingHint')}</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}
