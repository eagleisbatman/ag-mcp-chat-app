import { Dispatch, SetStateAction } from 'react';
import { extractAudioLevel, extractBase64Chunk } from './recordingHelpers';

interface AudioAnalysisHandlerOptions {
  setAudioLevel: Dispatch<SetStateAction<number>>;
  setIsSpeaking: Dispatch<SetStateAction<boolean>>;
  silenceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastLevelRef: React.MutableRefObject<number>;
}

export function createAudioAnalysisHandler({
  setAudioLevel,
  setIsSpeaking,
  silenceTimeoutRef,
  lastLevelRef,
}: AudioAnalysisHandlerOptions) {
  return (event: unknown) => {
    const { level, isSpeaking: nextSpeaking } = extractAudioLevel(
      event as Parameters<typeof extractAudioLevel>[0],
      lastLevelRef.current
    );
    lastLevelRef.current = level;
    setAudioLevel(level);

    if (nextSpeaking) {
      setIsSpeaking(true);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      return;
    }

    if (!silenceTimeoutRef.current) {
      silenceTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
        silenceTimeoutRef.current = null;
      }, 400);
    }
  };
}

interface AudioStreamHandlerOptions {
  onAudioChunk?: (base64: string) => void;
}

export function createAudioStreamHandler({ onAudioChunk }: AudioStreamHandlerOptions) {
  return (event: unknown) => {
    if (!onAudioChunk) return;
    const chunk = extractBase64Chunk(event as Parameters<typeof extractBase64Chunk>[0]);
    if (chunk) onAudioChunk(chunk);
  };
}
