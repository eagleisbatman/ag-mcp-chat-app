import React from 'react';
import { Platform } from 'react-native';
import WebVoiceRecorder from './WebVoiceRecorder';
import NativeVoiceRecorder from './NativeVoiceRecorder';
import type { AudioData, TranscriptionResult } from './recordingTranscription';

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
}

/**
 * VoiceRecorder component
 * Uses native expo-av on iOS/Android, Web APIs on web
 */
export default function VoiceRecorder({
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
}: VoiceRecorderProps): JSX.Element {
  // Use native recorder on iOS/Android, web recorder on web
  if (Platform.OS === 'web') {
    return (
      <WebVoiceRecorder
        onTranscriptionComplete={onTranscriptionComplete}
        onCancel={onCancel}
        transcribeAudio={transcribeAudio}
      />
    );
  }

  return (
    <NativeVoiceRecorder
      onTranscriptionComplete={onTranscriptionComplete}
      onCancel={onCancel}
      transcribeAudio={transcribeAudio}
    />
  );
}
