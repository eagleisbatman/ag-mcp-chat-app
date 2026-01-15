import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING } from '../constants/themes';
import AppIcon from './ui/AppIcon';
import DiagnosisCard from './DiagnosisCard';
import { t } from '../constants/strings';
import { Message } from '../types';
import { useMessageTts } from './message/useMessageTts';
import { createMarkdownStyles } from './message/markdownStyles';
import { styles } from './message/messageItemStyles';

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

  // Don't render empty streaming messages
  if (isBot && isStreaming && !message.text) {
    return null;
  }
  
  const contentMaxWidth = screenWidth - (SPACING.lg * 2);
  
  const { isSpeaking, isLoading, handleSpeak } = useMessageTts({
    message,
    languageCode: language?.code || 'en',
    locationDetails,
    onError: showError,
  });
  
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

  const markdownStyles = useMemo(() => createMarkdownStyles(theme, textColor), [theme, textColor]);

  

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
