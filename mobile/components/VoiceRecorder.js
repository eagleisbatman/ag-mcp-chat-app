import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

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
        showError('Microphone permission required');
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
      showError('Failed to start recording');
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
        showError('Recording failed');
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
        showError(result.error || 'Could not transcribe audio');
        onCancel();
      }

    } catch (error) {
      console.error('Transcription error:', error);
      showError('Failed to process recording');
      onCancel();
    }
  }, [recordingDuration, isTranscribing, onTranscriptionComplete, onCancel, transcribeAudio, language]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
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
            Transcribing...
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
                Recording
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
                    backgroundColor: theme.accent,
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
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.errorLight }]}
              onPress={handleCancel}
            >
              <Ionicons name="close" size={28} color={theme.error} />
              <Text style={[styles.buttonLabel, { color: theme.error }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.accent }]}
              onPress={handleDone}
            >
              <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Hint */}
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Tap Done to transcribe, or Cancel to discard
          </Text>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  duration: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 3,
    marginBottom: 24,
  },
  waveformBar: {
    width: (SCREEN_WIDTH - 80) / WAVEFORM_BARS - 3,
    height: 50,
    borderRadius: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 12,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 4,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 4,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
  },
  transcribingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  transcribingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

