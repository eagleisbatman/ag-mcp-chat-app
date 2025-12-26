import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Platform, Animated, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import DiagnosisCard from './DiagnosisCard';
import { t } from '../constants/strings';

/**
 * Sanitize streaming text to prevent partial markdown from rendering incorrectly
 * During streaming, incomplete markdown syntax like `**bo` shows raw characters
 * This function trims incomplete patterns from the end of streaming text
 */
function sanitizeStreamingMarkdown(text) {
  if (!text) return text;

  // Patterns that indicate incomplete markdown at the end of text
  // We check if the text ends with an unclosed pattern and trim it

  // Count open/close markers
  const starCount = (text.match(/\*+$/g) || [''])[0].length;

  // If ends with odd number of asterisks (incomplete bold/italic), remove them
  if (starCount > 0 && starCount < 4) {
    // Check if this is unclosed by counting pairs
    const openBold = (text.match(/\*\*(?!\s)/g) || []).length;
    const closeBold = (text.match(/(?<!\s)\*\*/g) || []).length;
    const openItalic = (text.match(/(?<!\*)\*(?!\*|\s)/g) || []).length;
    const closeItalic = (text.match(/(?<!\s|\*)\*(?!\*)/g) || []).length;

    // Simple heuristic: if ends with stars and they seem unclosed
    if (openBold !== closeBold || openItalic !== closeItalic) {
      text = text.replace(/\*+$/, '');
    }
  }

  // Remove trailing incomplete link/image syntax
  text = text.replace(/\[([^\]]*)?$/, ''); // Unclosed [
  text = text.replace(/\]\([^)]*$/, '');   // Unclosed (

  // Remove trailing incomplete code blocks
  text = text.replace(/`+$/, '');

  // Remove trailing incomplete headers that have just started
  text = text.replace(/\n#{1,6}\s*$/, '\n');

  return text;
}

function MessageItem({ message, isNewMessage = false, diagnosisTitle, onLayout, onRetry }) {
  const { theme, language, isDark, locationDetails } = useApp();
  const { showError } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const isBot = message.isBot;
  const isStreaming = message.isStreaming || false;
  const rippleColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Don't render empty streaming messages (typing indicator handles this state)
  if (isBot && isStreaming && !message.text) {
    return null;
  }
  
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
    // Use 24-hour format for universal readability across all languages
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const textColor = theme.text;

  // Markdown styles - properly constrained for mobile
  const markdownStyles = useMemo(() => ({
    body: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.base,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    },
    heading1: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.xl,
      fontWeight: TYPOGRAPHY.weights.bold,
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    heading2: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.lg,
      fontWeight: TYPOGRAPHY.weights.semibold,
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    heading3: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.md,
      fontWeight: TYPOGRAPHY.weights.semibold,
      marginBottom: SPACING.xs,
      marginTop: SPACING.sm,
    },
    strong: {
      fontWeight: TYPOGRAPHY.weights.bold,
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
      fontSize: TYPOGRAPHY.sizes.xs,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
      marginRight: SPACING.sm,
      marginTop: SPACING.sm,
    },
    bullet_list_content: {
      flex: 1,
      flexShrink: 1,
    },
    ordered_list_icon: {
      color: theme.accent,
      fontSize: TYPOGRAPHY.sizes.sm,
      fontWeight: TYPOGRAPHY.weights.semibold,
      marginRight: SPACING.sm,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    },
    ordered_list_content: {
      flex: 1,
      flexShrink: 1,
    },
    code_inline: {
      backgroundColor: 'transparent',
      color: theme.accent,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 0,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: TYPOGRAPHY.sizes.sm,
    },
    code_block: {
      backgroundColor: 'transparent',
      padding: SPACING.md,
      borderRadius: 0,
      marginVertical: SPACING.sm,
    },
    fence: {
      backgroundColor: 'transparent',
      padding: SPACING.md,
      borderRadius: 0,
      marginVertical: SPACING.sm,
    },
    link: {
      color: theme.accent,
      textDecorationLine: 'underline',
    },
    paragraph: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    hr: {
      backgroundColor: theme.border,
      height: 1,
      marginVertical: SPACING.md,
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

    // 1. Instant Playback for Cached Messages
    // If the message already has a TTS URL (from history) or previous play
    if (message.ttsAudioUrl) {
      console.log('🔊 [MessageItem] Playing from cache:', message.ttsAudioUrl);
      setIsSpeaking(true);
      const success = await playAudio(message.ttsAudioUrl, (status) => {
        if (status.didJustFinish) setIsSpeaking(false);
      });
      if (!success) setIsSpeaking(false);
      return;
    }

    setIsLoading(true);

    try {
      // Get the text to speak
      let textToSpeak = message.text;

      // For diagnosis messages, generate speakable text from diagnosisData
      if (!textToSpeak && message.diagnosisData) {
        const d = message.diagnosisData;
        const crop = d.crop?.name || d.crop || 'Plant';
        const status = d.health_status?.overall || d.health_status || 'analyzed';
        const stage = d.growth_stage ? `, growth stage ${d.growth_stage}` : '';
        const issues = d.issues?.length > 0
          ? `. Issues found: ${d.issues.map(i => i.name || i).join(', ')}`
          : '';
        textToSpeak = `${crop}${stage}. Status: ${status}${issues}`;
      }
      
      // Call TTS service (pass language code, location)
      const result = await textToSpeech(textToSpeak, language?.code || 'en', locationDetails);
      
      // Use audioUrl (Cloudinary) or fallback to audioBase64
      const audioSource = result.audioUrl || result.audioBase64;
      
      if (result.success && audioSource) {
        setIsSpeaking(true);
        
        // Save the URL to message object so next play is instant
        if (result.audioUrl) {
          message.ttsAudioUrl = result.audioUrl;
        }
        
        // Play the audio (supports both URL and base64)
        const playSuccess = await playAudio(audioSource, (status) => {
          if (status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
        
        if (!playSuccess) {
          setIsSpeaking(false);
          showError(t('voice.audioPlaybackFailed'));
        }
      } else {
        // Log error but don't use console.error (can trigger system alerts)
        console.log('TTS service error:', result.error);
        showError(t('voice.voiceUnavailableLater'));
      }
    } catch (error) {
      // Log error but don't use console.error
      console.log('TTS exception:', error.message);
      showError(t('voice.voiceUnavailable'));
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
        { backgroundColor: 'transparent' },
      ]}
      onLayout={(event) => {
        if (onLayout) {
          onLayout(event.nativeEvent.layout.height);
        }
      }}
    >
      {/* Sender Name */}
      <View style={styles.header}>
        <Text style={[styles.senderName, { color: isBot ? theme.accent : theme.textSecondary }]}>
          {isBot ? t('chat.senderAssistant') : t('chat.senderYou')}
        </Text>
        <View style={styles.headerRight}>
          {/* Speak button - only for bot messages */}
          {isBot && (
            <Pressable
              style={styles.speakButton}
              onPress={handleSpeak}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={isSpeaking ? t('a11y.stopVoicePlayback') : t('a11y.playVoice')}
              android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: false } : undefined}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.icon} />
              ) : (
                <AppIcon
                  name={isSpeaking ? 'stop-circle' : 'volume-high'}
                  size={18}
                  color={isSpeaking ? theme.error : theme.icon}
                />
              )}
            </Pressable>
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
      
      {/* Message Content - Text-only mode (Markdown for bot, plain text for user) */}
      {isBot ? (
        <Animated.View style={[styles.markdownContainer, { opacity: fadeAnim, maxWidth: contentMaxWidth }]}>
          {/* Hide text bubble if we have a native diagnosis card */}
          {message.text && !message.diagnosisData ? (
            <Markdown style={markdownStyles}>
              {isStreaming
                ? sanitizeStreamingMarkdown(message.text) + ' ▋'
                : message.text}
            </Markdown>
          ) : null}

          {/* Native structured report card (aggregation data only) */}
          {message.diagnosisData && (
            <DiagnosisCard
              diagnosis={message.diagnosisData}
              onRetry={onRetry}
            />
          )}
        </Animated.View>
      ) : (
        // User message - only show text if it exists (image messages may have no text)
        message.text ? (
          <Text style={[styles.messageText, { color: theme.text }]}>
            {message.text}
          </Text>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 0,
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
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  markdownContainer: {
    flex: 1,
    width: '100%',
  },
  messageText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  diagnosisBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 16, // Rounded corners for modern card look
    borderWidth: 1,   // Subtle border
    backgroundColor: 'transparent',
  },
  diagnosisText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.relaxed,
  },
});

// Memoize to prevent unnecessary re-renders (fixes VirtualizedList warning)
export default React.memo(MessageItem, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.image === nextProps.message.image &&
    prevProps.message.diagnosisData === nextProps.message.diagnosisData &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.isNewMessage === nextProps.isNewMessage
  );
});
