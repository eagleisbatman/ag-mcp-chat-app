// Chat hook - handles messages, sessions, and persistence
import { useState, useCallback, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { sendChatMessage } from '../services/api';
import { diagnosePlantHealth, formatDiagnosis } from '../services/agrivision';
import { transcribeAudio } from '../services/whisper';
import { uploadImage } from '../services/upload';
import { createSession, saveMessage, generateTitle, updateSession, getSession } from '../services/db';
import { parseErrorMessage, isNetworkError } from '../utils/apiHelpers';

const WELCOME_MESSAGE = {
  _id: 'welcome',
  text: "Hello! 👋 I'm your farming assistant.\n\nI can help you with:\n• Crops, vegetables, fruits, and flowers\n• Livestock, poultry, and fish farming\n• Pest and disease management\n• Weather and market advice\n\nHow can I help you today?",
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
        })).reverse(); // Newest first for inverted FlatList
        
        setMessages([...loadedMessages, WELCOME_MESSAGE]);
        setCurrentSessionId(sessionId);
        titleGeneratedRef.current = true; // Already has title
        console.log('📂 [useChat] Loaded session with', loadedMessages.length, 'messages');
      }
    } catch (error) {
      console.error('Load session error:', error);
      showError('Could not load conversation');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const startNewSession = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentSessionId(null);
    titleGeneratedRef.current = false;
    showSuccess('Started new conversation');
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

  // Generate title after 3+ messages
  const maybeGenerateTitle = useCallback(async (sessionId, allMessages) => {
    if (titleGeneratedRef.current || !sessionId || !isDbSynced) return;
    if (allMessages.filter(m => !m.isBot).length < 2) return;
    
    titleGeneratedRef.current = true;
    try {
      const result = await generateTitle(
        allMessages.slice(0, 6).map(m => ({ role: m.isBot ? 'assistant' : 'user', content: m.text })),
        language?.code
      );
      if (result.success && result.title) {
        await updateSession(sessionId, { title: result.title });
      }
    } catch (e) {
      console.log('Title generation error:', e);
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
        history: messages, // Pass conversation history for context
      });
      
      if (!result.success) {
        const errorMsg = parseErrorMessage(result);
        if (isNetworkError({ message: result.error })) {
          showError('No internet connection. Please check your network.');
        }
        addMessage({ 
          _id: (Date.now() + 1).toString(), 
          text: `Sorry, I couldn't process that. ${errorMsg}`, 
          createdAt: new Date(), 
          isBot: true 
        });
      } else {
        const botMsg = {
          _id: (Date.now() + 1).toString(),
          text: result.response,
          createdAt: new Date(),
          isBot: true,
        };
        addMessage(botMsg);
        persistMessage(botMsg, sessionId, { responseLanguageCode: language?.code });
        maybeGenerateTitle(sessionId, [botMsg, userMessage, ...messages]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = parseErrorMessage(error);
      // Note: Retry uses the captured `text` value which is correct since we're retrying the same message
      const retryAction = isNetworkError(error) ? { label: 'Retry', onPress: () => handleSendText(text) } : null;
      showError(errorMsg, retryAction);
      addMessage({ _id: (Date.now() + 1).toString(), text: "Connection error. Please try again.", createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, messages, addMessage, ensureSession, persistMessage, maybeGenerateTitle]);

  const handleSendImage = useCallback(async (imageData) => {
    const userMsg = { _id: Date.now().toString(), text: "Analyzing plant image...", image: imageData.uri, createdAt: new Date(), isBot: false };
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
        showWarning(`Plant analysis had issues: ${errorMsg}`);
        addMessage({ _id: (Date.now() + 1).toString(), text: `Analysis couldn't complete. ${errorMsg}`, createdAt: new Date(), isBot: true });
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
      addMessage({ _id: (Date.now() + 1).toString(), text: "Image analysis failed. Please try again.", createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
    }
  }, [addMessage, ensureSession, persistMessage]);

  const handleSendVoice = useCallback(async (audioData) => {
    const userMsg = { _id: Date.now().toString(), text: `🎤 Voice (${audioData.duration}s) - Transcribing...`, createdAt: new Date(), isBot: false };
    addMessage(userMsg);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sessionId = await ensureSession();

    try {
      const transcription = await transcribeAudio(audioData.base64, language?.code);
      
      if (!transcription.success || !transcription.text) {
        const errorMsg = transcription.error || "Couldn't understand the audio";
        showWarning(`Voice recognition: ${errorMsg}`);
        addMessage({ _id: (Date.now() + 1).toString(), text: `Couldn't understand the audio. Please try speaking more clearly.`, createdAt: new Date(), isBot: true });
        setIsTyping(false);
        return;
      }
      
      // Update user message with transcription
      setMessages(prev => prev.map(m => m._id === userMsg._id ? { ...m, text: transcription.text } : m));
      persistMessage({ ...userMsg, text: transcription.text }, sessionId, { inputMethod: 'voice', asrTranscription: transcription.text });

      // Now send to chat with history
      const result = await sendChatMessage({ 
        message: transcription.text, 
        latitude: location?.latitude, 
        longitude: location?.longitude, 
        language: language?.code,
        history: messages, // Pass conversation history for context
      });
      
      if (!result.success) {
        showError(parseErrorMessage(result));
        addMessage({ _id: (Date.now() + 1).toString(), text: "Sorry, I couldn't process your request. Please try again.", createdAt: new Date(), isBot: true });
      } else {
        const botMsg = { _id: (Date.now() + 1).toString(), text: result.response, createdAt: new Date(), isBot: true };
        addMessage(botMsg);
        persistMessage(botMsg, sessionId, { responseLanguageCode: language?.code });
        maybeGenerateTitle(sessionId, [botMsg, userMsg, ...messages]);
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      showError(parseErrorMessage(error));
      addMessage({ _id: (Date.now() + 1).toString(), text: "Voice processing failed. Please try again.", createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, messages, addMessage, ensureSession, persistMessage, maybeGenerateTitle]);

  return { 
    messages, 
    isTyping, 
    isLoadingSession,
    newestBotMessageId, 
    handleSendText, 
    handleSendImage, 
    handleSendVoice,
    startNewSession,
  };
}

