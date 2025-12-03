// Chat hook - handles messages, sessions, and persistence
import { useState, useCallback, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { sendChatMessage } from '../services/api';
import { diagnosePlantHealth, formatDiagnosis } from '../services/agrivision';
import { transcribeAudio } from '../services/whisper';
import { uploadImage } from '../services/upload';
import { createSession, saveMessage, generateTitle, updateSession } from '../services/db';

const WELCOME_MESSAGE = {
  _id: 'welcome',
  text: "Hello! 👋 I'm your farming assistant.\n\nI can help you with:\n• Weather forecasts\n• Crop recommendations\n• Plant disease diagnosis\n• Soil health advice\n\nHow can I help you today?",
  createdAt: new Date(),
  isBot: true,
};

export default function useChat() {
  const { language, location, locationDetails, currentSessionId, setCurrentSessionId, isDbSynced } = useApp();
  
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [newestBotMessageId, setNewestBotMessageId] = useState(null);
  const titleGeneratedRef = useRef(false);

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
      });
      const botMsg = {
        _id: (Date.now() + 1).toString(),
        text: result.success ? result.response : "Sorry, I couldn't process that.",
        createdAt: new Date(),
        isBot: true,
      };
      addMessage(botMsg);
      persistMessage(botMsg, sessionId, { responseLanguageCode: language?.code });
      maybeGenerateTitle(sessionId, [botMsg, userMessage, ...messages]);
    } catch {
      addMessage({ _id: (Date.now() + 1).toString(), text: "Connection error.", createdAt: new Date(), isBot: true });
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
      const [uploadResult, diagResult] = await Promise.all([uploadImage(imageData.base64), diagnosePlantHealth(imageData.base64)]);
      if (uploadResult.success) {
        setMessages(prev => prev.map(m => m._id === userMsg._id ? { ...m, cloudinaryUrl: uploadResult.url } : m));
        persistMessage({ ...userMsg, cloudinaryUrl: uploadResult.url }, sessionId, { inputMethod: 'image', imageCloudinaryUrl: uploadResult.url });
      }
      const text = diagResult.success ? formatDiagnosis(diagResult.diagnosis) : `Analysis failed: ${diagResult.error}`;
      const botMsg = { _id: (Date.now() + 1).toString(), text, createdAt: new Date(), isBot: true };
      addMessage(botMsg);
      persistMessage(botMsg, sessionId, { diagnosisCrop: diagResult.diagnosis?.crop, diagnosisHealthStatus: diagResult.diagnosis?.healthStatus });
    } catch {
      addMessage({ _id: (Date.now() + 1).toString(), text: "Image analysis failed.", createdAt: new Date(), isBot: true });
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
        addMessage({ _id: (Date.now() + 1).toString(), text: "Couldn't understand audio.", createdAt: new Date(), isBot: true });
        setIsTyping(false);
        return;
      }
      setMessages(prev => prev.map(m => m._id === userMsg._id ? { ...m, text: transcription.text } : m));
      persistMessage({ ...userMsg, text: transcription.text }, sessionId, { inputMethod: 'voice', asrTranscription: transcription.text });

      const result = await sendChatMessage({ message: transcription.text, latitude: location?.latitude, longitude: location?.longitude, language: language?.code });
      const botMsg = { _id: (Date.now() + 1).toString(), text: result.success ? result.response : "Processing failed.", createdAt: new Date(), isBot: true };
      addMessage(botMsg);
      persistMessage(botMsg, sessionId, { responseLanguageCode: language?.code });
      maybeGenerateTitle(sessionId, [botMsg, userMsg, ...messages]);
    } catch {
      addMessage({ _id: (Date.now() + 1).toString(), text: "Voice processing failed.", createdAt: new Date(), isBot: true });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, messages, addMessage, ensureSession, persistMessage, maybeGenerateTitle]);

  return { messages, isTyping, newestBotMessageId, handleSendText, handleSendImage, handleSendVoice };
}

