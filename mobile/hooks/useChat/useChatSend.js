/**
 * Chat send functionality hook
 * Handles sending text, images, and audio
 */
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { sendChatMessageStreaming, analyzePlantImage } from '../../services/api';
import { transcribeAudio as transcribeAudioService } from '../../services/transcription';
import { uploadImage, uploadAudio } from '../../services/upload';
import { parseErrorMessage, isNetworkError } from '../../utils/apiHelpers';
import { t } from '../../constants/strings';
import { processFailedDiagnosis, processSuccessfulDiagnosis } from './diagnosisProcessor';

export default function useChatSend({
  messages,
  addMessage,
  updateMessage,
  ensureSession,
  persistMessage,
  maybeGenerateTitle,
}) {
  const { language, location, locationDetails } = useApp();
  const { showError, showWarning } = useToast();
  
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState(null);

  const handleSendText = useCallback(async (text) => {
    const userMessage = { _id: Date.now().toString(), text, createdAt: new Date(), isBot: false };
    addMessage(userMessage);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();
    persistMessage(userMessage, sessionId, { inputMethod: 'keyboard' });

    const botMsgId = (Date.now() + 1).toString();
    const botMsg = { _id: botMsgId, text: '', createdAt: new Date(), isBot: true };
    addMessage(botMsg);

    try {
      setThinkingText(t('chat.thinking'));

      await sendChatMessageStreaming({
        message: text,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: language?.code,
        locationDetails,
        history: messages.slice(0, 10),
        onChunk: (chunk) => {
          setThinkingText(null);
          updateMessage(botMsgId, { text: (prev) => (prev || '') + chunk });
        },
        onThinking: (thinking) => setThinkingText(thinking),
        onComplete: (fullText, metadata) => {
          setThinkingText(null);
          setIsTyping(false);
          updateMessage(botMsgId, { text: fullText });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          persistMessage({ ...botMsg, text: fullText }, sessionId, {
            responseLanguageCode: language?.code,
            metadata: metadata || null,
            diagnosisCrop: metadata?.diagnosis?.crop?.name || metadata?.diagnosis?.crop,
            diagnosisHealthStatus: metadata?.diagnosis?.health_status,
            diagnosisIssues: metadata?.diagnosis?.issues,
          });

          maybeGenerateTitle(sessionId, [{ ...botMsg, text: fullText }, userMessage, ...messages]);
        },
        onError: (error) => {
          setThinkingText(null);
          setIsTyping(false);
          updateMessage(botMsgId, { 
            text: (prev) => prev && prev.length > 10 ? prev : t('chat.connectionErrorBot') 
          });

          if (isNetworkError(error)) {
            showWarning(t('chat.noInternet'));
          } else {
            showError(parseErrorMessage(error));
          }
        }
      });
    } catch (error) {
      setThinkingText(null);
      setIsTyping(false);
      updateMessage(botMsgId, { text: t('chat.connectionErrorBot') });
      showError(parseErrorMessage(error));
    }
  }, [location, language, locationDetails, messages, addMessage, updateMessage, ensureSession, persistMessage, maybeGenerateTitle, showError, showWarning]);

  const handleSendImage = useCallback(async (imageData) => {
    // Always use a text value - never null - to prevent API validation errors
    const userMsgText = imageData.text || '[Image for plant diagnosis]';
    const userMsg = { 
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
      // Upload image to Cloudinary
      const uploadPromise = uploadImage(imageData.base64).then(async result => {
        if (result.success) {
          await persistMessage({ ...userMsg, cloudinaryUrl: result.url }, sessionId, { inputMethod: 'image', imageCloudinaryUrl: result.url });
        } else {
          await persistMessage(userMsg, sessionId, { inputMethod: 'image' });
          showWarning(t('errors.imageUploadFailed'));
        }
        return result;
      });

      // Ensure image has proper data URL format
      let imageBase64 = imageData.base64;
      if (!imageBase64.startsWith('data:')) {
        imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
      }

      const diagResult = await analyzePlantImage({
        imageBase64,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: language?.code,
        locationDetails,
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
      addMessage({ _id: (Date.now() + 1).toString(), text: t('chat.imageAnalysisFailedBot'), createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
      setThinkingText(null);
    }
  }, [location, language, locationDetails, messages, addMessage, persistMessage, ensureSession, maybeGenerateTitle, showError, showWarning]);

  const transcribeAudioForInput = useCallback(async (audioData) => {
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

  const uploadAudioInBackground = useCallback(async (audioData) => {
    if (!audioData?.base64) return { success: false };
    
    try {
      const format = Platform.OS === 'ios' ? 'm4a' : 'm4a';
      const result = await uploadAudio(audioData.base64, format);
      
      if (!result.success) {
        showWarning(t('errors.audioUploadFailed'));
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
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
