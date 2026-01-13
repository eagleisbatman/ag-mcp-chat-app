/**
 * Chat send functionality hook
 * Handles sending text, images, and audio
 */
import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { sendChatMessageStreaming, analyzePlantImage } from '../../services/api';
import { log } from '../../utils/logger';
import { transcribeAudio as transcribeAudioService } from '../../services/transcription';
import { uploadImage, uploadAudio } from '../../services/upload';
import { parseErrorMessage, isNetworkError } from '../../utils/apiHelpers';
import { t } from '../../constants/strings';
import { processFailedDiagnosis, processSuccessfulDiagnosis } from './diagnosisProcessor';
import { Message, HistoryMessage, LocationDetails } from '../../types';

interface UseChatSendOptions {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Record<string, unknown>) => void;
  ensureSession: () => Promise<string | null>;
  persistMessage: (message: Message & { cloudinaryUrl?: string }, sessionId: string | null, extra?: Record<string, unknown>) => Promise<string | null>;
  maybeGenerateTitle: (sessionId: string | null, allMessages: Message[]) => Promise<void>;
}

interface ImageData {
  uri: string;
  base64: string;
  text?: string;
}

interface AudioData {
  base64: string;
  language?: string;
}

interface TranscribeResult {
  success: boolean;
  transcription?: string;
  error?: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface UseChatSendReturn {
  isTyping: boolean;
  thinkingText: string | null;
  handleSendText: (text: string, isRetry?: boolean) => Promise<void>;
  handleSendImage: (imageData: ImageData) => Promise<void>;
  transcribeAudioForInput: (audioData: AudioData) => Promise<TranscribeResult>;
  uploadAudioInBackground: (audioData: AudioData | null) => Promise<UploadResult>;
}

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
  const MAX_RETRIES = 1; // Retry once on timeout (handles cold starts)

  const handleSendText = useCallback(async (text: string, isRetry = false): Promise<void> => {
    const userMessage: Message = { 
      _id: Date.now().toString(), 
      text, 
      createdAt: new Date(), 
      isBot: false 
    };
    addMessage(userMessage);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();
    persistMessage(userMessage, sessionId, { inputMethod: 'keyboard' });

    const botMsgId = (Date.now() + 1).toString();
    const botMsg: Message = { _id: botMsgId, text: '', createdAt: new Date(), isBot: true };
    addMessage(botMsg);

    try {
      setThinkingText(t('chat.thinking'));

      // Convert Message[] to HistoryMessage[]
      const history: HistoryMessage[] = messages.slice(0, 10).map(m => ({
        _id: m._id,
        text: m.text || '',
        isBot: m.isBot
      }));

      await sendChatMessageStreaming({
        message: text,
        latitude: location?.latitude ?? undefined,
        longitude: location?.longitude ?? undefined,
        language: language?.code,
        locationDetails: locationDetails ?? undefined,
        history,
        sessionId: sessionId ?? undefined,
        onChunk: (chunk: string) => {
          setThinkingText(null);
          updateMessage(botMsgId, { text: (prev: string) => (prev || '') + chunk });
        },
        onThinking: (thinking: string) => setThinkingText(thinking),
        onComplete: (fullText: string, metadata?: Record<string, unknown>) => {
          setThinkingText(null);
          setIsTyping(false);
          updateMessage(botMsgId, { text: fullText });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          const diagnosisMetadata = metadata?.diagnosis as Record<string, unknown> | undefined;
          const diagnosisCrop = diagnosisMetadata?.crop as { name?: string } | string | undefined;
          persistMessage({ ...botMsg, text: fullText }, sessionId, {
            responseLanguageCode: language?.code,
            metadata: metadata || null,
            diagnosisCrop: typeof diagnosisCrop === 'object' ? diagnosisCrop?.name : diagnosisCrop,
            diagnosisHealthStatus: diagnosisMetadata?.health_status,
            diagnosisIssues: diagnosisMetadata?.issues,
          } as Record<string, unknown>);

          maybeGenerateTitle(sessionId, [{ ...botMsg, text: fullText }, userMessage, ...messages]);
        },
        onError: (error: Error) => {
          const isTimeout = error?.message?.includes('timeout');
          
          if (isTimeout && !isRetry && retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            log('🔄 [Chat] Timeout - auto-retrying...');
            setThinkingText(t('chat.servicesWarmingUp') || 'Services warming up, retrying...');
            handleSendText(text, true);
            return;
          }
          
          retryCountRef.current = 0;
          setThinkingText(null);
          setIsTyping(false);
          updateMessage(botMsgId, { 
            text: (prev: string) => prev && prev.length > 10 ? prev : t('chat.connectionErrorBot') 
          });

          if (isNetworkError(error)) {
            showWarning(t('chat.noInternet'));
          } else {
            showError(parseErrorMessage(error));
          }
        }
      });
      
      retryCountRef.current = 0;
    } catch (error) {
      retryCountRef.current = 0;
      setThinkingText(null);
      setIsTyping(false);
      updateMessage(botMsgId, { text: t('chat.connectionErrorBot') });
      showError(parseErrorMessage(error));
    }
  }, [location, language, locationDetails, messages, addMessage, updateMessage, ensureSession, persistMessage, maybeGenerateTitle, showError, showWarning]);

