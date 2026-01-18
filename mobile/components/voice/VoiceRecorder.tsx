import React from 'react';
import { Platform } from 'react-native';
import NativeVoiceRecorder from './NativeVoiceRecorder';
import WebVoiceRecorder from './WebVoiceRecorder';
import type { AudioData, TranscriptionResult } from './recordingTranscription';

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
}

/**
 * Platform-aware VoiceRecorder component
 * - Web: Uses MediaRecorder API
 * - Native: Uses expo-audio-studio with Gemini live transcription
 */
export default function VoiceRecorder(props: VoiceRecorderProps): JSX.Element {
  if (Platform.OS === 'web') {
    return <WebVoiceRecorder {...props} />;
  }

  return <NativeVoiceRecorder {...props} />;
}
