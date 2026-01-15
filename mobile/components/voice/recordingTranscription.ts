import * as FileSystem from 'expo-file-system/legacy';
import { t } from '../../constants/strings';

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
}

export async function finishRecording({
  stopRecording,
  lastRecordingUri,
  recordingDuration,
  languageCode,
  languageName,
  transcribeAudio,
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
  const transcriptResult = await transcribeAudio({
    uri,
    base64,
    duration: recordingDuration,
    language: languageCode || 'en',
  });

  if (transcriptResult.success && transcriptResult.transcription) {
    return {
      success: true,
      transcription: transcriptResult.transcription,
      audio: { uri, base64, duration: recordingDuration },
    };
  }

  let errorMessage: string;
  switch (transcriptResult.errorCode) {
    case 'LANGUAGE_MISMATCH':
      errorMessage = t('voice.languageMismatch', {
        expected: transcriptResult.errorDetails?.expected || languageName || 'selected language',
        detected: transcriptResult.errorDetails?.detected || 'another language',
      });
      break;
    case 'NO_SPEECH':
      errorMessage = t('voice.noSpeechDetected');
      break;
    case 'AUDIO_TOO_SHORT':
      errorMessage = t('voice.audioTooShort');
      break;
    case 'AUDIO_QUALITY':
      errorMessage = t('voice.audioQualityPoor');
      break;
    default:
      errorMessage = transcriptResult.error || t('voice.couldNotTranscribeAudio');
  }

  return { success: false, errorMessage };
}
