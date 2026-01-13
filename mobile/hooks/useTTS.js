/**
 * Text-to-Speech hook
 * Handles TTS generation, caching, and playback
 */

import { useState, useEffect, useCallback } from 'react';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import { generateDiagnosisTTSText } from '../utils/diagnosisNormalizer';
import { log } from '../utils/logger';
import { t } from '../constants/strings';

/**
 * Hook for Text-to-Speech functionality
 * @param {object} options
 * @param {object} options.message - Message object with text and diagnosisData
 * @param {string} options.language - Language code for TTS
 * @param {object} options.locationDetails - Location for accent localization
 * @param {function} options.onError - Error callback
 * @returns {object} TTS state and controls
 */
export default function useTTS({ message, language, locationDetails, onError }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localTtsUrl, setLocalTtsUrl] = useState(message?.ttsAudioUrl);

  /**
   * Get text to speak from message
   */
  const getTextToSpeak = useCallback(() => {
    if (message?.text) return message.text;
    
    // For diagnosis messages, generate comprehensive speakable text
    if (message?.diagnosisData) {
      return generateDiagnosisTTSText(message.diagnosisData);
    }
    
    return '';
  }, [message]);

  /**
   * Handle speak/stop button press
   */
  const handleSpeak = useCallback(async () => {
    // If already speaking, stop
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
      const success = await playAudio(cachedUrl, (status) => {
        if (status.didJustFinish) setIsSpeaking(false);
      });
      if (!success) setIsSpeaking(false);
      return;
    }

    // Generate new TTS
    setIsLoading(true);

    try {
      const textToSpeak = getTextToSpeak();
      if (!textToSpeak) {
        onError?.(t('voice.voiceUnavailable'));
        return;
      }

      const result = await textToSpeech(textToSpeak, language || 'en', locationDetails);
      const audioSource = result.audioUrl || result.audioBase64;

      if (result.success && audioSource) {
        setIsSpeaking(true);

        // Cache the URL for instant playback next time
        if (result.audioUrl) {
          setLocalTtsUrl(result.audioUrl);
        }

        const playSuccess = await playAudio(audioSource, (status) => {
          if (status.didJustFinish) {
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
      log('TTS exception:', error.message);
      onError?.(t('voice.voiceUnavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [isSpeaking, localTtsUrl, message, language, locationDetails, getTextToSpeak, onError]);

  /**
   * Stop audio on cleanup
   */
  const cleanup = useCallback(async () => {
    if (isSpeaking) {
      await stopAudio();
    }
  }, [isSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    isSpeaking,
    isLoading,
    handleSpeak,
    stopSpeaking: () => {
      stopAudio();
      setIsSpeaking(false);
    },
  };
}
