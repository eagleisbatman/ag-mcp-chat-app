import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Platform, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

function MessageItem({ message, isNewMessage = false, onFollowUpPress }) {
  const { theme, language } = useApp();
  const { showError } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const isBot = message.isBot;
  const followUpQuestions = message.followUpQuestions || [];
  
  // Calculate max width for markdown content (screen - padding)
  const contentMaxWidth = screenWidth - (SPACING.lg * 2);
  
  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation state for smooth fade-in (replaces jarring typewriter)
  const [fadeAnim] = useState(() => new Animated.Value(isNewMessage ? 0 : 1));
  const [isAnimating, setIsAnimating] = useState(isNewMessage);
  
  // Smooth fade-in animation for new messages
  useEffect(() => {
    if (isNewMessage && isBot) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    }
  }, [isNewMessage, isBot, fadeAnim]);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const textColor = theme.botMessageText || theme.text;

  // Markdown styles - properly constrained for mobile
  const markdownStyles = useMemo(() => ({
    body: {
      color: textColor,
      fontSize: 15,
      lineHeight: 22,
    },
    heading1: {
      color: textColor,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 12,
    },
    heading2: {
      color: textColor,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 10,
    },
    heading3: {
      color: textColor,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 8,
    },
    strong: {
      fontWeight: '700',
      color: textColor,
    },
    em: {
      fontStyle: 'italic',
    },
    bullet_list: {
      marginTop: 6,
      marginBottom: 6,
    },
    ordered_list: {
      marginTop: 6,
      marginBottom: 6,
    },
    list_item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 3,
      marginBottom: 3,
    },
    bullet_list_icon: {
      color: theme.accent,
      fontSize: 6,
      lineHeight: 22,
      marginRight: 8,
      marginTop: 8,
    },
    bullet_list_content: {
      flex: 1,
      flexShrink: 1,
    },
    ordered_list_icon: {
      color: theme.accent,
      fontSize: 14,
      fontWeight: '600',
      marginRight: 8,
      lineHeight: 22,
    },
    ordered_list_content: {
      flex: 1,
      flexShrink: 1,
    },
    code_inline: {
      backgroundColor: theme.surfaceVariant,
      color: theme.accent,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
    },
    code_block: {
      backgroundColor: theme.surfaceVariant,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: theme.surfaceVariant,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    link: {
      color: theme.accent,
      textDecorationLine: 'underline',
    },
    paragraph: {
      marginTop: 6,
      marginBottom: 6,
    },
    hr: {
      backgroundColor: theme.border,
      height: 1,
      marginVertical: 12,
    },
    textgroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
    },
    text: {
      color: textColor,
    },
  }), [theme, textColor]);

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
        <Text style={[styles.senderName, { color: isBot ? (theme.iconPrimary || theme.accent) : theme.textSecondary }]}>
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
      {isBot ? (
        // Markdown for bot messages with smooth fade-in animation
        <Animated.View style={[styles.markdownContainer, { opacity: fadeAnim, maxWidth: contentMaxWidth }]}>
          <Markdown style={markdownStyles}>
            {message.text}
          </Markdown>
        </Animated.View>
      ) : (
        // Plain text for user messages
        <Text style={[styles.messageText, { color: theme.userMessageText || theme.text }]}>
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
      {isBot && followUpQuestions.length > 0 && !isAnimating && (
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  senderName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  speakButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markdownContainer: {
    flex: 1,
    width: '100%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: SPACING.radiusMd,
    marginBottom: SPACING.sm,
  },
  diagnosisBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: SPACING.radiusMd,
  },
  diagnosisText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.relaxed,
  },
  // Follow-up questions - vertical list
  followUpContainer: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 0.5,
  },
  followUpLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: SPACING.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  followUpList: {
    gap: SPACING.sm,
  },
  followUpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: SPACING.radiusMd,
    borderLeftWidth: 3,
  },
  followUpText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
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
