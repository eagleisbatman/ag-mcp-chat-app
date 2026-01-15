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

export async function uploadAudioInBackground(audioData: AudioData | null): Promise<UploadResult> {
  if (!audioData?.base64) return { success: false };
  try {
    return await uploadAudio(audioData.base64, 'm4a');
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
