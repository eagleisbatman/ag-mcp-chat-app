/**
 * Chat scroll behavior hook
 * Manages scroll position, auto-scroll, and user message anchoring
 */

import { useCallback, useRef, useEffect, useState, RefObject, MutableRefObject } from 'react';
import { Animated, FlatList, NativeScrollEvent, NativeSyntheticEvent, LayoutChangeEvent } from 'react-native';
import { log } from '../utils/logger';
import { Message } from '../types';

interface UseChatScrollOptions {
  messages: Message[];
  isTyping: boolean;
  flatListRef: RefObject<FlatList<any> | null>;
}

interface UseChatScrollReturn {
  // State
  showScrollButton: boolean;
  scrollButtonAnim: Animated.Value;

  // Methods
  scrollToBottom: () => void;
  scrollToUserMessage: () => void;
  scrollToLastConversation: () => void;
  resetScrollState: () => void;
  onMessageLayout: (messageId: string, height: number) => void;
  calculateScrollOffset: (messageId: string) => number;

  // Event handlers
  handleScrollBeginDrag: () => void;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleLayout: (event: LayoutChangeEvent) => void;
  handleContentSizeChange: (width: number, height: number) => void;
  handleScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;

  // Refs (exposed for advanced use cases)
  isUserScrollingRef: MutableRefObject<boolean>;
  isAnchorLockedRef: MutableRefObject<boolean>;
}

/**
 * Hook for managing chat list scroll behavior
 */
export default function useChatScroll({ messages, isTyping, flatListRef }: UseChatScrollOptions): UseChatScrollReturn {
  // State
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;

  // Refs for tracking scroll state
  const isUserScrollingRef = useRef(false);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const currentScrollYRef = useRef(0);
  const messageHeightsRef = useRef<Record<string, number>>({});
  const lastUserMessageIdRef = useRef<string | null>(null);
  const shouldScrollToUserRef = useRef(false);
  const blockAutoScrollRef = useRef(false);
  const isAnchorLockedRef = useRef(false);
  const prevIsTypingRef = useRef(isTyping);
  const prevMessagesLengthRef = useRef(messages.length);

  /**
   * Track message height when it renders
   */
  const onMessageLayout = useCallback((messageId: string, height: number) => {
    messageHeightsRef.current[messageId] = height;
  }, []);

  /**
   * Calculate scroll offset to position a message at top of viewport
   */
  const calculateScrollOffset = useCallback((messageId: string): number => {
    const reversedMessages = [...messages].reverse();
    let offset = 0;

    for (const msg of reversedMessages) {
      if (msg._id === messageId) break;
      offset += messageHeightsRef.current[msg._id] || 80;
    }

    return offset;
  }, [messages]);

  /**
   * Scroll to position the newest user message near the TOP of the visible area
   *
   * For inverted FlatList with viewPosition:
   * - viewPosition: 0 = item at list START (visual bottom for inverted)
   * - viewPosition: 1 = item at list END (visual top for inverted)
   *
   * We use viewPosition: 0.9 to position near the top with some space for thinking indicator
   */
  const scrollToUserMessage = useCallback(() => {
    // Find the newest user message
    let targetIndex = -1;
    for (let i = 0; i < messages.length; i++) {
      if (!messages[i].isBot && messages[i]._id !== 'welcome') {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1 || !flatListRef.current) return;

    log('📜 [Scroll] TOP-ANCHOR: Scrolling question to top, index:', targetIndex);

    // For inverted list: viewPosition 1 = visual top, 0 = visual bottom
    // Use 0.9 to leave a bit of space at the very top
    flatListRef.current.scrollToIndex({
      index: targetIndex,
      animated: true,
      viewPosition: 0.9,
    });
  }, [messages, flatListRef]);

  /**
   * Scroll to show the most recent conversation (last user question + response)
   * Called when loading chat history
   */
  const scrollToLastConversation = useCallback(() => {
    if (!flatListRef.current || messages.length === 0) return;

    // Find the first user message (most recent question in inverted list)
    let targetIndex = -1;
    for (let i = 0; i < messages.length; i++) {
      if (!messages[i].isBot && messages[i]._id !== 'welcome') {
        targetIndex = i;
        break;
      }
    }

    // If no user message found, scroll to top of messages
    if (targetIndex === -1) {
      targetIndex = messages.length - 1;
    }

    log('📜 [Scroll] HISTORY: Scrolling to last conversation at index:', targetIndex);

    // Small delay to ensure layout is complete
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false, // No animation for initial load
        viewPosition: 0.9, // Position near visual top
      });
    }, 150);
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

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    currentScrollYRef.current = contentOffset.y;
    setShowScrollButton(contentOffset.y > 200);
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleContentSizeChange = useCallback((width: number, height: number) => {
    contentHeightRef.current = height;
  }, []);

  // Handle scroll failed (fallback)
  const handleScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    log('📜 [Scroll] scrollToIndex failed, using fallback offset scroll');
    const offset = info.averageItemLength * info.index;
    flatListRef.current?.scrollToOffset({ offset, animated: true });
  }, [flatListRef]);

  // Auto-scroll when new messages are added (user message + thinking indicator)
  // Since thinking indicator is now part of messages array, scrolling to offset 0
  // will show both the user question and the thinking indicator below it
  useEffect(() => {
    const typingJustStarted = isTyping && !prevIsTypingRef.current;
    const messagesAdded = messages.length > prevMessagesLengthRef.current;

    if (typingJustStarted && messagesAdded && !isUserScrollingRef.current) {
      // Wait for the messages to render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Scroll to bottom (offset 0 in inverted list) to show newest messages
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
      });
    }

    prevIsTypingRef.current = isTyping;
    prevMessagesLengthRef.current = messages.length;
  }, [isTyping, messages.length, flatListRef]);

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
    scrollToLastConversation,
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
