import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Platform, Animated, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import { t } from '../constants/strings';
import { WidgetRenderer, WidgetSuggestion } from '../widgets';

function MessageItem({ message, isNewMessage = false, onFollowUpPress, onWidgetSubmit, onWidgetSuggestionAccept }) {
  const { theme, language } = useApp();
  const { showError } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const isBot = message.isBot;
  const followUpQuestions = message.followUpQuestions || [];
  const hasWidget = message.widget && message.widget.type;
  const hasSuggestedWidget = message.suggestedWidget && message.suggestedWidget.type;
  const rippleColor = theme.name === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Debug logging for widget rendering
  if (isBot && message.widget) {
    console.log('🎨 [MessageItem] Widget detected:', {
      type: message.widget?.type,
      hasData: !!message.widget?.data,
      dataKeys: message.widget?.data ? Object.keys(message.widget.data) : [],
      currentTemp: message.widget?.data?.current?.temperature,
    });
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
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
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
    >
      {/* Sender Name */}
      <View style={styles.header}>
        <Text style={[styles.senderName, { color: isBot ? (theme.iconPrimary || theme.accent) : theme.textSecondary }]}>
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
              accessibilityLabel={isSpeaking ? 'Stop voice playback' : 'Play voice'}
              android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: false } : undefined}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <AppIcon
                  name={isSpeaking ? 'stop-circle' : 'volume-high'}
                  size={18}
                  color={isSpeaking ? theme.error : theme.accent}
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
      
      {/* Message Content - Widget, Markdown, or plain text */}
      {hasWidget ? (
        // Render widget FIRST, then explanatory text below
        <Animated.View style={[styles.widgetContainer, { opacity: fadeAnim }]}>
          <WidgetRenderer
            widget={message.widget}
            onSubmit={onWidgetSubmit}
            loading={message.widgetLoading}
          />
          {message.text && (
            <View style={styles.widgetExplainText}>
              <Markdown style={markdownStyles}>
                {message.text}
              </Markdown>
            </View>
          )}
        </Animated.View>
      ) : isBot ? (
        // Markdown for bot messages with smooth fade-in animation
        <Animated.View style={[styles.markdownContainer, { opacity: fadeAnim, maxWidth: contentMaxWidth }]}>
          <Markdown style={markdownStyles}>
            {message.text}
          </Markdown>
        </Animated.View>
      ) : (
        // Plain text for user messages
        <Text style={[styles.messageText, { color: theme.text }]}>
          {message.text}
        </Text>
      )}

      {/* Diagnosis Result (for image analysis) */}
      {message.diagnosis && (
        <View style={styles.diagnosisBox}>
          <Text style={[styles.diagnosisText, { color: theme.text }]}>
            {message.diagnosis}
          </Text>
        </View>
      )}

      {/* Widget Suggestion - Non-intrusive prompt for structured input */}
      {isBot && hasSuggestedWidget && !hasWidget && !isAnimating && (
        <WidgetSuggestion
          suggestion={message.suggestedWidget}
          onAccept={onWidgetSuggestionAccept}
        />
      )}

      {/* Follow-up Questions - Vertical List */}
      {isBot && followUpQuestions.length > 0 && !isAnimating && (
        <View style={styles.followUpContainer}>
          <Text style={[styles.followUpLabel, { color: theme.textMuted }]}>
            {t('chat.tapToAskNext')}
          </Text>
          <View style={styles.followUpList}>
            {followUpQuestions.map((question, index) => (
              <Pressable
                key={index}
                style={styles.followUpItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFollowUpPress?.(question);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Ask: ${question}`}
                android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: false } : undefined}
              >
                <Text style={[styles.followUpText, { color: theme.text }]}>
                  {question}
                </Text>
                <AppIcon name="arrow-forward" size={16} color={theme.textMuted} />
              </Pressable>
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
  widgetContainer: {
    flex: 1,
    width: '100%',
  },
  widgetExplainText: {
    marginTop: SPACING.md,
  },
  messageText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 0,
    marginBottom: SPACING.sm,
  },
  diagnosisBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  diagnosisText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.relaxed,
  },
  // Follow-up questions - vertical list
  followUpContainer: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 0,
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
    borderRadius: 0,
    backgroundColor: 'transparent',
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
    prevProps.message.widget === nextProps.message.widget &&
    prevProps.message.widgetLoading === nextProps.message.widgetLoading &&
    prevProps.message.suggestedWidget === nextProps.message.suggestedWidget &&
    prevProps.isNewMessage === nextProps.isNewMessage
  );
});
