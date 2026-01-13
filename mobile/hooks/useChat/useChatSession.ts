/**
 * Chat session management hook
 * Handles session creation, loading, and persistence
 */
import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction, MutableRefObject } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  createSession, 
  getSession, 
  updateSession, 
  generateTitle 
} from '../../services/db';
import { t } from '../../constants/strings';
import { Message, SessionResult } from '../../types';

interface DbMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  imageCloudinaryUrl?: string;
  ttsAudioUrl?: string;
  metadata?: string | Record<string, unknown>;
}

interface UseChatSessionReturn {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  isLoadingSession: boolean;
  titleGeneratedRef: MutableRefObject<boolean>;
  startNewSession: () => void;
  ensureSession: () => Promise<string | null>;
  maybeGenerateTitle: (sessionId: string | null, allMessages: Message[]) => Promise<void>;
}

// Create welcome message dynamically so it uses current language
export const createWelcomeMessage = (): Message => ({
  _id: 'welcome',
  text: t('chat.welcomeMessage'),
  createdAt: new Date(),
  isBot: true,
});

export default function useChatSession(sessionIdParam: string | null = null): UseChatSessionReturn {
  const { 
    language, 
    locationDetails, 
    currentSessionId, 
    setCurrentSessionId, 
    isDbSynced 
  } = useApp();
  const { showError, showWarning, showSuccess } = useToast();
  
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage()]);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const titleGeneratedRef = useRef(false);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages(prev => {
      const welcomeIndex = prev.findIndex(m => m._id === 'welcome');
      if (welcomeIndex !== -1) {
        const updated = [...prev];
        updated[welcomeIndex] = createWelcomeMessage();
        return updated;
      }
      return prev;
    });
  }, [language]);

  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      const result: SessionResult = await getSession(sessionId, 50);
      if (result.success && result.session?.messages) {
        const loadedMessages: Message[] = (result.session.messages as any[]).map(m => {
          // Reconstruct diagnosis from metadata for native card
          let diagnosisData: any = undefined;
          try {
            const metadata = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
            diagnosisData = metadata?.diagnosis ?? undefined;
          } catch (e) {
            // Ignore parse errors
          }

          return {
            _id: m.id,
            text: m.content,
            diagnosisData: diagnosisData,
            createdAt: new Date(m.createdAt),
            isBot: m.role === 'assistant',
            image: m.imageCloudinaryUrl,
            ttsAudioUrl: m.ttsAudioUrl,
          };
        }).reverse();
        
        setMessages([...loadedMessages, createWelcomeMessage()]);
        setCurrentSessionId(sessionId);
        titleGeneratedRef.current = true;
      }
    } catch (error) {
      showError(t('chat.couldNotLoadConversation'));
    } finally {
      setIsLoadingSession(false);
    }
  }, [setCurrentSessionId, showError]);

  // Load existing session if provided
  useEffect(() => {
    if (sessionIdParam && isDbSynced) {
      loadSession(sessionIdParam);
    }
  }, [sessionIdParam, isDbSynced, loadSession]);

  const startNewSession = useCallback(() => {
    setMessages([createWelcomeMessage()]);
    setCurrentSessionId(null);
    titleGeneratedRef.current = false;
    showSuccess(t('chat.startedNewConversation'));
  }, [setCurrentSessionId, showSuccess]);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    if (!isDbSynced) return null;
    
    try {
      const result = await createSession({
        primaryLanguageCode: language?.code,
        locationDisplay: locationDetails?.displayName,
      });
      if (result.success && result.session) {
        setCurrentSessionId(result.session.id);
        return result.session.id;
      } else {
        showWarning(t('errors.sessionCreateFailed'));
      }
    } catch (e) {
      showWarning(t('errors.sessionCreateFailed'));
    }
    return null;
  }, [currentSessionId, isDbSynced, language, locationDetails, setCurrentSessionId, showWarning]);

  const maybeGenerateTitle = useCallback(async (sessionId: string | null, allMessages: Message[]): Promise<void> => {
    if (titleGeneratedRef.current || !sessionId || !isDbSynced) return;
    
    const userMessages = allMessages.filter(m => !m.isBot && m._id !== 'welcome');
    if (userMessages.length < 1) return;
    
    titleGeneratedRef.current = true;
    
    try {
      const contextMessages = allMessages
        .filter(m => m._id !== 'welcome' && m.text) // Filter out messages with null text
        .slice(0, 6)
        .map(m => ({ role: m.isBot ? 'assistant' : 'user', content: m.text || '' }));
      
      const result = await generateTitle(contextMessages, language?.code);
      
      if (result.success && result.title && result.title !== 'New Conversation') {
        await updateSession(sessionId, { title: result.title });
      }
    } catch (e) {
      // Title generation is non-critical
    }
  }, [isDbSynced, language]);

  return {
    messages,
    setMessages,
    isLoadingSession,
    titleGeneratedRef,
    startNewSession,
    ensureSession,
    maybeGenerateTitle,
  };
}
