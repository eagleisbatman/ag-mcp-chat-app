import { transcribeAudio as transcribeAudioService } from '../../../services/transcription';
import { uploadAudio } from '../../../services/upload';
import { t } from '../../../constants/strings';
import type { AudioData, TranscribeResult, UploadResult } from './types';

export async function transcribeAudioForInput(audioData: AudioData, languageCode?: string): Promise<TranscribeResult> {
  try {
    const result = await transcribeAudioService(audioData.base64, audioData.language || languageCode);
    if (!result.success || !result.text) {
      return { success: false, error: result.error || t('voice.couldNotTranscribeAudio') };
    }
    return { success: true, transcription: result.text };
  } catch {
    return { success: false, error: t('voice.transcriptionFailed') };
  }
}

/**
 * Detect audio format from data URL or default to m4a
 */
function detectAudioFormat(base64: string): string {
  if (base64.startsWith('data:')) {
    // Extract mimeType from data URL: data:audio/webm;codecs=opus;base64,...
    const match = base64.match(/^data:audio\/([^;,]+)/);
    if (match) {
      const format = match[1];
      // Map common formats
      if (format === 'mp4' || format === 'x-m4a') return 'm4a';
      if (format === 'mpeg') return 'mp3';
      return format; // webm, wav, ogg, etc.
    }
  }
  return 'm4a'; // Default for native mobile recordings
}

export async function uploadAudioInBackground(audioData: AudioData | null): Promise<UploadResult> {
  if (!audioData?.base64) return { success: false };
  try {
    const format = detectAudioFormat(audioData.base64);
    return await uploadAudio(audioData.base64, format);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
