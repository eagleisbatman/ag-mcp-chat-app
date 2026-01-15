import { useCallback, useEffect, useState } from 'react';
import { textToSpeech } from '../../services/tts';
import { playAudio, stopAudio } from '../../utils/audioPlayer';
import { generateDiagnosisTTSBrief, generateDiagnosisTTSText } from '../../utils/diagnosisNormalizer';
import { getDiagnosisTtsSummary } from '../../services/diagnosisSummary';
import { log } from '../../utils/logger';
import { t } from '../../constants/strings';
import type { LocationDetails, Message } from '../../types';

interface MessageTtsOptions {
  message: Message;
  languageCode: string;
  locationDetails: LocationDetails | null;
  onError: (message: string) => void;
}

export function useMessageTts({
  message,
  languageCode,
  locationDetails,
  onError,
}: MessageTtsOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localTtsUrl, setLocalTtsUrl] = useState(message.ttsAudioUrl);

  const resolveDiagnosisText = useCallback(async (): Promise<string | null> => {
    const brief = generateDiagnosisTTSBrief(message.diagnosisData);
    if (brief) return brief;
    const detailed = generateDiagnosisTTSText(message.diagnosisData);
    if (detailed) return detailed;
    const fallback = await getDiagnosisTtsSummary(message.diagnosisData, languageCode);
    return fallback;
  }, [languageCode, message.diagnosisData]);

  const handleSpeak = useCallback(async (): Promise<void> => {
    if (isSpeaking) {
      await stopAudio();
      setIsSpeaking(false);
      return;
    }

    const cachedUrl = localTtsUrl || message.ttsAudioUrl;
    if (cachedUrl) {
      setIsSpeaking(true);
      const success = await playAudio(cachedUrl, (status) => {
        if (status.isLoaded && status.didJustFinish) setIsSpeaking(false);
      });
      if (!success) setIsSpeaking(false);
      return;
    }

    setIsLoading(true);

    try {
      let textToSpeak = message.text;
      if (!textToSpeak && message.diagnosisData) {
        textToSpeak = await resolveDiagnosisText();
      }

      if (!textToSpeak?.trim()) {
        onError(t('voice.voiceUnavailable'));
        return;
      }

      const ttsLocation = locationDetails ? {
        country: locationDetails.level1Country,
        state: locationDetails.level2State,
        city: locationDetails.level5City || locationDetails.displayName,
      } : undefined;

      const result = await textToSpeech(textToSpeak, languageCode || 'en', ttsLocation);
      const audioSource = result.audioUrl || result.audioBase64;

      if (result.success && audioSource) {
        setIsSpeaking(true);
        if (result.audioUrl) setLocalTtsUrl(result.audioUrl);
        const playSuccess = await playAudio(audioSource, (status) => {
          if (status.isLoaded && status.didJustFinish) setIsSpeaking(false);
        });
        if (!playSuccess) {
          setIsSpeaking(false);
          onError(t('voice.audioPlaybackFailed'));
        }
      } else {
        log('TTS service error:', result.error);
        onError(t('voice.voiceUnavailableLater'));
      }
    } catch (error) {
      log('TTS exception:', (error as Error).message);
      onError(t('voice.voiceUnavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [
    isSpeaking,
    languageCode,
    localTtsUrl,
    locationDetails,
    message.diagnosisData,
    message.text,
    message.ttsAudioUrl,
    onError,
    resolveDiagnosisText,
  ]);

  useEffect(() => {
    return () => {
      if (isSpeaking) stopAudio();
    };
  }, [isSpeaking]);

  return { isSpeaking, isLoading, handleSpeak };
}
