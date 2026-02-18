import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import DiagnosisCard from './DiagnosisCard';
import FollowUpQuestions from './FollowUpQuestions';
import TypingIndicator from './ui/TypingIndicator';
import { t } from '../constants/strings';
import { Message } from '../types';
import { useMessageTts } from './message/useMessageTts';
import { createMarkdownStyles } from './message/markdownStyles';
import { styles } from './message/messageItemStyles';
import ImageViewerModal from './chat/ImageViewerModal';

interface MessageItemProps {
  message: Message;
  isNewMessage?: boolean;
  diagnosisTitle?: string;
  onLayout?: (height: number) => void;
  onRetry?: () => void;
  onFollowUpTap?: (question: string) => void;
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

function MessageItem({ message, isNewMessage = false, diagnosisTitle: _diagnosisTitle, onLayout, onRetry, onFollowUpTap }: MessageItemProps): JSX.Element | null {
  const { theme, language, locationDetails } = useApp();
  const { showError } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const isBot = message.isBot;
  const isStreaming = message.isStreaming || message.status === 'streaming';
  const isThinking = message.status === 'thinking';

  const contentMaxWidth = screenWidth - (SPACING.lg * 2);

  // All hooks must be called unconditionally before any early returns
  const { isSpeaking, isLoading, handleSpeak } = useMessageTts({
    message,
    languageCode: language?.code || 'en',
    locationDetails,
    onError: showError,
  });

  // Image viewer state
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  // Animation state
  const [fadeAnim] = useState(() => new Animated.Value(isNewMessage ? 0 : 1));

  // Blinking cursor animation for streaming
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Pulsing animation for TTS loading (cancel indicator)
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLoading) {
      // Start pulsing animation when loading
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLoading, pulseAnim]);

  useEffect(() => {
    if (isStreaming && message.text) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => { blink.stop(); cursorOpacity.setValue(0); };
    } else {
      cursorOpacity.setValue(0);
    }
  }, [isStreaming, !!message.text, cursorOpacity]);

  useEffect(() => {
    if (isNewMessage && isBot) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isNewMessage, isBot, fadeAnim]);

  const textColor = theme.text;

  const markdownStyles = useMemo(() => createMarkdownStyles(theme, textColor), [theme, textColor]);

  // Don't render empty streaming messages (but allow thinking messages)
  if (isBot && isStreaming && !message.text && !isThinking) {
    return null;
  }

  const formatTime = (date: Date | string): string => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  

  const handleLayout = (event: LayoutChangeEvent): void => {
    if (onLayout) {
      onLayout(event.nativeEvent.layout.height);
    }
  };

  if (!isBot) {
    // User message — right-aligned bubble
    return (
      <View style={styles.container} onLayout={handleLayout} accessible accessibilityRole="text" accessibilityLabel={`${t('a11y.yourMessage')}: ${message.text || t('a11y.imageMessage')}, ${formatTime(message.createdAt)}`}>
        <View style={styles.userRow}>
          <View style={[styles.userBubble, { backgroundColor: theme.userMessage }]}>
            {message.image && (
              <Pressable onPress={() => setImageViewerVisible(true)}>
                <Image
                  source={{ uri: message.image }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                  placeholder={{ blurhash: 'LJI=IA%1_4%2D*s:WBoe~pt6-ooJ' }}
                  accessibilityLabel={t('a11y.attachedImage')}
                />
              </Pressable>
            )}
            {message.text && !message.text.startsWith('[Image for') && (
              <Text style={[styles.messageText, { color: theme.userMessageText }]}>
                {message.text}
              </Text>
            )}
            <Text style={[styles.userTimestamp, { color: theme.textMuted }]}>
              {formatTime(message.createdAt)}
            </Text>
          </View>
        </View>
        {message.image && (
          <ImageViewerModal visible={imageViewerVisible} imageUri={message.image} onClose={() => setImageViewerVisible(false)} />
        )}
      </View>
    );
  }

  // Bot message — full-width with header
  return (
    <View style={styles.container} onLayout={handleLayout} accessibilityRole="text">
      <View style={styles.botRow}>
        <View style={styles.header}>
          <Text style={[styles.senderName, { color: theme.accent }]}>
            {t('chat.senderAssistant')}
          </Text>
          <View style={styles.headerRight}>
            <Pressable
              style={[
                styles.speakButton,
                isLoading && { backgroundColor: theme.errorLight || 'rgba(255, 59, 48, 0.12)' }
              ]}
              onPress={handleSpeak}
              accessibilityRole="button"
              accessibilityLabel={
                isLoading ? t('a11y.cancelVoiceGeneration') :
                isSpeaking ? t('a11y.stopVoicePlayback') : t('a11y.playVoice')
              }
            >
              {isLoading ? (
                <Animated.View style={{ opacity: pulseAnim }}>
                  <AppIcon name="close" size={20} color={theme.error} />
                </Animated.View>
              ) : (
                <AppIcon
                  name={isSpeaking ? 'stop-circle' : 'volume-high'}
                  size={20}
                  color={isSpeaking ? theme.error : theme.icon}
                />
              )}
            </Pressable>
            <Text style={[styles.timestamp, { color: theme.textMuted }]}>
              {formatTime(message.createdAt)}
            </Text>
          </View>
        </View>

        {message.image && (
          <Pressable onPress={() => setImageViewerVisible(true)}>
            <Image
              source={{ uri: message.image }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              placeholder={{ blurhash: 'LJI=IA%1_4%2D*s:WBoe~pt6-ooJ' }}
              accessibilityLabel={t('a11y.attachedImage')}
            />
          </Pressable>
        )}

        <Animated.View style={[styles.markdownContainer, { opacity: fadeAnim, maxWidth: contentMaxWidth }]}>
          {isThinking ? (
            <TypingIndicator text={message.thinkingText || t('chat.thinking')} />
          ) : message.text ? (
            <>
              <Markdown style={markdownStyles}>
                {isStreaming
                  ? sanitizeStreamingMarkdown(message.text)
                  : message.text}
              </Markdown>
              {isStreaming && (
                <Animated.Text
                  style={{ opacity: cursorOpacity, color: theme.text, fontSize: TYPOGRAPHY.sizes.base, marginTop: -4 }}
                >
                  {'\u258B'}
                </Animated.Text>
              )}
            </>
          ) : null}

          {message.diagnosisData && (
            <DiagnosisCard diagnosis={message.diagnosisData} onRetry={onRetry} />
          )}

          {!isStreaming && !isThinking && message.followUpQuestions && message.followUpQuestions.length > 0 && onFollowUpTap && (
            <FollowUpQuestions questions={message.followUpQuestions} onQuestionTap={onFollowUpTap} />
          )}
        </Animated.View>
      </View>
      {message.image && (
        <ImageViewerModal visible={imageViewerVisible} imageUri={message.image} onClose={() => setImageViewerVisible(false)} />
      )}
    </View>
  );
}

/**
 * Deep comparison for diagnosisData to handle object references properly
 */
function areDiagnosisDataEqual(
  prev: Message['diagnosisData'],
  next: Message['diagnosisData']
): boolean {
  // Same reference or both falsy
  if (prev === next) return true;
  if (!prev || !next) return false;

  // If both are strings, compare directly
  if (typeof prev === 'string' && typeof next === 'string') {
    return prev === next;
  }

  // If types differ, not equal
  if (typeof prev !== typeof next) return false;

  // For objects, compare JSON representation (stable for diagnosis data)
  try {
    return JSON.stringify(prev) === JSON.stringify(next);
  } catch {
    return false;
  }
}

export default React.memo(MessageItem, (prevProps, nextProps) => {
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.image === nextProps.message.image &&
    areDiagnosisDataEqual(prevProps.message.diagnosisData, nextProps.message.diagnosisData) &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.thinkingText === nextProps.message.thinkingText &&
    prevProps.isNewMessage === nextProps.isNewMessage &&
    JSON.stringify(prevProps.message.followUpQuestions) === JSON.stringify(nextProps.message.followUpQuestions)
  );
});
