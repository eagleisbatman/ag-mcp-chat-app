import * as FileSystem from 'expo-file-system/legacy';
import { t } from '../../constants/strings';
import { LIVE_TRANSCRIPT_MIN_CHARS, TRANSCRIPTION_TIMEOUT_MS } from './recordingOptions';

export interface TranscriptionResult {
  success: boolean;
  transcription?: string;
  error?: string;
  errorCode?: string;
  errorDetails?: {
    expected?: string;
    detected?: string;
  };
}

export interface AudioData {
  uri: string;
  base64: string;
  duration: number;
}

interface FinishRecordingParams {
  stopRecording: () => Promise<{ fileUri?: string } | undefined>;
  lastRecordingUri: string | null;
  recordingDuration: number;
  languageCode: string;
  languageName?: string;
  transcribeAudio: (data: { uri: string; base64: string; duration: number; language: string }) => Promise<TranscriptionResult>;
  liveTranscript?: string;
  transcriptionTimeoutMs?: number;
}

/**
 * Convert a TranscriptionResult error code to a user-friendly message.
 * Re-usable across both native and web recorders.
 */
export function getTranscriptionErrorMessage(
  result: TranscriptionResult,
  languageName?: string,
): string {
  switch (result.errorCode) {
    case 'LANGUAGE_MISMATCH':
      return t('voice.languageMismatch', {
        expected: result.errorDetails?.expected || languageName || 'selected language',
        detected: result.errorDetails?.detected || 'another language',
      });
    case 'NO_SPEECH':
      return t('voice.noSpeechDetected');
    case 'AUDIO_TOO_SHORT':
      return t('voice.audioTooShort');
    case 'AUDIO_QUALITY':
      return t('voice.audioQualityPoor');
    default:
      return result.error || t('voice.couldNotTranscribeAudio');
  }
}

export async function finishRecording({
  stopRecording,
  lastRecordingUri,
  recordingDuration,
  languageCode,
  languageName,
  transcribeAudio,
  liveTranscript,
  transcriptionTimeoutMs = TRANSCRIPTION_TIMEOUT_MS,
}: FinishRecordingParams): Promise<
  | { success: true; transcription: string; audio: AudioData }
  | { success: false; errorMessage: string }
> {
  const result = await stopRecording();
  const uri = result?.fileUri || lastRecordingUri;
  if (!uri) {
    return { success: false, errorMessage: t('voice.recordingFailed') };
  }

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const trimmedLive = (liveTranscript || '').trim();
  const canUseLive = trimmedLive.length >= LIVE_TRANSCRIPT_MIN_CHARS;
  const transcriptionPromise = transcribeAudio({
    uri,
    base64,
    duration: recordingDuration,
    language: languageCode || 'en',
  });
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), transcriptionTimeoutMs);
  });
  const transcriptResult = canUseLive
    ? await Promise.race([transcriptionPromise, timeoutPromise])
    : await transcriptionPromise;

  if (transcriptResult && transcriptResult.success && transcriptResult.transcription) {
    return {
      success: true,
      transcription: transcriptResult.transcription,
      audio: { uri, base64, duration: recordingDuration },
    };
  }

  if (!transcriptResult && canUseLive) {
    return {
      success: true,
      transcription: trimmedLive,
      audio: { uri, base64, duration: recordingDuration },
    };
  }

  if (transcriptResult && !transcriptResult.success && canUseLive) {
    return {
      success: true,
      transcription: trimmedLive,
      audio: { uri, base64, duration: recordingDuration },
    };
  }

  const errorMessage = transcriptResult
    ? getTranscriptionErrorMessage(transcriptResult, languageName)
    : t('voice.couldNotTranscribeAudio');

  return { success: false, errorMessage };
}
