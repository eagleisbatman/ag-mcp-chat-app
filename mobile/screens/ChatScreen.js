import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Animated, Image } from 'react-native';

const logoImage = require('../assets/logo.png');
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import useChat from '../hooks/useChat';
import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import TypingIndicator from '../components/ui/TypingIndicator';
import { t } from '../constants/strings';

export default function ChatScreen({ navigation, route }) {
  const { theme, isDark, language, location, locationDetails, setLocation } = useApp();
  const { showSuccess, showWarning, showError } = useToast();
  const flatListRef = useRef(null);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;

  // Get session params from navigation
  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;

  const {
    messages, isTyping, isLoadingSession, newestBotMessageId,
    thinkingText,
    handleSendText, handleSendImage,
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession,
  } = useChat(sessionId);

  // ===========================================
  // SCROLL BEHAVIOR STATE & REFS
  // ===========================================
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // Scroll behavior state
  const isUserScrollingRef = useRef(false);  // True when user manually scrolls
  const contentHeightRef = useRef(0);        // Total scrollable content height
  const viewportHeightRef = useRef(0);       // Visible area height
  const currentScrollYRef = useRef(0);       // Current scroll position
  const messageHeightsRef = useRef({});      // Map of message._id -> height
  const lastUserMessageIdRef = useRef(null); // Track the last user message we scrolled to
  const shouldScrollToUserRef = useRef(false); // Flag to trigger scroll on next render
  const blockAutoScrollRef = useRef(false); // Block auto-scroll during initial positioning

  // Handle new session request
  useEffect(() => {
    if (isNewSession) {
      startNewSession();
      // Reset scroll state for new session
      isUserScrollingRef.current = false;
      lastUserMessageIdRef.current = null;
    }
  }, [isNewSession, startNewSession]);

  // ===========================================
  // MESSAGE HEIGHT TRACKING
  // ===========================================
  const onMessageLayout = useCallback((messageId, height) => {
    messageHeightsRef.current[messageId] = height;
  }, []);

  // Calculate the scroll offset to position a message at the top of the viewport
  const calculateScrollOffset = useCallback((messageId) => {
    const reversedMessages = [...messages].reverse();
    let offset = 0;

    for (const msg of reversedMessages) {
      if (msg._id === messageId) {
        break;
      }
      // Add height of each message above the target
      offset += messageHeightsRef.current[msg._id] || 80; // Default estimate
    }

    return offset;
  }, [messages]);

  // ===========================================
  // SCROLL TO USER MESSAGE
  // ===========================================
  const scrollToUserMessage = useCallback(() => {
    const reversedMessages = [...messages].reverse();

    // Find the newest user message (not bot, not welcome)
    // In our inverted list, this is usually at index 1 (0 is the current bot response)
    let targetIndex = -1;
    for (let i = 0; i < reversedMessages.length; i++) {
      const msg = reversedMessages[i];
      if (!msg.isBot && msg._id !== 'welcome') {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1 || !flatListRef.current) {
      return;
    }

    // Don't scroll to the same message twice
    const targetId = reversedMessages[targetIndex]._id;
    if (lastUserMessageIdRef.current === targetId) {
      return;
    }

    lastUserMessageIdRef.current = targetId;
    isUserScrollingRef.current = false; // Reset user scroll flag on new message

    console.log('📜 [Scroll] TOP-ANCHOR: Aligning question to top:', targetId, 'at index:', targetIndex);

    // viewPosition: 0 = align the item at the TOP of the visible area
    flatListRef.current.scrollToIndex({
      index: targetIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [messages]);

  // ===========================================
  // SCROLL EVENT HANDLERS
  // ===========================================

  // Track when user manually starts scrolling
  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    console.log('📜 [Scroll] User started scrolling manually');
  }, []);

  // Track scroll position and show/hide scroll button
  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    currentScrollYRef.current = contentOffset.y;

    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setShowScrollButton(distanceFromBottom > 150);
  }, []);

  // Track viewport height
  const handleLayout = useCallback((event) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  // Track content height and handle streaming auto-scroll
  const handleContentSizeChange = useCallback((width, height) => {
    const prevHeight = contentHeightRef.current;
    contentHeightRef.current = height;

    // SCROLL LOGIC UPDATE: 
    // We only want to auto-scroll to the bottom IF the user is NOT in the "Top-Anchored" mode
    // or if the content has already filled the screen.
    const isResponseFillingScreen = height > viewportHeightRef.current;

    if (isTyping && !isUserScrollingRef.current && !blockAutoScrollRef.current && height > prevHeight) {
      if (isResponseFillingScreen) {
        // Only scroll to end if the message is actually long enough to need it
        flatListRef.current?.scrollToEnd({ animated: false });
      }
    }
  }, [isTyping]);

  // ===========================================
  // TRIGGER SCROLL WHEN isTyping STARTS
  // ===========================================
  const prevIsTypingRef = useRef(isTyping);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    const typingJustStarted = isTyping && !prevIsTypingRef.current;
    const messagesAdded = messages.length > prevMessagesLengthRef.current;

    if (typingJustStarted && messagesAdded) {
      // New message sent, typing just started
      // Block auto-scroll until we position the user message
      blockAutoScrollRef.current = true;
      shouldScrollToUserRef.current = true;

      // Use requestAnimationFrame + timeout for reliable timing
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (shouldScrollToUserRef.current) {
            scrollToUserMessage();
            shouldScrollToUserRef.current = false;
            // Allow auto-scroll to resume after a short delay
            // This gives time for the scroll to complete
            setTimeout(() => {
              blockAutoScrollRef.current = false;
            }, 300);
          }
        }, 100);
      });
    }

    // Reset user scrolling flag when typing ends (response complete)
    if (!isTyping && prevIsTypingRef.current) {
      // Keep isUserScrollingRef as-is until next message is sent
      blockAutoScrollRef.current = false;
    }

    prevIsTypingRef.current = isTyping;
    prevMessagesLengthRef.current = messages.length;
  }, [isTyping, messages.length, scrollToUserMessage]);

  // ===========================================
  // WRAPPED SEND HANDLERS
  // ===========================================
  const handleSend = useCallback(async (text) => {
    // Reset scroll state before sending
    isUserScrollingRef.current = false;
    lastUserMessageIdRef.current = null; // Allow scrolling to new message

    await handleSendText(text);
  }, [handleSendText]);

  const handleSendImageWrapped = useCallback(async (imageData) => {
    // Reset scroll state before sending
    isUserScrollingRef.current = false;
    lastUserMessageIdRef.current = null;

    await handleSendImage(imageData);
  }, [handleSendImage]);

  // ===========================================
  // SCROLL TO BOTTOM BUTTON
  // ===========================================
  const scrollToBottom = useCallback(() => {
    isUserScrollingRef.current = false;
    flatListRef.current?.scrollToEnd({ animated: true });
    Haptics.selectionAsync();
  }, []);

  useEffect(() => {
    Animated.spring(scrollButtonAnim, {
      toValue: showScrollButton ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [showScrollButton, scrollButtonAnim]);

  // ===========================================
  // LOCATION HANDLERS (unchanged)
  // ===========================================
  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('chat.locationDenied'));
        return;
      }

      let loc = await Location.getLastKnownPositionAsync();
      if (!loc?.coords) {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
      }
      if (!loc?.coords) {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeout: 10000,
        });
      }

      if (loc?.coords) {
        showSuccess(t('chat.gpsLocationUpdated'));
        await setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 'granted');
      } else {
        showWarning(t('chat.gpsFailed'));
        await fetchIPLocation();
      }
    } catch (error) {
      showWarning(t('chat.gpsFailed'));
      await fetchIPLocation();
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const fetchIPLocation = async () => {
    try {
      const { lookupLocation } = require('../services/db');
      const result = await lookupLocation(null, null, 'auto');
      if (result.success && result.latitude && result.longitude) {
        await setLocation({ latitude: result.latitude, longitude: result.longitude }, 'granted');
        showSuccess(t('chat.ipLocationUpdated', { location: result.displayName || 'your region' }));
      } else {
        showError(t('chat.locationUpdateFailed'));
      }
    } catch (error) {
      showError(t('chat.locationUpdateFailed'));
    }
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        align="left"
        center={
          <View style={styles.headerLeft}>
            <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
              {isRefreshingLocation
                ? t('chat.updatingLocation')
                : locationDetails?.displayName ||
                  locationDetails?.level5City ||
                  locationDetails?.level3District ||
                  locationDetails?.level2State ||
                  (location?.latitude ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : t('chat.setLocation'))}
            </Text>
          </View>
        }
        right={
          <>
            <IconButton
              icon="location"
              onPress={handleRefreshLocation}
              loading={isRefreshingLocation}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('a11y.refreshLocation')}
            />
            <IconButton
              icon="add"
              onPress={startNewSession}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('a11y.newChat')}
            />
            <IconButton
              icon="menu"
              onPress={() => navigation.navigate('Settings')}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('a11y.openSettings')}
            />
          </>
        }
      />

      {/* Messages */}
      <View style={styles.messagesContainer} onLayout={handleLayout}>
        {isLoadingSession ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('chat.loadingConversation')}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            renderItem={({ item }) => (
              <MessageItem
                message={item}
                isNewMessage={item._id === newestBotMessageId}
                onLayout={(height) => onMessageLayout(item._id, height)}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}

            // Scroll tracking
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}

            // Keyboard handling
            keyboardShouldPersistTaps="handled"

            // Handle scroll to unmeasured items
            onScrollToIndexFailed={(info) => {
              console.log('📜 [Scroll] scrollToIndex failed, retrying...', info.index);
              setTimeout(() => {
                if (flatListRef.current && info.index < messages.length) {
                  flatListRef.current.scrollToIndex({
                    index: info.index,
                    animated: false,
                    viewPosition: 0,
                  });
                }
              }, 200);
            }}

            // Typing indicator at bottom
            ListFooterComponent={isTyping ? (
              <TypingIndicator text={thinkingText || t('chat.thinking')} />
            ) : null}
          />
        )}

        {/* Scroll to bottom button */}
        <Animated.View
          style={[
            styles.scrollButtonContainer,
            {
              opacity: scrollButtonAnim,
              transform: [
                { translateY: scrollButtonAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                { scale: scrollButtonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            }
          ]}
          pointerEvents={showScrollButton ? 'auto' : 'none'}
        >
          <IconButton
            icon="chevron-down"
            onPress={scrollToBottom}
            size={40}
            backgroundColor={theme.accent}
            color="#FFFFFF"
            accessibilityLabel={t('a11y.scrollToBottom')}
          />
        </Animated.View>
      </View>

      {/* Input */}
      <InputToolbar
        onSendText={handleSend}
        onSendImage={handleSendImageWrapped}
        transcribeAudio={transcribeAudioForInput}
        uploadAudioInBackground={uploadAudioInBackground}
        disabled={isTyping}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesList: {
    paddingTop: SPACING.sm,
    paddingHorizontal: 0,
    flexGrow: 1,
  },
  scrollButtonContainer: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    zIndex: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
});
