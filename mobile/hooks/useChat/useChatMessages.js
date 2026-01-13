/**
 * Chat message management hook
 * Handles message state, adding, updating, and persistence
 */
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { saveMessage, updateMessage as updateDbMessage } from '../../services/db';

export default function useChatMessages(messages, setMessages) {
  const { language, isDbSynced } = useApp();
  
  const [newestBotMessageId, setNewestBotMessageId] = useState(null);

  const addMessage = useCallback((message) => {
    setMessages(prev => [message, ...prev]);
    if (message.isBot) {
      setNewestBotMessageId(message._id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setNewestBotMessageId(p => p === message._id ? null : p), 8000);
    }
  }, [setMessages]);

  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      
      const resolvedUpdates = { ...updates };
      // Handle function-style updates for specific fields
      if (typeof updates.text === 'function') {
        resolvedUpdates.text = updates.text(m.text);
      }
      
      return { ...m, ...resolvedUpdates };
    }));
  }, [setMessages]);

  // Save message to database
  const persistMessage = useCallback(async (message, sessionId, extra = {}) => {
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
      return result.success ? result.message?.id : null;
    } catch (e) {
      return null;
    }
  }, [isDbSynced, language]);

  // Update an existing message in the database
  const persistUpdate = useCallback(async (messageId, updates) => {
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
