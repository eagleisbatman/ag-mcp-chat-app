import React, { useMemo } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { SPACING } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';
import WaveformTravelingBars from './WaveformTravelingBars';
import { useWebVoiceRecording } from './useWebVoiceRecording';
import { styles } from './voiceRecorderStyles';
import type { AudioData, TranscriptionResult } from './recordingTranscription';

interface WebVoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
  liveTranscript?: string;
  onAudioChunk?: (base64: string) => void;
}

export default function WebVoiceRecorder({
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
  liveTranscript,
  onAudioChunk,
}: WebVoiceRecorderProps): JSX.Element {
  const { theme, language } = useApp();
  const { showError } = useToast();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === 'dark';

  const {
    audioLevel,
    handleCancel,
    handleDone,
    isSpeaking,
    isTranscribing,
    pulseAnim,
    recordingDuration,
    slideAnim,
    textOpacity,
  } = useWebVoiceRecording({
    languageCode: language?.code || 'en',
    languageName: language?.name,
    onTranscriptionComplete,
    onCancel,
    transcribeAudio,
    showError,
    onAudioChunk,
    liveTranscript,
  });

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
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel={t('voice.cancel')}
              style={[
                styles.cancelButton,
                { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : theme.errorLight },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: theme.error }]}>{t('voice.cancel')}</Text>
            </Pressable>
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

            {liveTranscript ? (
              <View style={styles.liveTranscript}>
                <Text style={[styles.liveTranscriptLabel, { color: theme.textMuted }]}>
                  {t('voice.liveTranscription')}
                </Text>
                <Text style={[styles.liveTranscriptText, { color: theme.text }]}>
                  {liveTranscript}
                </Text>
              </View>
            ) : null}

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
