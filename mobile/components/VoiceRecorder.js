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
const WAVEFORM_BARS = 30;
const MAX_RECORDING_DURATION = 120; // 2 minutes max

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
  const [waveformLevels, setWaveformLevels] = useState(
    Array(WAVEFORM_BARS).fill(0.1)
  );
  
  // Refs
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const waveformIntervalRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const waveformAnims = useRef(
    Array(WAVEFORM_BARS).fill(0).map(() => new Animated.Value(0.1))
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // Animate waveform bars
  useEffect(() => {
    waveformLevels.forEach((level, index) => {
      Animated.spring(waveformAnims[index], {
        toValue: level,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [waveformLevels]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
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
      
      // Enable metering for waveform
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          updateWaveform(status.metering);
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

      // Simulate waveform updates (expo-av metering can be unreliable)
      waveformIntervalRef.current = setInterval(() => {
        simulateWaveform();
      }, 100);

    } catch (error) {
      console.error('Recording start error:', error);
      showError(t('voice.startRecordingFailed'));
      onCancel();
    }
  };

  const updateWaveform = (metering) => {
    // Normalize metering value (-160 to 0) to 0-1
    const normalized = Math.max(0, (metering + 60) / 60);
    setWaveformLevels(prev => {
      const newLevels = [...prev.slice(1), normalized];
      return newLevels;
    });
  };

  const simulateWaveform = () => {
    setWaveformLevels(prev => {
      const newLevels = [...prev.slice(1)];
      // Random value between 0.2 and 1 for visual effect
      const newValue = 0.2 + Math.random() * 0.8;
      newLevels.push(newValue);
      return newLevels;
    });
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
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Stop timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    
    setIsRecording(false);
    setIsTranscribing(true);

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

      // Transcribe
      const result = await transcribeAudio({
        uri,
        base64,
        duration: recordingDuration,
        language: language?.code || 'en',
      });

      if (result.success && result.transcription) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            <ActivityIndicator size="large" color={theme.iconPrimary || theme.accent} />
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

            {/* Waveform */}
            <View style={styles.waveformContainer}>
              {waveformAnims.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      backgroundColor: theme.accentBright || theme.accent,
                      transform: [
                        {
                          scaleY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.1, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.cancelButton, { backgroundColor: theme.errorLight }]}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.cancelRecording')}
                android_ripple={Platform.OS === 'android' ? { color: rippleColor } : undefined}
              >
                <AppIcon name="close" size={24} color={theme.error} />
                <Text style={[styles.buttonLabel, { color: theme.error }]}>{t('voice.cancel')}</Text>
              </Pressable>

              <Pressable
                style={[styles.doneButton, { backgroundColor: theme.iconPrimary || theme.accent }]}
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
    // Removed absolute positioning for keyboard compatibility
    paddingHorizontal: SPACING.floatingInputMargin,
    paddingTop: SPACING.sm,
  },
  container: {
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    ...ELEVATION.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 3,
    marginBottom: SPACING.xl,
  },
  waveformBar: {
    width: (SCREEN_WIDTH - 100) / WAVEFORM_BARS - 3,
    height: 40,
    borderRadius: 2,
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
    borderRadius: 0,
    gap: SPACING.xs,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: 0,
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
