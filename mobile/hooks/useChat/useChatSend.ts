/**
 * Chat send functionality hook
 * Handles sending text, images, and audio
 */
import { useState, useCallback, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { t } from '../../constants/strings';
import { createSendImageHandler, createSendTextHandler, transcribeAudioForInput, uploadAudioInBackground } from './send/handlers';
import type { AudioData, ImageData, UseChatSendOptions, UseChatSendReturn } from './send/types';

export default function useChatSend({
  messages,
  addMessage,
  updateMessage,
  ensureSession,
  persistMessage,
  maybeGenerateTitle,
}: UseChatSendOptions): UseChatSendReturn {
  const { language, location, locationDetails } = useApp();
  const { showError, showWarning } = useToast();

  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1;

  const locationContext = {
    location,
    locationDetails,
    languageCode: language?.code,
  };

  const handleSendText = useCallback(
    (text: string, isRetry = false) =>
      createSendTextHandler({
        messages,
        addMessage,
        updateMessage,
        ensureSession,
        persistMessage,
        maybeGenerateTitle,
        showError,
        showWarning,
        locationContext,
        setIsTyping,
        setThinkingText,
        retryCountRef,
        maxRetries: MAX_RETRIES,
      })(text, isRetry),
    [
      messages,
      addMessage,
      updateMessage,
      ensureSession,
      persistMessage,
      maybeGenerateTitle,
      showError,
      showWarning,
      locationContext,
    ]
  );

  const handleSendImage = useCallback(
    (imageData: ImageData) =>
      createSendImageHandler({
        messages,
        addMessage,
        updateMessage,
        persistMessage,
        ensureSession,
        maybeGenerateTitle,
        showError,
        showWarning,
        locationContext,
        setIsTyping,
      })(imageData),
    [
      messages,
      addMessage,
      updateMessage,
      persistMessage,
      ensureSession,
      maybeGenerateTitle,
      showError,
      showWarning,
      locationContext,
    ]
  );

  const transcribeAudioForInputHandler = useCallback(
    (audioData: AudioData) => transcribeAudioForInput(audioData, language?.code),
    [language]
  );

  const uploadAudioInBackgroundHandler = useCallback(
    async (audioData: AudioData | null) => {
      // Upload in background - don't show errors to user as this is non-critical
      // The transcription/chat flow continues regardless of upload success
      const result = await uploadAudioInBackground(audioData);
      // Errors are logged in uploadAudioInBackground, no need to show to user
      return result;
    },
    []
  );

  return {
    isTyping,
    thinkingText,
    handleSendText,
    handleSendImage,
    transcribeAudioForInput: transcribeAudioForInputHandler,
    uploadAudioInBackground: uploadAudioInBackgroundHandler,
  };
}
