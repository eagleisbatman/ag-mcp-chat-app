/**
 * Chat send functionality hook
 * Handles sending text, images, and audio
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { t } from '../../constants/strings';
import { createSendImageHandler, createSendTextHandler, transcribeAudioForInput, uploadAudioInBackground } from './send/handlers';
import { createConnectedSession } from '../../services/db';
import { log } from '../../utils/logger';
import type { A2UIResponse } from '../../types';
import type { AudioData, ImageData, UseChatSendOptions, UseChatSendReturn } from './send/types';

export default function useChatSend({
  messages,
  addMessage,
  updateMessage,
  ensureSession,
  persistMessage,
  maybeGenerateTitle,
  onBehalfOfFarmerUserId,
}: UseChatSendOptions): UseChatSendReturn {
  const { language, location, locationDetails } = useApp();
  const { showError, showWarning } = useToast();

  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const abortRef = useRef<(() => void) | null>(null);
  const connectedSessionCreatedRef = useRef(false);
  const interactionIdRef = useRef<string | null>(null);
  const MAX_RETRIES = 1;

  const locationContext = useMemo(() => ({
    location,
    locationDetails,
    languageCode: language?.code,
  }), [location, locationDetails, language?.code]);

  // Wrap ensureSession to also create connected session when EW chats on behalf
  const ensureSessionWithConnected = useCallback(async (): Promise<string | null> => {
    const sessionId = await ensureSession();
    if (sessionId && onBehalfOfFarmerUserId && !connectedSessionCreatedRef.current) {
      connectedSessionCreatedRef.current = true;
      // Fire-and-forget — don't block the chat message
      createConnectedSession(sessionId, { farmerUserId: onBehalfOfFarmerUserId })
        .catch((err) => log('Connected session creation failed (non-blocking):', err));
    }
    return sessionId;
  }, [ensureSession, onBehalfOfFarmerUserId]);

  const handleSendText = useCallback(
    (text: string, isRetryOrA2ui?: boolean | A2UIResponse) => {
      const isRetry = typeof isRetryOrA2ui === 'boolean' ? isRetryOrA2ui : false;
      const a2uiResponse = typeof isRetryOrA2ui === 'object' ? isRetryOrA2ui : undefined;
      return createSendTextHandler({
        messages,
        addMessage,
        updateMessage,
        ensureSession: ensureSessionWithConnected,
        persistMessage,
        maybeGenerateTitle,
        showError,
        showWarning,
        locationContext,
        setIsTyping,
        setThinkingText,
        retryCountRef,
        maxRetries: MAX_RETRIES,
        onBehalfOfFarmerUserId,
        abortRef,
        interactionIdRef,
      })(text, isRetry, undefined, a2uiResponse);
    },
    [
      messages,
      addMessage,
      updateMessage,
      ensureSessionWithConnected,
      persistMessage,
      maybeGenerateTitle,
      showError,
      showWarning,
      locationContext,
      onBehalfOfFarmerUserId,
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

  const abortStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsTyping(false);
  }, []);

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
    abortStreaming,
  };
}
