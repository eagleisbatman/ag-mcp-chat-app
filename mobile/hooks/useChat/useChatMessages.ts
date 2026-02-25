/**
 * Chat message management hook
 * Handles message state, adding, updating, and persistence
 */
import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { saveMessage, updateMessage as updateDbMessage } from '../../services/db';
import { Message } from '../../types';
import { log } from '../../utils/logger';

type TextUpdateFn = (prev: string) => string;

interface MessageUpdates {
  text?: string | TextUpdateFn;
  diagnosisData?: Message['diagnosisData'];
  ttsAudioUrl?: string;
  [key: string]: unknown;
}

interface PersistMessageExtra {
  inputMethod?: 'keyboard' | 'voice' | 'image';
  imageCloudinaryUrl?: string;
  [key: string]: unknown;
}

interface UseChatMessagesReturn {
  newestBotMessageId: string | null;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: MessageUpdates) => void;
  persistMessage: (message: Message & { cloudinaryUrl?: string }, sessionId: string | null, extra?: PersistMessageExtra) => Promise<string | null>;
  persistUpdate: (messageId: string, updates: Record<string, unknown>) => Promise<void>;
}

export default function useChatMessages(
  messages: Message[], 
  setMessages: Dispatch<SetStateAction<Message[]>>
): UseChatMessagesReturn {
  const { language, isDbSynced } = useApp();
  
  const [newestBotMessageId, setNewestBotMessageId] = useState<string | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [message, ...prev]);
    if (message.isBot) {
      setNewestBotMessageId(message._id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setNewestBotMessageId(p => p === message._id ? null : p), 8000);
    }
  }, [setMessages]);

  const updateMessage = useCallback((messageId: string, updates: MessageUpdates) => {
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      
      const resolvedUpdates: any = { ...updates };
      // Handle function-style updates for specific fields
      if (typeof updates.text === 'function') {
        resolvedUpdates.text = updates.text(m.text || '');
      }
      
      return { ...m, ...resolvedUpdates } as Message;
    }));
  }, [setMessages]);

  // Save message to database
  const persistMessage = useCallback(async (
    message: Message & { cloudinaryUrl?: string }, 
    sessionId: string | null, 
    extra: PersistMessageExtra = {}
  ): Promise<string | null> => {
    if (!isDbSynced || !sessionId) return null;
    try {
      const result = await saveMessage({
        sessionId,
        role: message.isBot ? 'assistant' : 'user',
        content: message.text,
        contentType: message.image ? 'image' : (extra.inputMethod === 'voice' ? 'voice' : 'text'),
        inputMethod: extra.inputMethod,
        queryLanguageCode: language?.code,
        imageCloudinaryUrl: message.cloudinaryUrl,
        ...extra,
      });
      if (!result.success) {
        log('⚠️ [persistMessage] Message persistence failed:', result.error);
      }
      return result.success ? (result.message?.id ?? null) : null;
    } catch (e) {
      log('❌ [persistMessage] Unexpected error:', e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [isDbSynced, language]);

  // Update an existing message in the database
  const persistUpdate = useCallback(async (messageId: string, updates: Record<string, unknown>): Promise<void> => {
    if (!isDbSynced || !messageId) return;
    try {
      await updateDbMessage(messageId, updates);
    } catch (e) {
      // Silently log DB errors - non-critical
    }
  }, [isDbSynced]);

  return {
    newestBotMessageId,
    addMessage,
    updateMessage,
    persistMessage,
    persistUpdate,
  };
}
