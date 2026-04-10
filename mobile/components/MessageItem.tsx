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
import A2UIDispatcher from './a2ui/A2UIDispatcher';
import RationFlowRenderer from './chat/RationFlowRenderer';
import TypingIndicator from './ui/TypingIndicator';
import { t } from '../constants/strings';
import { Message, A2UIPayload } from '../types';
import { useMessageTts } from './message/useMessageTts';
import { createMarkdownStyles } from './message/markdownStyles';
import { styles } from './message/messageItemStyles';
import ImageViewerModal from './chat/ImageViewerModal';

interface MessageItemProps {
  message: Message;
  isNewMessage?: boolean;
  onLayout?: (height: number) => void;
  onRetry?: () => void;
  onRetryMessage?: (text: string) => void;
  onFollowUpTap?: (question: string) => void;
  onA2UIPress?: (widget: A2UIPayload) => void;
  respondedA2UIWidgetIds?: Set<string>;
}

/**
 * Sanitize streaming text to prevent partial markdown from rendering incorrectly.
 * Early-exits when the trailing character cannot produce incomplete markdown,
 * avoiding expensive lookbehind regex on the majority of streaming chunks.
 */
function sanitizeStreamingMarkdown(text: string): string {
  if (!text) return text;

  // Only run expensive regex checks when the text could have incomplete markers
  const lastChar = text[text.length - 1];
  if (lastChar !== '*' && lastChar !== '[' && lastChar !== ']' && lastChar !== '`' && lastChar !== '#') {
    return text;
  }

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

/**
 * Split streaming text into completed paragraphs and the current (in-progress) line.
 * A paragraph is "completed" if followed by a double newline AND no open markdown markers
 * (bold, italic, code fence, link) span across the boundary.
 */
function splitStreamingText(text: string): { completed: string; current: string } {
  if (!text) return { completed: '', current: '' };

  // Find the last double-newline boundary
  const lastBoundary = text.lastIndexOf('\n\n');
  if (lastBoundary === -1) {
    return { completed: '', current: text };
  }

  const candidate = text.slice(0, lastBoundary);
  const tail = text.slice(lastBoundary + 2);

  // Check for open code fences (``` without matching close)
  const fenceCount = (candidate.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    // Open code fence — don't split here
    return { completed: '', current: text };
  }

  return { completed: candidate, current: tail };
}

/**
 * Memoized renderer for completed (stable) paragraphs during streaming.
 * Only re-renders when the completed text actually changes.
 */
const CompletedParagraphs = React.memo(
  ({ text, markdownStyles }: { text: string; markdownStyles: any }) => {
    if (!text) return null;
    return <Markdown style={markdownStyles}>{text}</Markdown>;
  },
  (prev, next) => prev.text === next.text
);

function MessageItem({ message, isNewMessage = false, onLayout, onRetry, onRetryMessage, onFollowUpTap, onA2UIPress, respondedA2UIWidgetIds }: MessageItemProps): JSX.Element | null {
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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: 'transparent' },
      ]}
      onLayout={handleLayout}
      accessible={!isBot}
      accessibilityRole="text"
      accessibilityLabel={!isBot ? `${t('a11y.yourMessage')}: ${message.text || t('a11y.imageMessage')}, ${formatTime(message.createdAt)}` : undefined}
    >
      <View style={styles.header}>
        <Text style={[styles.senderName, { color: isBot ? theme.accent : theme.textSecondary }]}>
          {isBot ? t('chat.senderAssistant') : t('chat.senderYou')}
        </Text>
        <View style={styles.headerRight}>
          {isBot && (
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
          )}
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

      {isBot ? (
        <Animated.View style={[styles.markdownContainer, { opacity: fadeAnim, maxWidth: contentMaxWidth }]}>
          {isThinking ? (
            <TypingIndicator text={message.thinkingText || t('chat.thinking')} />
          ) : message.flowStep ? (
            <RationFlowRenderer flowStep={message.flowStep} />
          ) : message.text ? (
            isStreaming ? (
              (() => {
                const { completed, current } = splitStreamingText(message.text);
                return (
                  <>
                    <CompletedParagraphs text={completed} markdownStyles={markdownStyles} />
                    {current ? (
                      <Text style={{ color: textColor, fontSize: TYPOGRAPHY.sizes.base, lineHeight: 24 }}>
                        {current}
                      </Text>
                    ) : null}
                    <Animated.Text
                      style={{ opacity: cursorOpacity, color: theme.text, fontSize: TYPOGRAPHY.sizes.base, marginTop: -4 }}
                    >
                      {'\u258B'}
                    </Animated.Text>
                  </>
                );
              })()
            ) : (
              <Markdown style={markdownStyles}>{message.text}</Markdown>
            )
          ) : null}

          {message.diagnosisData && (
            <DiagnosisCard diagnosis={message.diagnosisData} onRetry={onRetry} />
          )}

          {message.isError && message.retryData && onRetryMessage && (
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: SPACING.sm,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: theme.error + '15',
                alignSelf: 'flex-start',
              }}
              onPress={() => onRetryMessage(message.retryData!.lastMessage)}
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
            >
              <AppIcon name="refresh-cw" size={14} color={theme.error} prefer="feather" />
              <Text style={{ color: theme.error, fontSize: 13, fontWeight: '600' }}>
                {t('common.retry')}
              </Text>
            </Pressable>
          )}

          {!isStreaming && !isThinking && message.followUpQuestions && message.followUpQuestions.length > 0 && onFollowUpTap && (
            <FollowUpQuestions questions={message.followUpQuestions} onQuestionTap={onFollowUpTap} />
          )}

          {!isStreaming && !isThinking && message.a2uiWidgets && message.a2uiWidgets.length > 0 && onA2UIPress && (
            <A2UIDispatcher
              widgets={message.a2uiWidgets}
              onWidgetPress={onA2UIPress}
              respondedWidgetIds={respondedA2UIWidgetIds}
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

  // For objects, use shallow key comparison — sufficient for diagnosis data
  // and avoids JSON.stringify key-order instability
  if (typeof prev === 'object' && typeof next === 'object') {
    const pObj = prev as Record<string, unknown>;
    const nObj = next as Record<string, unknown>;
    const pKeys = Object.keys(pObj);
    const nKeys = Object.keys(nObj);
    if (pKeys.length !== nKeys.length) return false;
    return pKeys.every(k => pObj[k] === nObj[k]);
  }
  return false;
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
    prevProps.message.isError === nextProps.message.isError &&
    prevProps.isNewMessage === nextProps.isNewMessage &&
    prevProps.message.flowStep === nextProps.message.flowStep &&
    (prevProps.message.followUpQuestions ?? []).join('|') === (nextProps.message.followUpQuestions ?? []).join('|') &&
    (prevProps.message.a2uiWidgets ?? []).map(w => w.widgetId).join(',') === (nextProps.message.a2uiWidgets ?? []).map(w => w.widgetId).join(',') &&
    // Only re-render when THIS message's widgets' responded state changes (not any widget)
    (prevProps.message.a2uiWidgets ?? []).filter(w => prevProps.respondedA2UIWidgetIds?.has(w.widgetId)).length ===
    (nextProps.message.a2uiWidgets ?? []).filter(w => nextProps.respondedA2UIWidgetIds?.has(w.widgetId)).length
  );
});
