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
  persistMessage: (message: Message & { cloudinaryUrl?: string }, sessionId: string | null, extra?: Record<string, unknown>) => Promise<string | null>;
  ensureSession: () => Promise<string | null>;
  maybeGenerateTitle: (sessionId: string | null, allMessages: Message[]) => Promise<void>;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  locationContext: LocationContextDeps;
  setIsTyping: (value: boolean) => void;
  setThinkingText: (value: string | null) => void;
}

export function createSendImageHandler({
  messages,
  addMessage,
  persistMessage,
  ensureSession,
  maybeGenerateTitle,
  showError,
  showWarning,
  locationContext,
  setIsTyping,
  setThinkingText,
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
        latitude: locationContext.location.latitude ?? undefined,
        longitude: locationContext.location.longitude ?? undefined,
        language: locationContext.languageCode,
        locationDetails: locationContext.locationDetails ?? undefined,
        question: imageData.text,
      });

      await uploadPromise;

      if (!diagResult.success) {
        const { errorBotMsg, warningMessage } = processFailedDiagnosis(diagResult);
        addMessage(errorBotMsg);
        persistMessage(errorBotMsg, sessionId, {
          errorType: diagResult.error || 'diagnosis_failed',
          metadata: { error: diagResult.error },
        });
        showWarning(warningMessage);
      } else {
        const { botMsg, persistData } = processSuccessfulDiagnosis(diagResult);
        addMessage(botMsg);
        persistMessage(botMsg, sessionId, persistData);
        maybeGenerateTitle(sessionId, [botMsg, userMsg, ...messages]).catch((err) => {
          log('[Chat] Title generation failed (non-critical):', err);
        });
      }
    } catch (error) {
      showError(parseErrorMessage(error));
      addMessage({
        _id: (Date.now() + 1).toString(),
        text: t('chat.imageAnalysisFailedBot'),
        createdAt: new Date(),
        isBot: true,
      });
    } finally {
      setIsTyping(false);
      setThinkingText(null);
    }
  };
}
