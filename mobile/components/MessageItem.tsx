import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Animated, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { textToSpeech } from '../services/tts';
import { playAudio, stopAudio } from '../utils/audioPlayer';
import { generateDiagnosisTTSText } from '../utils/diagnosisNormalizer';
import { log } from '../utils/logger';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import DiagnosisCard from './DiagnosisCard';
import { t } from '../constants/strings';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  isNewMessage?: boolean;
  diagnosisTitle?: string;
  onLayout?: (height: number) => void;
  onRetry?: () => void;
}

/**
 * Sanitize streaming text to prevent partial markdown from rendering incorrectly
 */
function sanitizeStreamingMarkdown(text: string): string {
  if (!text) return text;

  // Count open/close markers
  const starMatch = text.match(/\*+$/g);
  const starCount = starMatch ? starMatch[0].length : 0;

  // If ends with odd number of asterisks (incomplete bold/italic), remove them
  if (starCount > 0 && starCount < 4) {
    const openBold = (text.match(/\*\*(?!\s)/g) || []).length;
    const closeBold = (text.match(/(?<!\s)\*\*/g) || []).length;
    const openItalic = (text.match(/(?<!\*)\*(?!\*|\s)/g) || []).length;
    const closeItalic = (text.match(/(?<!\s|\*)\*(?!\*)/g) || []).length;

    if (openBold !== closeBold || openItalic !== closeItalic) {
      text = text.replace(/\*+$/, '');
    }
  }

  // Remove trailing incomplete link/image syntax
  text = text.replace(/\[([^\]]*)?$/, '');
  text = text.replace(/\]\([^)]*$/, '');

  // Remove trailing incomplete code blocks
  text = text.replace(/`+$/, '');

  // Remove trailing incomplete headers
  text = text.replace(/\n#{1,6}\s*$/, '\n');

  return text;
}

function MessageItem({ message, isNewMessage = false, diagnosisTitle, onLayout, onRetry }: MessageItemProps): JSX.Element | null {
  const { theme, language, isDark, locationDetails } = useApp();
  const { showError } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const isBot = message.isBot;
  const isStreaming = message.isStreaming || false;
  const rippleColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Don't render empty streaming messages
  if (isBot && isStreaming && !message.text) {
    return null;
  }
  
  const contentMaxWidth = screenWidth - (SPACING.lg * 2);
  
  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localTtsUrl, setLocalTtsUrl] = useState(message.ttsAudioUrl);
  
  // Animation state
  const [fadeAnim] = useState(() => new Animated.Value(isNewMessage ? 0 : 1));
  
  useEffect(() => {
    if (isNewMessage && isBot) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isNewMessage, isBot, fadeAnim]);

  const formatTime = (date: Date | string): string => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const textColor = theme.text;

  const markdownStyles = useMemo(() => ({
    body: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.base,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    },
    heading1: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.xl,
      fontWeight: TYPOGRAPHY.weights.bold as '700',
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    heading2: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.lg,
      fontWeight: TYPOGRAPHY.weights.semibold as '600',
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    heading3: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.md,
      fontWeight: TYPOGRAPHY.weights.semibold as '600',
      marginBottom: SPACING.xs,
      marginTop: SPACING.sm,
    },
    strong: {
      fontWeight: TYPOGRAPHY.weights.bold as '700',
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
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
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
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
      fontWeight: TYPOGRAPHY.weights.semibold as '600',
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
      textDecorationLine: 'underline' as const,
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
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'flex-start' as const,
    },
    text: {
      color: textColor,
    },
  }), [theme, textColor]);

  const handleSpeak = async (): Promise<void> => {
    if (isSpeaking) {
      await stopAudio();
      setIsSpeaking(false);
      return;
    }

    const cachedUrl = localTtsUrl || message.ttsAudioUrl;
    if (cachedUrl) {
      log('🔊 [MessageItem] Playing from cache:', cachedUrl);
      setIsSpeaking(true);
      const success = await playAudio(cachedUrl, (status) => {
        if (status.isLoaded && status.didJustFinish) setIsSpeaking(false);
      });
      if (!success) setIsSpeaking(false);
      return;
    }

    setIsLoading(true);

    try {
      let textToSpeak = message.text;

      if (!textToSpeak && message.diagnosisData) {
        textToSpeak = generateDiagnosisTTSText(message.diagnosisData);
      }
      
      const ttsLocation = locationDetails ? {
        country: locationDetails.level1Country,
        state: locationDetails.level2State,
        city: locationDetails.level5City || locationDetails.displayName,
      } : undefined;
      
      const result = await textToSpeech(textToSpeak || '', language?.code || 'en', ttsLocation);
      
      const audioSource = result.audioUrl || result.audioBase64;
      
      if (result.success && audioSource) {
        setIsSpeaking(true);
        
        if (result.audioUrl) {
          setLocalTtsUrl(result.audioUrl);
        }
        
        const playSuccess = await playAudio(audioSource, (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
        
        if (!playSuccess) {
          setIsSpeaking(false);
          showError(t('voice.audioPlaybackFailed'));
        }
      } else {
        log('TTS service error:', result.error);
        showError(t('voice.voiceUnavailableLater'));
      }
    } catch (error) {
      log('TTS exception:', (error as Error).message);
      showError(t('voice.voiceUnavailable'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopAudio();
      }
    };
  }, [isSpeaking]);

  const handleLayout = (event: LayoutChangeEvent): void => {
    if (onLayout) {
      onLayout(event.nativeEvent.layout.height);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: 'transparent' },
      ]}
      onLayout={handleLayout}
    >
      <View style={styles.header}>
        <Text style={[styles.senderName, { color: isBot ? theme.accent : theme.textSecondary }]}>
          {isBot ? t('chat.senderAssistant') : t('chat.senderYou')}
        </Text>
        <View style={styles.headerRight}>
          {isBot && (
            <Pressable
              style={styles.speakButton}
              onPress={handleSpeak}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={isSpeaking ? t('a11y.stopVoicePlayback') : t('a11y.playVoice')}
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

      {message.image && (
        <Image 
          source={{ uri: message.image }} 
          style={styles.image}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'LJI=IA%1_4%2D*s:WBoe~pt6-ooJ' }}
        />
      )}
      
      {isBot ? (
        <Animated.View style={[styles.markdownContainer, { opacity: fadeAnim, maxWidth: contentMaxWidth }]}>
          {message.text ? (
            <Markdown style={markdownStyles}>
              {isStreaming
                ? sanitizeStreamingMarkdown(message.text) + ' ▋'
                : message.text}
            </Markdown>
          ) : null}

          {message.diagnosisData && (
            <DiagnosisCard
              diagnosis={message.diagnosisData}
              onRetry={onRetry}
            />
          )}
        </Animated.View>
      ) : (
        message.text && !message.text.startsWith('[Image for') ? (
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
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  diagnosisText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.relaxed,
  },
});

export default React.memo(MessageItem, (prevProps, nextProps) => {
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.image === nextProps.message.image &&
    prevProps.message.diagnosisData === nextProps.message.diagnosisData &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.isNewMessage === nextProps.isNewMessage
  );
});
