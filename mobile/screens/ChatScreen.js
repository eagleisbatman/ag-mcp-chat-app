import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import ThemeToggle from '../components/ThemeToggle';
import { sendChatMessage } from '../services/api';
import { diagnosePlantHealth, formatDiagnosis } from '../services/agrivision';
import { transcribeAudio } from '../services/whisper';

const WELCOME_MESSAGE = {
  _id: 'welcome',
  text: "Hello! 👋 I'm your farming assistant.\n\nI can help you with:\n• Weather forecasts\n• Crop recommendations\n• Plant disease diagnosis (send a photo!)\n• Soil health advice\n\nHow can I help you today?",
  createdAt: new Date(),
  isBot: true,
};

export default function ChatScreen({ navigation }) {
  const { theme, language, location, resetOnboarding } = useApp();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [newestBotMessageId, setNewestBotMessageId] = useState(null);

  const addMessage = useCallback((message) => {
    setMessages(prev => [message, ...prev]);
    // Track newest bot message for typewriter effect
    if (message.isBot) {
      setNewestBotMessageId(message._id);
      // Clear the flag after animation completes (approx. 5 seconds max)
      setTimeout(() => {
        setNewestBotMessageId(prev => prev === message._id ? null : prev);
      }, 8000);
    }
  }, []);

  const handleSendText = useCallback(async (text) => {
    // Add user message
    const userMessage = {
      _id: Date.now().toString(),
      text,
      createdAt: new Date(),
      isBot: false,
    };
    addMessage(userMessage);
    setIsTyping(true);

    try {
      const result = await sendChatMessage({
        message: text,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: language?.code,
      });

      const botMessage = {
        _id: (Date.now() + 1).toString(),
        text: result.success 
          ? result.response 
          : "Sorry, I couldn't process that. Please try again.",
        createdAt: new Date(),
        isBot: true,
      };
      addMessage(botMessage);
    } catch (error) {
      addMessage({
        _id: (Date.now() + 1).toString(),
        text: "Connection error. Please check your internet and try again.",
        createdAt: new Date(),
        isBot: true,
      });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, addMessage]);

  const handleSendImage = useCallback(async (imageData) => {
    // Add user message with image
    const userMessage = {
      _id: Date.now().toString(),
      text: "Analyzing this plant image...",
      image: imageData.uri,
      createdAt: new Date(),
      isBot: false,
    };
    addMessage(userMessage);
    setIsTyping(true);

    try {
      const result = await diagnosePlantHealth(imageData.base64);

      let responseText;
      if (result.success) {
        responseText = formatDiagnosis(result.diagnosis);
      } else {
        responseText = `Sorry, I couldn't analyze the image: ${result.error}`;
      }

      addMessage({
        _id: (Date.now() + 1).toString(),
        text: responseText,
        createdAt: new Date(),
        isBot: true,
      });
    } catch (error) {
      addMessage({
        _id: (Date.now() + 1).toString(),
        text: "Failed to analyze the image. Please try again.",
        createdAt: new Date(),
        isBot: true,
      });
    } finally {
      setIsTyping(false);
    }
  }, [addMessage]);

  const handleSendVoice = useCallback(async (audioData) => {
    // Add user message
    const userMessage = {
      _id: Date.now().toString(),
      text: `🎤 Voice message (${audioData.duration}s) - Transcribing...`,
      createdAt: new Date(),
      isBot: false,
    };
    addMessage(userMessage);
    setIsTyping(true);

    try {
      // Transcribe audio
      const transcription = await transcribeAudio(audioData.base64, language?.code);

      if (!transcription.success || !transcription.text) {
        addMessage({
          _id: (Date.now() + 1).toString(),
          text: "Sorry, I couldn't understand the audio. Please try again.",
          createdAt: new Date(),
          isBot: true,
        });
        setIsTyping(false);
        return;
      }

      // Update user message with transcription
      setMessages(prev => prev.map(msg => 
        msg._id === userMessage._id 
          ? { ...msg, text: transcription.text }
          : msg
      ));

      // Send transcribed text to chat
      const result = await sendChatMessage({
        message: transcription.text,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: language?.code,
      });

      addMessage({
        _id: (Date.now() + 1).toString(),
        text: result.success ? result.response : "Sorry, I couldn't process that.",
        createdAt: new Date(),
        isBot: true,
      });
    } catch (error) {
      addMessage({
        _id: (Date.now() + 1).toString(),
        text: "Voice processing failed. Please try again.",
        createdAt: new Date(),
        isBot: true,
      });
    } finally {
      setIsTyping(false);
    }
  }, [location, language, addMessage]);

  const openSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="leaf" size={28} color={theme.accent} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Farm Assistant</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              {language?.nativeName || 'English'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <ThemeToggle />
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={openSettings}
          >
            <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => (
          <MessageItem 
            message={item} 
            isNewMessage={item._id === newestBotMessageId}
          />
        )}
        keyExtractor={(item) => item._id}
        inverted
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.typingIndicator, { backgroundColor: theme.botMessage }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.typingText, { color: theme.textSecondary }]}>
                Thinking...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <InputToolbar
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        onSendVoice={handleSendVoice}
        disabled={isTyping}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  typingText: {
    fontSize: 14,
  },
});

