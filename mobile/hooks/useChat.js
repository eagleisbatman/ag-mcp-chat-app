// Chat hook - handles messages, sessions, and persistence
import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { sendChatMessage } from '../services/api';
import { diagnosePlantHealth, formatDiagnosis } from '../services/agrivision';
import { transcribeAudio as transcribeAudioService } from '../services/transcription';
import { uploadImage, uploadAudio } from '../services/upload';
import { createSession, saveMessage, generateTitle, updateSession, getSession } from '../services/db';
import { parseErrorMessage, isNetworkError } from '../utils/apiHelpers';
import { t } from '../constants/strings';
import { WIDGET_METADATA, getOutputWidgetType } from '../widgets';

const WELCOME_MESSAGE = {
  _id: 'welcome',
  text: t('chat.welcomeMessage'),
  createdAt: new Date(),
  isBot: true,
};

export default function useChat(sessionIdParam = null) {
  const { language, location, locationDetails, currentSessionId, setCurrentSessionId, isDbSynced } = useApp();
  const { showError, showWarning, showSuccess } = useToast();
  
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [newestBotMessageId, setNewestBotMessageId] = useState(null);
  const titleGeneratedRef = useRef(false);

  // Load existing session if provided
  useEffect(() => {
    if (sessionIdParam && isDbSynced) {
      loadSession(sessionIdParam);
    }
  }, [sessionIdParam, isDbSynced]);

  const loadSession = async (sessionId) => {
    setIsLoadingSession(true);
    try {
      const result = await getSession(sessionId, 50);
      if (result.success && result.session?.messages) {
        const loadedMessages = result.session.messages.map(m => ({
          _id: m.id,
          text: m.content,
          createdAt: new Date(m.createdAt),
          isBot: m.role === 'assistant',
          image: m.imageCloudinaryUrl,
          followUpQuestions: m.followUpQuestions || [], // Load follow-up questions
        })).reverse(); // Newest first for inverted FlatList
        
        setMessages([...loadedMessages, WELCOME_MESSAGE]);
        setCurrentSessionId(sessionId);
        titleGeneratedRef.current = true; // Already has title
        console.log('📂 [useChat] Loaded session with', loadedMessages.length, 'messages');
      }
    } catch (error) {
      console.error('Load session error:', error);
      showError(t('chat.couldNotLoadConversation'));
    } finally {
      setIsLoadingSession(false);
    }
  };

  const startNewSession = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentSessionId(null);
    titleGeneratedRef.current = false;
    showSuccess(t('chat.startedNewConversation'));
  }, [setCurrentSessionId, showSuccess]);

  // Create a new session on first real message
  const ensureSession = useCallback(async () => {
    if (currentSessionId) return currentSessionId;
    if (!isDbSynced) return null;
    
    try {
      const result = await createSession({
        primaryLanguageCode: language?.code,
        locationDisplay: locationDetails?.displayName,
      });
      if (result.success) {
        setCurrentSessionId(result.session.id);
        return result.session.id;
      }
    } catch (e) {
      console.log('Session creation error:', e);
    }
    return null;
  }, [currentSessionId, isDbSynced, language, locationDetails, setCurrentSessionId]);

  // Save message to database
  const persistMessage = useCallback(async (message, sessionId, extra = {}) => {
    if (!isDbSynced || !sessionId) return;
    try {
      await saveMessage({
        sessionId,
        role: message.isBot ? 'assistant' : 'user',
        content: message.text,
        contentType: message.image ? 'image' : (extra.inputMethod === 'voice' ? 'voice' : 'text'),
        inputMethod: extra.inputMethod,
        queryLanguageCode: language?.code,
        imageCloudinaryUrl: message.cloudinaryUrl,
        ...extra,
      });
    } catch (e) {
      console.log('Message save error:', e);
    }
  }, [isDbSynced, language]);

  // Generate title after first exchange (user message + bot response)
  const maybeGenerateTitle = useCallback(async (sessionId, allMessages) => {
    if (titleGeneratedRef.current || !sessionId || !isDbSynced) return;
    
    // Need at least 1 user message to generate a meaningful title
    const userMessages = allMessages.filter(m => !m.isBot && m._id !== 'welcome');
    if (userMessages.length < 1) return;
    
    titleGeneratedRef.current = true;
    console.log('📝 [useChat] Generating title for session:', sessionId);
    
    try {
      // Get first few messages for context (user + bot)
      const contextMessages = allMessages
        .filter(m => m._id !== 'welcome')
        .slice(0, 6)
        .map(m => ({ role: m.isBot ? 'assistant' : 'user', content: m.text }));
      
      console.log('📝 [useChat] Sending', contextMessages.length, 'messages to title generator');
      
      const result = await generateTitle(contextMessages, language?.code);
      
      console.log('📝 [useChat] Title generation result:', result);
      
      if (result.success && result.title && result.title !== 'New Conversation') {
        await updateSession(sessionId, { title: result.title });
        console.log('✅ [useChat] Title updated:', result.title);
      } else {
        console.log('⚠️ [useChat] Title generation returned fallback or failed');
      }
    } catch (e) {
      console.log('❌ [useChat] Title generation error:', e.message);
    }
  }, [isDbSynced, language]);

  const addMessage = useCallback((message) => {
    setMessages(prev => [message, ...prev]);
    if (message.isBot) {
      setNewestBotMessageId(message._id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setNewestBotMessageId(p => p === message._id ? null : p), 8000);
    }
  }, []);

  const handleSendText = useCallback(async (text) => {
    const userMessage = { _id: Date.now().toString(), text, createdAt: new Date(), isBot: false };
    addMessage(userMessage);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();
    persistMessage(userMessage, sessionId, { inputMethod: 'keyboard' });

    try {
      const result = await sendChatMessage({
        message: text,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: language?.code,
        locationDetails, // Human-readable location for AI context
        history: messages, // Pass conversation history for context
      });
      
      if (!result.success) {
        const errorMsg = parseErrorMessage(result);
        if (isNetworkError({ message: result.error })) {
          showWarning(t('chat.noInternet'));
        }
        addMessage({ 
          _id: (Date.now() + 1).toString(), 
          text: t('chat.sorryCouldNotProcess', { details: errorMsg }), 
          createdAt: new Date(), 
          isBot: true 
        });
      } else {
        // Debug logging for widget data
        console.log('🔔 [useChat] API result widget:', {
          hasWidget: !!result.widget,
          widgetType: result.widget?.type,
          widgetDataKeys: result.widget?.data ? Object.keys(result.widget.data) : [],
        });

        const botMsg = {
          _id: (Date.now() + 1).toString(),
          text: result.response,
          createdAt: new Date(),
          isBot: true,
          followUpQuestions: result.followUpQuestions || [],
          widget: result.widget || null, // Output widget from API
          suggestedWidget: result.suggestedWidget || null, // Suggested input widget
        };

        console.log('🔔 [useChat] Bot message created with widget:', {
          hasWidget: !!botMsg.widget,
          widgetType: botMsg.widget?.type,
        });

        addMessage(botMsg);
        persistMessage(botMsg, sessionId, {
          responseLanguageCode: language?.code,
          followUpQuestions: result.followUpQuestions || [],
        });
        maybeGenerateTitle(sessionId, [botMsg, userMessage, ...messages]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = parseErrorMessage(error);
      // Note: Retry uses the captured `text` value which is correct since we're retrying the same message
      const retryAction = isNetworkError(error) ? { label: t('common.retry'), onPress: () => handleSendText(text) } : null;
      showError(errorMsg, retryAction);
      addMessage({ _id: (Date.now() + 1).toString(), text: t('chat.connectionErrorBot'), createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, messages, addMessage, ensureSession, persistMessage, maybeGenerateTitle]);

  // Show an input widget in the chat (triggered from Tools menu)
  const showInputWidget = useCallback((widgetType) => {
    const metadata = WIDGET_METADATA[widgetType];
    const widgetMessage = {
      _id: Date.now().toString(),
      text: metadata?.description || '',
      createdAt: new Date(),
      isBot: true,
      widget: {
        type: widgetType,
        data: {},
      },
    };
    addMessage(widgetMessage);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [addMessage]);

  // Handle widget form submission
  const handleSendWidget = useCallback(async (widgetData) => {
    const widgetType = widgetData.widget_type;
    const metadata = WIDGET_METADATA[widgetType];

    // Create user message showing widget submission
    const userMessage = {
      _id: Date.now().toString(),
      text: `📋 ${metadata?.name || 'Widget'} submitted`,
      createdAt: new Date(),
      isBot: false,
    };
    addMessage(userMessage);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();
    persistMessage(userMessage, sessionId, { inputMethod: 'widget', widgetType });

    try {
      // Send widget data to API
      const result = await sendChatMessage({
        message: `Process ${metadata?.name || 'widget'} request`,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: language?.code,
        locationDetails,
        history: messages,
        widget_data: widgetData,
      });

      if (!result.success) {
        const errorMsg = parseErrorMessage(result);
        if (isNetworkError({ message: result.error })) {
          showWarning(t('chat.noInternet'));
        }
        addMessage({
          _id: (Date.now() + 1).toString(),
          text: t('chat.sorryCouldNotProcess', { details: errorMsg }),
          createdAt: new Date(),
          isBot: true,
        });
      } else {
        // Get expected output widget type
        const outputWidgetType = getOutputWidgetType(widgetType);

        const botMsg = {
          _id: (Date.now() + 1).toString(),
          text: result.response,
          createdAt: new Date(),
          isBot: true,
          followUpQuestions: result.followUpQuestions || [],
          // Use widget from response, or create one from the result data
          widget: result.widget || (outputWidgetType ? {
            type: outputWidgetType,
            data: result.widgetData || {},
          } : null),
        };
        addMessage(botMsg);
        persistMessage(botMsg, sessionId, {
          responseLanguageCode: language?.code,
          followUpQuestions: result.followUpQuestions || [],
        });
        maybeGenerateTitle(sessionId, [botMsg, userMessage, ...messages]);
      }
    } catch (error) {
      console.error('Widget submission error:', error);
      const errorMsg = parseErrorMessage(error);
      showError(errorMsg);
      addMessage({
        _id: (Date.now() + 1).toString(),
        text: t('chat.connectionErrorBot'),
        createdAt: new Date(),
        isBot: true,
      });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, locationDetails, messages, addMessage, ensureSession, persistMessage, maybeGenerateTitle, showWarning, showError]);

  const handleSendImage = useCallback(async (imageData) => {
    const userMsg = { _id: Date.now().toString(), text: t('chat.analyzingPlantImage'), image: imageData.uri, createdAt: new Date(), isBot: false };
    addMessage(userMsg);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();

    try {
      const [uploadResult, diagResult] = await Promise.all([
        uploadImage(imageData.base64),
        diagnosePlantHealth(imageData.base64)
      ]);
      
      // Handle upload result
      if (uploadResult.success) {
        setMessages(prev => prev.map(m => m._id === userMsg._id ? { ...m, cloudinaryUrl: uploadResult.url } : m));
        persistMessage({ ...userMsg, cloudinaryUrl: uploadResult.url }, sessionId, { inputMethod: 'image', imageCloudinaryUrl: uploadResult.url });
      } else {
        console.warn('Image upload failed:', uploadResult.error);
        // Continue with diagnosis even if upload failed
      }
      
      // Handle diagnosis result
      if (!diagResult.success) {
        const errorMsg = parseErrorMessage(diagResult);
        showWarning(t('chat.plantAnalysisIssues', { details: errorMsg }));
        addMessage({ _id: (Date.now() + 1).toString(), text: t('chat.analysisCouldNotComplete', { details: errorMsg }), createdAt: new Date(), isBot: true });
      } else {
        const text = formatDiagnosis(diagResult.diagnosis);
        const botMsg = { _id: (Date.now() + 1).toString(), text, createdAt: new Date(), isBot: true };
        addMessage(botMsg);
        persistMessage(botMsg, sessionId, { diagnosisCrop: diagResult.diagnosis?.crop, diagnosisHealthStatus: diagResult.diagnosis?.healthStatus });
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      const errorMsg = parseErrorMessage(error);
      showError(errorMsg);
      addMessage({ _id: (Date.now() + 1).toString(), text: t('chat.imageAnalysisFailedBot'), createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
    }
  }, [addMessage, ensureSession, persistMessage]);

  // Transcribe audio for the VoiceRecorder component
  // Returns transcription text without sending to chat
  const transcribeAudioForInput = useCallback(async (audioData) => {
    try {
      const result = await transcribeAudioService(audioData.base64, audioData.language || language?.code);
      
      if (!result.success || !result.text) {
        return { 
          success: false, 
          error: result.error || t('voice.couldNotTranscribeAudio')
        };
      }
      
      return { 
        success: true, 
        transcription: result.text 
      };
    } catch (error) {
      console.error('Transcription error:', error);
      return { 
        success: false, 
        error: t('voice.transcriptionFailed')
      };
    }
  }, [language]);

  // Upload audio to Cloudinary in background (not shown in chat)
  const uploadAudioInBackground = useCallback(async (audioData) => {
    if (!audioData?.base64) return { success: false };
    
    try {
      console.log('📤 [useChat] Uploading voice audio in background...', {
        duration: audioData.duration,
        hasBase64: !!audioData.base64,
      });
      
      // iOS records as m4a, Android as m4a/3gp
      const format = Platform.OS === 'ios' ? 'm4a' : 'm4a';
      const result = await uploadAudio(audioData.base64, format);
      
      if (result.success) {
        console.log('✅ [useChat] Voice audio uploaded:', result.url);
        // Audio stored for record-keeping/analytics, not shown in chat
      } else {
        console.log('⚠️ [useChat] Voice audio upload failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Background audio upload error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    messages,
    isTyping,
    isLoadingSession,
    newestBotMessageId,
    handleSendText,
    handleSendImage,
    handleSendWidget, // For widget form submissions
    showInputWidget, // For showing input widgets from Tools menu
    transcribeAudioForInput, // For VoiceRecorder
    uploadAudioInBackground, // For silent audio storage
    startNewSession,
  };
}
