import * as Haptics from 'expo-haptics';
import { analyzePlantImage } from '../../../services/api';
import { log } from '../../../utils/logger';
import { parseErrorMessage } from '../../../utils/apiHelpers';
import { t } from '../../../constants/strings';
import { processFailedDiagnosis, processSuccessfulDiagnosis } from '../diagnosisProcessor';
import { uploadImage } from '../../../services/upload';
import type { Message } from '../../../types';
import type { ImageData, LocationContextDeps, UploadResult } from './types';

interface SendImageDeps {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Record<string, unknown>) => void;
  persistMessage: (message: Message & { cloudinaryUrl?: string }, sessionId: string | null, extra?: Record<string, unknown>) => Promise<string | null>;
  ensureSession: () => Promise<string | null>;
  maybeGenerateTitle: (sessionId: string | null, allMessages: Message[]) => Promise<void>;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  locationContext: LocationContextDeps;
  setIsTyping: (value: boolean) => void;
}

export function createSendImageHandler({
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
}: SendImageDeps) {
  return async (imageData: ImageData): Promise<void> => {
    const userMsgText = imageData.text || t('chat.imageAnalyzed');
    const userMsg: Message = {
      _id: Date.now().toString(),
      text: userMsgText,
      image: imageData.uri,
      createdAt: new Date(),
      isBot: false,
    };
    addMessage(userMsg);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add thinking placeholder message
    const botMsgId = (Date.now() + 1).toString();
    const thinkingMsg: Message = {
      _id: botMsgId,
      text: '',
      createdAt: new Date(),
      isBot: true,
      status: 'thinking',
      thinkingText: t('chat.analyzingImage'),
    };
    addMessage(thinkingMsg);

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
        latitude: locationContext.location.latitude ?? undefined,
        longitude: locationContext.location.longitude ?? undefined,
        language: locationContext.languageCode,
        locationDetails: locationContext.locationDetails ?? undefined,
        question: imageData.text,
      });

      await uploadPromise;

      if (!diagResult.success) {
        const { errorBotMsg, warningMessage } = processFailedDiagnosis(diagResult);
        // Update the thinking message with error response
        updateMessage(botMsgId, {
          text: errorBotMsg.text,
          diagnosisData: errorBotMsg.diagnosisData,
          status: 'complete',
          thinkingText: null,
        });
        persistMessage({ ...errorBotMsg, _id: botMsgId }, sessionId, {
          errorType: diagResult.error || 'diagnosis_failed',
          metadata: { error: diagResult.error },
        });
        showWarning(warningMessage);
      } else {
        const { botMsg, persistData } = processSuccessfulDiagnosis(diagResult);
        // Update the thinking message with successful response
        updateMessage(botMsgId, {
          text: botMsg.text,
          diagnosisData: botMsg.diagnosisData,
          followUpQuestions: botMsg.followUpQuestions, // Include follow-up questions
          status: 'complete',
          thinkingText: null,
        });
        persistMessage({ ...botMsg, _id: botMsgId }, sessionId, {
          ...persistData,
          followUpQuestions: botMsg.followUpQuestions || [], // Persist follow-up questions
        });
        maybeGenerateTitle(sessionId, [{ ...botMsg, _id: botMsgId }, userMsg, ...messages]).catch((err) => {
          log('[Chat] Title generation failed (non-critical):', err);
        });
      }
    } catch (error) {
      showError(parseErrorMessage(error));
      updateMessage(botMsgId, {
        text: t('chat.imageAnalysisFailedBot'),
        status: 'complete',
        thinkingText: null,
      });
    } finally {
      setIsTyping(false);
    }
  };
}
