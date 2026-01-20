import { useCallback, useEffect, useRef, useState } from 'react';
import { textToSpeech } from '../../services/tts';
import { playAudio, stopAudio } from '../../utils/audioPlayer';
import { playAudioWithTimeout } from '../../utils/audioPlayback';
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
  const playbackIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resolveDiagnosisText = useCallback(async (): Promise<string | null> => {
    const brief = generateDiagnosisTTSBrief(message.diagnosisData);
    if (brief) return brief;
    const detailed = generateDiagnosisTTSText(message.diagnosisData);
    if (detailed) return detailed;
    const fallback = await getDiagnosisTtsSummary(message.diagnosisData, languageCode);
    return fallback;
  }, [languageCode, message.diagnosisData]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      log('🔊 [TTS] Cancelling generation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    playbackIdRef.current += 1;
    setIsLoading(false);
  }, []);

  const stopAllPlayback = useCallback(async () => {
    cancelGeneration();
    try {
      await stopAudio();
    } catch {
      // Ignore
    }
    setIsSpeaking(false);
  }, [cancelGeneration]);

  const splitTextIntoSegments = useCallback((text: string, maxChars = 220): string[] => {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (sentences.length === 0) return [text];

    const segments: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if (!current) {
        current = sentence;
        continue;
      }
      if ((current + ' ' + sentence).length <= maxChars) {
        current = `${current} ${sentence}`;
      } else {
        segments.push(current);
        current = sentence;
      }
    }
    if (current) segments.push(current);
    return segments;
  }, []);

  const handleSpeak = useCallback(async (): Promise<void> => {
    // If currently loading (generating), cancel the generation
    if (isLoading) {
      cancelGeneration();
      setIsSpeaking(false);
      return;
    }

    if (isSpeaking) {
      await stopAllPlayback();
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

      setIsSpeaking(true);
      setIsLoading(true);
      const playbackId = (playbackIdRef.current += 1);

      // Create AbortController for this generation session
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Background full TTS for caching - track with ref to prevent memory leaks
      const cachePlaybackId = playbackId;
      textToSpeech(textToSpeak, languageCode || 'en', ttsLocation, signal)
        .then((full) => {
          // Only update cache if this playback session is still active and not cancelled
          if (playbackIdRef.current === cachePlaybackId && !full.cancelled) {
            const audioSource = full.audioUrl || full.audioBase64;
            if (full.success && audioSource) {
              setLocalTtsUrl(audioSource);
              log('TTS cached successfully for future playback');
            }
          }
        })
        .catch((err) => {
          // Only log if this playback session is still active
          if (playbackIdRef.current === cachePlaybackId) {
            log('TTS cache error:', (err as Error).message);
          }
        });

      const segments = splitTextIntoSegments(textToSpeak);
      let nextPromise = textToSpeech(segments[0], languageCode || 'en', ttsLocation, signal);

      for (let i = 0; i < segments.length; i += 1) {
        const segmentResult = await nextPromise;
        if (playbackIdRef.current !== playbackId) return;

        // Check if cancelled
        if (segmentResult.cancelled) {
          log('🔊 [TTS] Generation was cancelled');
          return;
        }

        const audioSource = segmentResult.audioUrl || segmentResult.audioBase64;
        if (!segmentResult.success || !audioSource) {
          log('TTS segment error:', segmentResult.error);
          onError(t('voice.voiceUnavailableLater'));
          return;
        }

        if (i + 1 < segments.length) {
          nextPromise = textToSpeech(segments[i + 1], languageCode || 'en', ttsLocation, signal);
        }

        const durationMs = (segmentResult.duration || Math.max(2, Math.round(segments[i].length / 14))) * 1000;
        await playAudioWithTimeout(audioSource, durationMs + 1200);
        if (playbackIdRef.current !== playbackId) return;
      }

      setIsSpeaking(false);
    } catch (error) {
      log('TTS exception:', (error as Error).message);
      onError(t('voice.voiceUnavailable'));
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    isLoading,
    isSpeaking,
    languageCode,
    localTtsUrl,
    locationDetails,
    message.diagnosisData,
    message.text,
    message.ttsAudioUrl,
    onError,
    cancelGeneration,
    resolveDiagnosisText,
    splitTextIntoSegments,
    stopAllPlayback,
  ]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount - stop audio and cancel any ongoing generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (isSpeaking) stopAllPlayback();
    };
  }, [isSpeaking, stopAllPlayback]);

  return { isSpeaking, isLoading, handleSpeak };
}
