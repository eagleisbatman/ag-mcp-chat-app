import * as Haptics from 'expo-haptics';
import { sendChatMessageStreaming } from '../../../services/api';
import { log } from '../../../utils/logger';
import { parseErrorMessage, isNetworkError } from '../../../utils/apiHelpers';
import { t } from '../../../constants/strings';
import { generateDiagnosisTTSBrief } from '../../../utils/diagnosisNormalizer';
import type { HistoryMessage, Message } from '../../../types';
import type { LocationContextDeps } from './types';

interface SendTextDeps {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Record<string, unknown>) => void;
  ensureSession: () => Promise<string | null>;
  persistMessage: (message: Message & { cloudinaryUrl?: string }, sessionId: string | null, extra?: Record<string, unknown>) => Promise<string | null>;
  maybeGenerateTitle: (sessionId: string | null, allMessages: Message[]) => Promise<void>;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  locationContext: LocationContextDeps;
  setIsTyping: (value: boolean) => void;
  setThinkingText: (value: string | null) => void;
  retryCountRef: { current: number };
  maxRetries: number;
}

export function createSendTextHandler({
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
  maxRetries,
}: SendTextDeps) {
  return async (text: string, isRetry = false): Promise<void> => {
    const userMessage: Message = {
      _id: Date.now().toString(),
      text,
      createdAt: new Date(),
      isBot: false,
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

      const history: HistoryMessage[] = messages.slice(0, 10).map(m => {
        let msgText = m.text || '';
        if (m.diagnosisData && (!msgText || msgText.startsWith('[Image'))) {
          const summary = generateDiagnosisTTSBrief(m.diagnosisData);
          msgText = summary || msgText || t('chat.imageAnalyzed');
        }
        return { _id: m._id, text: msgText, isBot: m.isBot };
      });

      await sendChatMessageStreaming({
        message: text,
        latitude: locationContext.location.latitude ?? undefined,
        longitude: locationContext.location.longitude ?? undefined,
        language: locationContext.languageCode,
        locationDetails: locationContext.locationDetails ?? undefined,
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
            responseLanguageCode: locationContext.languageCode,
            metadata: metadata || null,
            diagnosisCrop: typeof diagnosisCrop === 'object' ? diagnosisCrop?.name : diagnosisCrop,
            diagnosisHealthStatus: diagnosisMetadata?.health_status,
            diagnosisIssues: diagnosisMetadata?.issues,
          } as Record<string, unknown>);

          maybeGenerateTitle(sessionId, [{ ...botMsg, text: fullText }, userMessage, ...messages]).catch((err) => {
            log('[Chat] Title generation failed (non-critical):', err);
          });
        },
        onError: (error: Error) => {
          const isTimeout = error?.message?.includes('timeout');

          if (isTimeout && !isRetry && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            log('🔄 [Chat] Timeout - auto-retrying...');
            setThinkingText(t('chat.servicesWarmingUp'));
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
              maxRetries,
            })(text, true);
            return;
          }

          retryCountRef.current = 0;
          setThinkingText(null);
          setIsTyping(false);
          updateMessage(botMsgId, {
            text: (prev: string) => prev && prev.length > 10 ? prev : t('chat.connectionErrorBot'),
          });

          if (isNetworkError(error)) {
            showWarning(t('chat.noInternet'));
          } else {
            showError(parseErrorMessage(error));
          }
        },
      });

      retryCountRef.current = 0;
    } catch (error) {
      retryCountRef.current = 0;
      setThinkingText(null);
      setIsTyping(false);
      updateMessage(botMsgId, { text: t('chat.connectionErrorBot') });
      showError(parseErrorMessage(error));
    }
  };
}
