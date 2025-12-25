import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  Platform,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import { ELEVATION } from '../constants/elevation';
import AppIcon from './ui/AppIcon';
import { t } from '../constants/strings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_RECORDING_DURATION = 120; // 2 minutes max
const SILENCE_THRESHOLD = -45; // dB threshold for silence detection
const WAVEFORM_POINTS = 120; // High resolution for a 'liquid line' look

export default function VoiceRecorder({ 
  onTranscriptionComplete, 
  onCancel,
  transcribeAudio,
}) {
  const { theme, language } = useApp();
  const { showError } = useToast();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === 'dark';
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wavePhase = useRef(new Animated.Value(0)).current;
  const waveAmplitude = useRef(new Animated.Value(0)).current;
  const waveAnimationRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    return () => {
      cleanup();
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRecording]);

  // Animate sine wave phase continuously when speaking
  useEffect(() => {
    if (isSpeaking && isRecording) {
      // Start continuous phase animation for the 'liquid' ripple effect
      const animatePhase = () => {
        waveAnimationRef.current = Animated.loop(
          Animated.timing(wavePhase, {
            toValue: 2 * Math.PI,
            duration: 1000, // Slower, more elegant ripple
            useNativeDriver: true,
            easing: Easing.linear,
          })
        );
        waveAnimationRef.current.start();
      };

      // Animate amplitude based on audio level - high sensitivity mapping
      Animated.spring(waveAmplitude, {
        toValue: Math.min(1.2, audioLevel * 2.5),
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();

      animatePhase();
    } else {
      // Stop animation and reduce amplitude when silent
      if (waveAnimationRef.current) {
        waveAnimationRef.current.stop();
      }
      Animated.timing(waveAmplitude, {
        toValue: 0.05, // Keeps a tiny 'pulse' alive even in silence
        duration: 400,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (waveAnimationRef.current) {
        waveAnimationRef.current.stop();
      }
    };
  }, [isSpeaking, isRecording, audioLevel]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (waveAnimationRef.current) waveAnimationRef.current.stop();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
    }
  };

  const startRecording = async () => {
    try {
      let { status } = await Audio.getPermissionsAsync();
      
      if (status !== 'granted') {
        const response = await Audio.requestPermissionsAsync();
        status = response.status;
      }

      if (status !== 'granted') {
        showError(t('voice.microphonePermission'));
        onCancel();
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
      
      // Enable metering for waveform with silence detection
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          handleMeteringUpdate(status.metering);
        }
      });

      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_RECORDING_DURATION) {
            handleDone();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Recording start error:', error);
      showError(t('voice.startRecordingFailed'));
      onCancel();
    }
  };

  const handleMeteringUpdate = (metering) => {
    // Normalize metering value (-160 to 0) to 0-1
    // EXTREME sensitivity: map -60dB to -10dB as the active range
    // Speech usually peaks at -10 to -20, whispers at -45 to -55
    const normalized = Math.max(0, (metering + 60) / 50);
    setAudioLevel(normalized);

    // Detect if user is speaking (above silence threshold)
    if (metering > SILENCE_THRESHOLD) {
      setIsSpeaking(true);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } else {
      if (!silenceTimeoutRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
          silenceTimeoutRef.current = null;
        }, 400); // 400ms debounce
      }
    }
  };

  const handleCancel = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Slide out animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      cleanup();
      onCancel();
    });
  }, [onCancel]);

  const handleDone = useCallback(async () => {
    if (!recordingRef.current || isTranscribing) return;

    // SNAP UX: Provide immediate feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsTranscribing(true); // Show local loading state

    // Stop timers and animation
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (waveAnimationRef.current) waveAnimationRef.current.stop();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) {
        showError(t('voice.recordingFailed'));
        onCancel();
        return;
      }

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Execute transcription
      const result = await transcribeAudio({
        uri,
        base64,
        duration: recordingDuration,
        language: language?.code || 'en',
      });

      if (result.success && result.transcription) {
        onTranscriptionComplete(result.transcription, { uri, base64, duration: recordingDuration });
      } else {
        showError(result.error || t('voice.couldNotTranscribeAudio'));
        onCancel();
      }

    } catch (error) {
      console.error('Transcription error:', error);
      showError(t('voice.transcriptionFailed'));
      onCancel();
    }
  }, [recordingDuration, isTranscribing, onTranscriptionComplete, onCancel, transcribeAudio, language]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bottomPadding = Math.max(insets.bottom, SPACING.md);
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

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
                })
              }
            ],
            opacity: slideAnim,
          }
        ]}
      >
        {isTranscribing ? (
          // Transcribing State
          <View style={styles.transcribingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.transcribingText, { color: theme.text }]}>
              {t('voice.transcribing')}
            </Text>
          </View>
        ) : (
          // Recording State
          <>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.recordingIndicator}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
                </Animated.View>
                <Text style={[styles.recordingLabel, { color: theme.error }]}>
                  {t('voice.recording')}
                </Text>
              </View>
              <Text style={[styles.duration, { color: theme.text }]}>
                {formatDuration(recordingDuration)}
              </Text>
            </View>

            {/* Animated Liquid Line Waveform */}
            <View style={styles.waveformContainer}>
              <View style={styles.sineWaveContainer}>
                {Array.from({ length: WAVEFORM_POINTS }).map((_, index) => {
                  const x = index / (WAVEFORM_POINTS - 1);
                  const position = x * 100;
                  
                  // Wave parameters
                  const frequency = Math.PI * 4;
                  const offset = x * frequency;
                  
                  // Gaussian-like taper: stays flat at edges (x=0 and x=1), wiggles in middle
                  // formula: exp(-0.5 * ((x - 0.5) / 0.25)^2)
                  const taper = Math.exp(-0.5 * Math.pow((x - 0.5) / 0.22, 2));

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.sineWavePoint,
                        {
                          backgroundColor: theme.accent,
                          left: `${position}%`,
                          transform: [
                            {
                              translateY: Animated.multiply(
                                waveAmplitude,
                                wavePhase.interpolate({
                                  inputRange: [0, 2 * Math.PI],
                                  outputRange: [
                                    Math.sin(offset) * taper * 25, 
                                    Math.sin(offset + 2 * Math.PI) * taper * 25
                                  ]
                                })
                              )
                            }
                          ],
                          opacity: isSpeaking ? 0.9 : 0.2,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Speaking indicator */}
              <Text style={[styles.speakingHint, { color: theme.textMuted }]}>
                {isSpeaking ? t('voice.listening') : t('voice.waitingForSpeech')}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.cancelButton, { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : theme.errorLight }]}
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

            {/* Hint */}
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              {t('voice.recordingHint')}
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.floatingInputMargin,
    paddingTop: SPACING.sm,
  },
  container: {
    borderRadius: 24,
    borderWidth: 0,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    ...ELEVATION.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  duration: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  waveformContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: SPACING.lg,
    overflow: 'hidden', // Ensures zero overlap with surrounding text
  },
  sineWaveContainer: {
    width: '100%',
    height: 40,
    position: 'relative',
  },
  sineWavePoint: {
    position: 'absolute',
    width: 1.5, // Thin thread look
    height: 1.5,
    borderRadius: 0.75,
    top: '50%',
    marginTop: -0.75,
  },
  speakingHint: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING['3xl'],
    marginBottom: SPACING.md,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: 16,
    gap: SPACING.xs,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: 16,
    gap: SPACING.xs,
  },
  buttonLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  hint: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: TYPOGRAPHY.sizes.xs * TYPOGRAPHY.lineHeights.relaxed,
  },
  transcribingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
    gap: SPACING.lg,
  },
  transcribingText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});

