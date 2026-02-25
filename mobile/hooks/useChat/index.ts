/**
 * Main useChat hook - composition of smaller hooks
 * Handles all chat functionality: messages, sessions, sending
 */
import useChatSession from './useChatSession';
import useChatMessages from './useChatMessages';
import useChatSend from './useChatSend';
import { Message } from '../../types';

interface UseChatReturn {
  messages: Message[];
  isTyping: boolean;
  isLoadingSession: boolean;
  newestBotMessageId: string | null;
  thinkingText: string | null;
  handleSendText: (text: string, isRetry?: boolean) => Promise<void>;
  handleSendImage: (imageData: { uri: string; base64: string; text?: string }) => Promise<void>;
  transcribeAudioForInput: (audioData: { base64: string; language?: string }) => Promise<{ success: boolean; transcription?: string; error?: string }>;
  uploadAudioInBackground: (audioData: { base64: string } | null) => Promise<{ success: boolean; url?: string; error?: string }>;
  startNewSession: () => void;
}

export default function useChat(sessionIdParam: string | null = null, onBehalfOfFarmerUserId?: string): UseChatReturn {
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
    onBehalfOfFarmerUserId,
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
