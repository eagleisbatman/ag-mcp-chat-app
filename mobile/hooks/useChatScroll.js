/**
 * Chat scroll behavior hook
 * Manages scroll position, auto-scroll, and user message anchoring
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { log } from '../utils/logger';

/**
 * Hook for managing chat list scroll behavior
 * @param {object} options
 * @param {Array} options.messages - Chat messages array
 * @param {boolean} options.isTyping - Whether bot is typing
 * @param {object} options.flatListRef - Ref to FlatList
 * @returns {object} Scroll state and handlers
 */
export default function useChatScroll({ messages, isTyping, flatListRef }) {
  // State
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;

  // Refs for tracking scroll state
  const isUserScrollingRef = useRef(false);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const currentScrollYRef = useRef(0);
  const messageHeightsRef = useRef({});
  const lastUserMessageIdRef = useRef(null);
  const shouldScrollToUserRef = useRef(false);
  const blockAutoScrollRef = useRef(false);
  const isAnchorLockedRef = useRef(false);
  const prevIsTypingRef = useRef(isTyping);
  const prevMessagesLengthRef = useRef(messages.length);

  /**
   * Track message height when it renders
   */
  const onMessageLayout = useCallback((messageId, height) => {
    messageHeightsRef.current[messageId] = height;
  }, []);

  /**
   * Calculate scroll offset to position a message at top of viewport
   */
  const calculateScrollOffset = useCallback((messageId) => {
    const reversedMessages = [...messages].reverse();
    let offset = 0;

    for (const msg of reversedMessages) {
      if (msg._id === messageId) break;
      offset += messageHeightsRef.current[msg._id] || 80;
    }

    return offset;
  }, [messages]);

  /**
   * Scroll to the newest user message
   */
  const scrollToUserMessage = useCallback(() => {
    let targetIndex = -1;
    for (let i = 0; i < messages.length; i++) {
      if (!messages[i].isBot && messages[i]._id !== 'welcome') {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1 || !flatListRef.current) return;

    log('📜 [Scroll] TOP-ANCHOR: Aligning to newest question:', messages[targetIndex]._id);

    flatListRef.current.scrollToIndex({
      index: targetIndex,
      animated: true,
      viewPosition: 1,
    });
  }, [messages, flatListRef]);

  /**
   * Scroll to bottom (newest messages)
   */
  const scrollToBottom = useCallback(() => {
    isUserScrollingRef.current = false;
    isAnchorLockedRef.current = false;
    blockAutoScrollRef.current = false;

    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [flatListRef]);

  /**
   * Reset scroll state (for new sessions)
   */
  const resetScrollState = useCallback(() => {
    isUserScrollingRef.current = false;
    lastUserMessageIdRef.current = null;
    isAnchorLockedRef.current = false;
    blockAutoScrollRef.current = false;
    shouldScrollToUserRef.current = false;
  }, []);

  // Event handlers
  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    isAnchorLockedRef.current = false;
    log('📜 [Scroll] User started scrolling manually - lock released');
  }, []);

  const handleScroll = useCallback((event) => {
    const { contentOffset } = event.nativeEvent;
    currentScrollYRef.current = contentOffset.y;
    setShowScrollButton(contentOffset.y > 200);
  }, []);

  const handleLayout = useCallback((event) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleContentSizeChange = useCallback((width, height) => {
    contentHeightRef.current = height;
  }, []);

  // Handle scroll failed (fallback)
  const handleScrollToIndexFailed = useCallback((info) => {
    log('📜 [Scroll] scrollToIndex failed, using fallback offset scroll');
    const offset = info.averageItemLength * info.index;
    flatListRef.current?.scrollToOffset({ offset, animated: true });
  }, [flatListRef]);

  // Auto-scroll when typing starts
  useEffect(() => {
    const typingJustStarted = isTyping && !prevIsTypingRef.current;
    const messagesAdded = messages.length > prevMessagesLengthRef.current;

    if (typingJustStarted && messagesAdded) {
      blockAutoScrollRef.current = true;
      shouldScrollToUserRef.current = true;

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (shouldScrollToUserRef.current) {
            scrollToUserMessage();
            isAnchorLockedRef.current = true;
          }
          blockAutoScrollRef.current = false;
          shouldScrollToUserRef.current = false;
        }, 50);
      });
    }

    prevIsTypingRef.current = isTyping;
    prevMessagesLengthRef.current = messages.length;
  }, [isTyping, messages, scrollToUserMessage]);

  // Animate scroll button
  useEffect(() => {
    Animated.timing(scrollButtonAnim, {
      toValue: showScrollButton ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollButton, scrollButtonAnim]);

  return {
    // State
    showScrollButton,
    scrollButtonAnim,
    
    // Methods
    scrollToBottom,
    scrollToUserMessage,
    resetScrollState,
    onMessageLayout,
    calculateScrollOffset,
    
    // Event handlers
    handleScrollBeginDrag,
    handleScroll,
    handleLayout,
    handleContentSizeChange,
    handleScrollToIndexFailed,
    
    // Refs (exposed for advanced use cases)
    isUserScrollingRef,
    isAnchorLockedRef,
  };
}
