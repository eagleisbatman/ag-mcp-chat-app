/**
 * Main useChat hook - composition of smaller hooks
 * Handles all chat functionality: messages, sessions, sending
 */
import useChatSession from './useChatSession';
import useChatMessages from './useChatMessages';
import useChatSend from './useChatSend';

export default function useChat(sessionIdParam = null) {
  // Session management
  const {
    messages,
    setMessages,
    isLoadingSession,
    startNewSession,
    ensureSession,
    maybeGenerateTitle,
  } = useChatSession(sessionIdParam);

  // Message management
  const {
    newestBotMessageId,
    addMessage,
    updateMessage,
    persistMessage,
    persistUpdate,
  } = useChatMessages(messages, setMessages);

  // Send functionality
  const {
    isTyping,
    thinkingText,
    handleSendText,
    handleSendImage,
    transcribeAudioForInput,
    uploadAudioInBackground,
  } = useChatSend({
    messages,
    addMessage,
    updateMessage,
    ensureSession,
    persistMessage,
    maybeGenerateTitle,
  });

  return {
    messages,
    isTyping,
    isLoadingSession,
    newestBotMessageId,
    thinkingText,
    handleSendText,
    handleSendImage,
    transcribeAudioForInput,
    uploadAudioInBackground,
    startNewSession,
  };
}

// Re-export sub-hooks for advanced usage
export { default as useChatSession } from './useChatSession';
export { default as useChatMessages } from './useChatMessages';
export { default as useChatSend } from './useChatSend';
