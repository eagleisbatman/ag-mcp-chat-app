import { useCallback, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface LiveSpeechRecognitionOptions {
  languageCode: string;
  onError?: (message: string) => void;
}

interface LiveSpeechRecognitionState {
  isRecognizing: boolean;
  transcript: string;
  startRecognition: () => Promise<void>;
  stopRecognition: () => void;
  resetTranscript: () => void;
}

function toSpeechLocale(languageCode: string): string {
  if (!languageCode) return 'en-US';
  if (languageCode.includes('-')) return languageCode;
  if (languageCode === 'en') return 'en-US';
  return languageCode;
}

export function useLiveSpeechRecognition({
  languageCode,
  onError,
}: LiveSpeechRecognitionOptions): LiveSpeechRecognitionState {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');

  useSpeechRecognitionEvent('start', () => setIsRecognizing(true));
  useSpeechRecognitionEvent('end', () => setIsRecognizing(false));
  useSpeechRecognitionEvent('result', (event) => {
    const next = event?.results?.[0]?.transcript ?? '';
    if (next) setTranscript(next);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setIsRecognizing(false);
    if (event?.message) onError?.(event.message);
  });

  const startRecognition = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      onError?.('Speech recognition permission not granted.');
      return;
    }

    const lang = toSpeechLocale(languageCode);
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: true,
    });
  }, [languageCode, onError]);

  const stopRecognition = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return {
    isRecognizing,
    transcript,
    startRecognition,
    stopRecognition,
    resetTranscript,
  };
}
