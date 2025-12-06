import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import TypewriterText from './TypewriterText';

function MessageItem({ message, isNewMessage = false, onFollowUpPress }) {
  const { theme, language } = useApp();
  const { showError } = useToast();
  const isBot = message.isBot;
  const followUpQuestions = message.followUpQuestions || [];
  
  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track if typewriter animation is complete
  const [typewriterComplete, setTypewriterComplete] = useState(!isNewMessage);
  
  // Use plain text animation only for NEW messages
  const shouldAnimate = isNewMessage && !typewriterComplete;

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Markdown styles - optimized to prevent text overflow
  const markdownStyles = {
    body: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
    },
    heading1: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 8,
    },
    heading2: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 6,
    },
    heading3: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    strong: {
      fontWeight: '700',
      color: theme.accent, // Highlight bold facts in accent color
    },
    em: {
      fontStyle: 'italic',
    },
    bullet_list: {
      marginVertical: 4,
      paddingLeft: 0,
    },
    ordered_list: {
      marginVertical: 4,
      paddingLeft: 0,
    },
    list_item: {
      marginVertical: 3,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bullet_list_icon: {
      color: theme.accent,
      fontSize: 8,
      marginRight: 8,
      marginTop: 7,
    },
    bullet_list_content: {
      flex: 1,
    },
    code_inline: {
      backgroundColor: theme.surfaceVariant,
      color: theme.accent,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
    },
    code_block: {
      backgroundColor: theme.surfaceVariant,
      padding: 10,
      borderRadius: 8,
      marginVertical: 6,
    },
    fence: {
      backgroundColor: theme.surfaceVariant,
      padding: 10,
      borderRadius: 8,
      marginVertical: 6,
    },
    link: {
      color: theme.accent,
      textDecorationLine: 'underline',
    },
    paragraph: {
      marginVertical: 4,
    },
    textgroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
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
      
      // Call TTS service (pass language code, not object)
      const result = await textToSpeech(textToSpeak, language?.code || 'en');
      
      // Use audioUrl (Cloudinary) or fallback to audioBase64
      const audioSource = result.audioUrl || result.audioBase64;
      
      if (result.success && audioSource) {
        setIsSpeaking(true);
        
        // Play the audio (supports both URL and base64)
        const playSuccess = await playAudio(audioSource, (status) => {
          if (status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
        
        if (!playSuccess) {
          setIsSpeaking(false);
          showError('Audio playback failed');
        }
      } else {
        // Log error but don't use console.error (can trigger system alerts)
        console.log('TTS service error:', result.error);
        showError('Voice unavailable - please try again later');
      }
    } catch (error) {
      // Log error but don't use console.error
      console.log('TTS exception:', error.message);
      showError('Voice unavailable - please try again');
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
                  color={isSpeaking ? theme.error : theme.accent}
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
      
      {/* Message Content - Use Markdown for bot messages, plain text for user */}
      {isBot && shouldAnimate ? (
        // Typewriter for new bot messages - plain text during animation
        <TypewriterText
          text={message.text}
          style={[styles.messageText, { color: theme.text }]}
          speed={50}
          animate={true}
          onComplete={() => setTypewriterComplete(true)}
        />
      ) : isBot ? (
        // Markdown for completed bot messages (renders immediately after animation)
        <Markdown style={markdownStyles}>
          {message.text}
        </Markdown>
      ) : (
        // Plain text for user messages
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

      {/* Follow-up Questions - Vertical List */}
      {isBot && followUpQuestions.length > 0 && !shouldAnimate && (
        <View style={styles.followUpContainer}>
          <Text style={[styles.followUpLabel, { color: theme.textMuted }]}>
            👆 Tap to ask next:
          </Text>
          <View style={styles.followUpList}>
            {followUpQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.followUpItem, { 
                  backgroundColor: theme.surfaceVariant,
                  borderLeftColor: theme.accent,
                }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFollowUpPress?.(question);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.followUpText, { color: theme.text }]}>
                  {question}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
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
  // Follow-up questions - vertical list
  followUpContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  followUpLabel: {
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  followUpList: {
    gap: 6,
  },
  followUpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  followUpText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
});

// Memoize to prevent unnecessary re-renders (fixes VirtualizedList warning)
export default React.memo(MessageItem, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.isNewMessage === nextProps.isNewMessage
  );
});
