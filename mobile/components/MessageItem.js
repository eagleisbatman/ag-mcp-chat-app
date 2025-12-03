import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio, isAudioPlaying } from '../utils/audioPlayer';
import TypewriterText from './TypewriterText';

export default function MessageItem({ message, isNewMessage = false }) {
  const { theme, language } = useApp();
  const isBot = message.isBot;
  
  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Handle speak button press
  const handleSpeak = async () => {
    // If already speaking, stop
    if (isSpeaking) {
      await stopAudio();
      setIsSpeaking(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the text to speak (message text or diagnosis)
      const textToSpeak = message.diagnosis || message.text;
      
      // Call TTS service
      const result = await textToSpeech(textToSpeak, language);
      
      // Use audioUrl (Cloudinary) or fallback to audioBase64
      const audioSource = result.audioUrl || result.audioBase64;
      
      if (result.success && audioSource) {
        setIsSpeaking(true);
        
        // Play the audio (supports both URL and base64)
        await playAudio(audioSource, (status) => {
          if (status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
      } else {
        console.error('TTS failed:', result.error);
        // Could show a toast/alert here
      }
    } catch (error) {
      console.error('Speak error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopAudio();
      }
    };
  }, [isSpeaking]);

  return (
    <View
      style={[
        styles.container,
        { 
          backgroundColor: isBot ? theme.botMessage : theme.userMessage,
          borderTopColor: theme.border,
        },
      ]}
    >
      {/* Sender Name */}
      <View style={styles.header}>
        <Text style={[styles.senderName, { color: isBot ? theme.accent : theme.textSecondary }]}>
          {isBot ? 'Farm Assistant' : 'You'}
        </Text>
        <View style={styles.headerRight}>
          {/* Speak button - only for bot messages */}
          {isBot && (
            <TouchableOpacity
              style={[styles.speakButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={handleSpeak}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons
                  name={isSpeaking ? 'stop-circle' : 'volume-high'}
                  size={18}
                  color={isSpeaking ? theme.error || '#D32F2F' : theme.accent}
                />
              )}
            </TouchableOpacity>
          )}
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
      </View>

      {/* Message Content */}
      {message.image && (
        <Image 
          source={{ uri: message.image }} 
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      {/* Use TypewriterText for new bot messages */}
      {isBot && isNewMessage ? (
        <TypewriterText
          text={message.text}
          style={[styles.messageText, { color: theme.text }]}
          speed={40}
          animate={true}
        />
      ) : (
        <Text style={[styles.messageText, { color: theme.text }]}>
          {message.text}
        </Text>
      )}

      {/* Diagnosis Result (for image analysis) */}
      {message.diagnosis && (
        <View style={[styles.diagnosisBox, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[styles.diagnosisText, { color: theme.text }]}>
            {message.diagnosis}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  speakButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  diagnosisBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  diagnosisText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
