import * as Haptics from 'expo-haptics';
import { sendChatMessageStreaming } from '../../../services/api';
import { log } from '../../../utils/logger';
import { parseErrorMessage, isNetworkError } from '../../../utils/apiHelpers';
import { t } from '../../../constants/strings';
import { generateDiagnosisTTSBrief } from '../../../utils/diagnosisNormalizer';
import type { HistoryMessage, Message, A2UIPayload, RationFlowStep } from '../../../types';
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
  onBehalfOfFarmerUserId?: string;
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
  onBehalfOfFarmerUserId,
}: SendTextDeps) {
  return async (text: string, isRetry = false, existingBotMsgId?: string): Promise<void> => {
    const userMessage: Message = {
      _id: Date.now().toString(),
      text,
      createdAt: new Date(),
      isBot: false,
    };

    if (!existingBotMsgId) {
      addMessage(userMessage);
      setIsTyping(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const sessionId = await ensureSession();

    if (!existingBotMsgId) {
      persistMessage(userMessage, sessionId, { inputMethod: 'keyboard' });
    }

    const botMsgId = existingBotMsgId ?? (Date.now() + 1).toString();
    const botMsg: Message = {
      _id: botMsgId,
      text: '',
      createdAt: new Date(),
      isBot: true,
      status: 'thinking',
      thinkingText: t('chat.thinking'),
    };

    if (!existingBotMsgId) {
      addMessage(botMsg);
    }

    try {

      const history: HistoryMessage[] = messages.slice(0, 10).map(m => {
        let msgText = m.text || '';
        if (m.diagnosisData && (!msgText || msgText.startsWith('[Image'))) {
          const summary = generateDiagnosisTTSBrief(m.diagnosisData);
          msgText = summary || msgText || t('chat.imageAnalyzed');
        }
        return { _id: m._id, text: msgText, isBot: m.isBot };
      });

      // Capture flow step from SSE stream (set by onFlowStep callback)
      let capturedFlowStep: RationFlowStep | undefined;

      await sendChatMessageStreaming({
        message: text,
        latitude: locationContext.location.latitude ?? undefined,
        longitude: locationContext.location.longitude ?? undefined,
        language: locationContext.languageCode,
        locationDetails: locationContext.locationDetails ?? undefined,
        history,
        sessionId: sessionId ?? undefined,
        onBehalfOfFarmerUserId,
        onChunk: (chunk: string) => {
          updateMessage(botMsgId, {
            text: (prev: string) => (prev || '') + chunk,
            status: 'streaming',
            thinkingText: null,
          });
        },
        onThinking: (thinking: string) => updateMessage(botMsgId, { thinkingText: thinking }),
        onFlowStep: (flowStep: RationFlowStep) => {
          capturedFlowStep = flowStep;
          // Flow steps are atomic (not streamed incrementally) — mark complete immediately
          updateMessage(botMsgId, { flowStep, status: 'complete', thinkingText: null });
        },
        onComplete: (fullText: string, metadata?: Record<string, unknown>) => {
          setIsTyping(false);
          // Extract follow-up questions and A2UI widgets from metadata
          const followUpQuestions = metadata?.followUpQuestions as string[] | undefined;
          const a2uiWidgets = metadata?.a2uiWidgets as A2UIPayload[] | undefined;
          updateMessage(botMsgId, { text: fullText || null, followUpQuestions, a2uiWidgets, flowStep: capturedFlowStep, status: 'complete', thinkingText: null });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          const diagnosisMetadata = metadata?.diagnosis as Record<string, unknown> | undefined;
          const diagnosisCrop = diagnosisMetadata?.crop as { name?: string } | string | undefined;
          persistMessage({ ...botMsg, text: fullText }, sessionId, {
            responseLanguageCode: locationContext.languageCode,
            metadata: metadata || null,
            followUpQuestions: followUpQuestions || [], // Pass follow-up questions to be stored in DB
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
            updateMessage(botMsgId, { thinkingText: t('chat.servicesWarmingUp') });
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
              onBehalfOfFarmerUserId,
            })(text, true, botMsgId);
            return;
          }

          retryCountRef.current = 0;
          setIsTyping(false);
          updateMessage(botMsgId, {
            text: (prev: string) => prev && prev.length > 10 ? prev : t('chat.connectionErrorBot'),
            status: 'complete',
            thinkingText: null,
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
      setIsTyping(false);
      updateMessage(botMsgId, { text: t('chat.connectionErrorBot'), status: 'complete', thinkingText: null });
      showError(parseErrorMessage(error));
    }
  };
}
