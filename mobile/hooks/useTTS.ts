/**
 * Text-to-Speech hook
 * Handles TTS generation, caching, and playback
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AVPlaybackStatus } from 'expo-av';
import { textToSpeech, TTSLocation } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import { generateDiagnosisTTSBrief, generateDiagnosisTTSText } from '../utils/diagnosisNormalizer';
import { getDiagnosisTtsSummary } from '../services/diagnosisSummary';
import { log } from '../utils/logger';
import { t } from '../constants/strings';
import { Message, LocationDetails } from '../types';

interface UseTTSOptions {
  message: Message | null;
  language: string;
  locationDetails: LocationDetails | null;
  onError?: (error: string) => void;
}

interface UseTTSReturn {
  isSpeaking: boolean;
  isLoading: boolean;
  handleSpeak: () => Promise<void>;
  stopSpeaking: () => void;
}

/**
 * Hook for Text-to-Speech functionality
 */
export default function useTTS({ message, language, locationDetails, onError }: UseTTSOptions): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localTtsUrl, setLocalTtsUrl] = useState<string | undefined>(message?.ttsAudioUrl);

  // AbortController for cancelling TTS generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Convert LocationDetails to TTSLocation format
  const ttsLocation = useMemo((): TTSLocation | null => {
    if (!locationDetails) return null;
    return {
      country: locationDetails.level1Country,
      state: locationDetails.level2State,
      city: locationDetails.level5City || locationDetails.displayName,
    };
  }, [locationDetails]);

  /**
   * Get text to speak from message
   */
  const getTextToSpeak = useCallback((): string => {
    if (message?.text) return message.text;
    
    // For diagnosis messages, generate comprehensive speakable text
    if (message?.diagnosisData) {
      return generateDiagnosisTTSBrief(message.diagnosisData)
        || generateDiagnosisTTSText(message.diagnosisData);
    }
    
    return '';
  }, [message]);

  /**
   * Cancel ongoing TTS generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      log('🔊 [TTS] Cancelling generation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  /**
   * Handle speak/stop button press
   */
  const handleSpeak = useCallback(async () => {
    // If currently loading (generating), cancel the generation
    if (isLoading) {
      cancelGeneration();
      return;
    }

    // If already speaking, stop playback
    if (isSpeaking) {
      await stopAudio();
      setIsSpeaking(false);
      return;
    }

    // Check for cached audio URL
    const cachedUrl = localTtsUrl || message?.ttsAudioUrl;
    if (cachedUrl) {
      log('🔊 [TTS] Playing from cache:', cachedUrl);
      setIsSpeaking(true);
      const success = await playAudio(cachedUrl, (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) setIsSpeaking(false);
      });
      if (!success) setIsSpeaking(false);
      return;
    }

    // Generate new TTS
    setIsLoading(true);

    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let textToSpeak: string | null = getTextToSpeak();
      if (!textToSpeak) {
        if (message?.diagnosisData) {
          textToSpeak = await getDiagnosisTtsSummary(message.diagnosisData, language || 'en');
        }
        if (!textToSpeak) {
          onError?.(t('voice.voiceUnavailable'));
          return;
        }
      }

      const result = await textToSpeech(textToSpeak, language || 'en', ttsLocation, signal);

      // If cancelled, don't proceed with playback or caching
      if (result.cancelled) {
        log('🔊 [TTS] Generation was cancelled');
        return;
      }

      const audioSource = result.audioUrl || result.audioBase64;

      if (result.success && audioSource) {
        setIsSpeaking(true);

        // Cache the URL for instant playback next time
        if (result.audioUrl) {
          setLocalTtsUrl(result.audioUrl);
        }

        const playSuccess = await playAudio(audioSource, (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsSpeaking(false);
          }
        });

        if (!playSuccess) {
          setIsSpeaking(false);
          onError?.(t('voice.audioPlaybackFailed'));
        }
      } else {
        log('TTS service error:', result.error);
        onError?.(t('voice.voiceUnavailableLater'));
      }
    } catch (error) {
      log('TTS exception:', (error as Error).message);
      onError?.(t('voice.voiceUnavailable'));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, isSpeaking, localTtsUrl, message, language, ttsLocation, getTextToSpeak, onError, cancelGeneration]);

  // Cleanup on unmount - stop audio and cancel any ongoing generation
  useEffect(() => {
    return () => {
      stopAudio();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    isSpeaking,
    isLoading,
    handleSpeak,
    stopSpeaking: () => {
      // Cancel generation if in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      // Stop playback if playing
      stopAudio();
      setIsSpeaking(false);
    },
  };
}