  const handleSendImage = useCallback(async (imageData: ImageData): Promise<void> => {
    const userMsgText = imageData.text || '[Image for plant diagnosis]';
    const userMsg: Message = { 
      _id: Date.now().toString(), 
      text: userMsgText, 
      image: imageData.uri, 
      createdAt: new Date(), 
      isBot: false 
    };
    addMessage(userMsg);
    setIsTyping(true);
    setThinkingText(t('chat.analyzingImage'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();

    try {
      const uploadPromise = uploadImage(imageData.base64).then(async (result: UploadResult) => {
        if (result.success && result.url) {
          await persistMessage({ ...userMsg, cloudinaryUrl: result.url }, sessionId, { inputMethod: 'image', imageCloudinaryUrl: result.url });
        } else {
          await persistMessage(userMsg, sessionId, { inputMethod: 'image' });
          showWarning(t('errors.imageUploadFailed'));
        }
        return result;
      });

      let imageBase64 = imageData.base64;
      if (!imageBase64.startsWith('data:')) {
        imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
      }

      const diagResult = await analyzePlantImage({
        imageBase64,
        latitude: location?.latitude ?? undefined,
        longitude: location?.longitude ?? undefined,
        language: language?.code,
        locationDetails: locationDetails ?? undefined,
        question: imageData.text,
      });

      await uploadPromise;

      if (!diagResult.success) {
        const { errorBotMsg, warningMessage } = processFailedDiagnosis(diagResult);
        addMessage(errorBotMsg);
        showWarning(warningMessage);
      } else {
        const { botMsg, persistData } = processSuccessfulDiagnosis(diagResult);
        addMessage(botMsg);
        persistMessage(botMsg, sessionId, persistData);
        maybeGenerateTitle(sessionId, [botMsg, userMsg, ...messages]);
      }
    } catch (error) {
      showError(parseErrorMessage(error));
      addMessage({ 
        _id: (Date.now() + 1).toString(), 
        text: t('chat.imageAnalysisFailedBot'), 
        createdAt: new Date(), 
        isBot: true 
      });
    } finally {
      setIsTyping(false);
      setThinkingText(null);
    }
  }, [location, language, locationDetails, messages, addMessage, persistMessage, ensureSession, maybeGenerateTitle, showError, showWarning]);

  const transcribeAudioForInput = useCallback(async (audioData: AudioData): Promise<TranscribeResult> => {
    try {
      const result = await transcribeAudioService(audioData.base64, audioData.language || language?.code);
      if (!result.success || !result.text) {
        return { success: false, error: result.error || t('voice.couldNotTranscribeAudio') };
      }
      return { success: true, transcription: result.text };
    } catch (error) {
      return { success: false, error: t('voice.transcriptionFailed') };
    }
  }, [language]);

  const uploadAudioInBackground = useCallback(async (audioData: AudioData | null): Promise<UploadResult> => {
    if (!audioData?.base64) return { success: false };
    try {
      const result = await uploadAudio(audioData.base64, 'm4a');
      if (!result.success) {
        showWarning(t('errors.audioUploadFailed'));
      }
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [showWarning]);

  return {
    isTyping,
    thinkingText,
    handleSendText,
    handleSendImage,
    transcribeAudioForInput,
    uploadAudioInBackground,
  };
}
