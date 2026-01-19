import React, { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import WebVoiceRecorder from './WebVoiceRecorder';
import { useGeminiLiveTranscription } from './useGeminiLiveTranscription';
import { useApp } from '../../contexts/AppContext';
import { log } from '../../utils/logger';
import type { AudioData, TranscriptionResult } from './recordingTranscription';

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, audioData: AudioData) => void;
  onCancel: () => void;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
}

/**
 * VoiceRecorder component with streaming ASR support
 *
 * Uses WebSocket-based Gemini Live API for real-time transcription on web.
 * Falls back to REST API transcription on native platforms (simulators).
 */
export default function VoiceRecorder({
  onTranscriptionComplete,
  onCancel,
  transcribeAudio,
}: VoiceRecorderProps): JSX.Element {
  const { language } = useApp();
  const connectedRef = useRef(false);

  // Use streaming transcription for real-time feedback (web only for now)
  const {
    transcript: liveTranscript,
    isConnected,
    connectionState,
    connect,
    disconnect,
    sendAudioChunk,
    clearTranscript,
  } = useGeminiLiveTranscription();

  // Connect to streaming ASR when component mounts (web only)
  useEffect(() => {
    const langCode = language?.code || 'en';
    if (Platform.OS === 'web' && !connectedRef.current) {
      connectedRef.current = true;
      log('[VoiceRecorder] Connecting to streaming ASR for language:', langCode);
      connect(langCode);
    }

    return () => {
      if (connectedRef.current) {
        connectedRef.current = false;
        log('[VoiceRecorder] Disconnecting from streaming ASR');
        disconnect();
      }
    };
  }, [language?.code, connect, disconnect]);

  // Handle audio chunks for streaming transcription
  const handleAudioChunk = useCallback((base64: string) => {
    if (isConnected && Platform.OS === 'web') {
      // Send audio chunk with proper MIME type for the Gemini Live API
      sendAudioChunk(base64, 'audio/webm;codecs=opus');
    }
  }, [isConnected, sendAudioChunk]);

  // Wrap cancel to also disconnect streaming
  const handleCancel = useCallback(() => {
    clearTranscript();
    onCancel();
  }, [clearTranscript, onCancel]);

  // Wrap transcription complete to clear transcript
  const handleTranscriptionComplete = useCallback((transcription: string, audioData: AudioData) => {
    clearTranscript();
    onTranscriptionComplete(transcription, audioData);
  }, [clearTranscript, onTranscriptionComplete]);

  return (
    <WebVoiceRecorder
      onTranscriptionComplete={handleTranscriptionComplete}
      onCancel={handleCancel}
      transcribeAudio={transcribeAudio}
      liveTranscript={Platform.OS === 'web' ? liveTranscript : undefined}
      onAudioChunk={Platform.OS === 'web' ? handleAudioChunk : undefined}
    />
  );
}
