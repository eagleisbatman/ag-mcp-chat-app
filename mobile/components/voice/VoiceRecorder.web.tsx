import React from 'react';
import WebVoiceRecorder from './WebVoiceRecorder';
import type { AudioData, TranscriptionResult } from './recordingTranscription';

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
}

/**
 * Web VoiceRecorder - uses batch transcription
 * Records audio, then sends to API for transcription when done
 */
export default function VoiceRecorder({
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
}: VoiceRecorderProps): JSX.Element {
  return (
    <WebVoiceRecorder
      onTranscriptionComplete={onTranscriptionComplete}
      onCancel={onCancel}
      transcribeAudio={transcribeAudio}
    />
  );
}
