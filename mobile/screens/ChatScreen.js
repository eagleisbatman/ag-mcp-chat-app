import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Animated, Image, Alert } from 'react-native';

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
    thinkingText, // Real AI thinking status
    handleSendText, handleSendImage,
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession,
  } = useChat(sessionId);
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // Handle new session request
  useEffect(() => {
    if (isNewSession) {
      startNewSession();
    }
  }, [isNewSession, startNewSession]);

  // Location refresh handler
  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      console.log('📍 [Chat] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 [Chat] Permission status:', status);

      if (status !== 'granted') {
        showWarning(t('chat.locationDenied'));
        return;
      }

      console.log('📍 [Chat] Getting current position...');

      // First try getLastKnownPositionAsync (instant, from cache)
      let loc = await Location.getLastKnownPositionAsync();
      console.log('📍 [Chat] Last known position:', loc?.coords);

      // If no cached location, use getCurrentPositionAsync (active GPS request)
      if (!loc?.coords) {
        console.log('📍 [Chat] No cached location, requesting fresh GPS fix...');
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
        console.log('📍 [Chat] getCurrentPositionAsync result:', loc?.coords);
      }

      // Final fallback: try with lower accuracy if high accuracy fails
      if (!loc?.coords) {
        console.log('📍 [Chat] Balanced accuracy failed, trying low accuracy...');
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeout: 10000,
        });
      }

      if (loc?.coords) {
        console.log('📍 [Chat] Got position:', loc.coords);
        showSuccess(t('chat.gpsLocationUpdated'));
        await setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 'granted');
      } else {
        // GPS failed, fall back to IP-based location
        console.log('📍 [Chat] GPS unavailable, falling back to IP location...');
        showWarning(t('chat.gpsFailed'));
        await fetchIPLocation();
      }
    } catch (error) {
      console.log('❌ [Chat] GPS error:', error.message);
      // Fall back to IP-based location
      showWarning(t('chat.gpsFailed'));
      await fetchIPLocation();
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  // Fetch location based on IP address
  const fetchIPLocation = async () => {
    try {
      console.log('🌐 [Chat] Fetching IP-based location...');
      const { lookupLocation } = require('../services/db');

      const result = await lookupLocation(null, null, 'auto');

      if (result.success && result.latitude && result.longitude) {
        console.log('🌐 [Chat] IP location result:', result.displayName);
        await setLocation({ latitude: result.latitude, longitude: result.longitude }, 'granted');
        showSuccess(t('chat.ipLocationUpdated', { location: result.displayName || 'your region' }));
      } else {
        console.log('❌ [Chat] IP location also failed:', result.error);
        showError(t('chat.locationUpdateFailed'));
      }
    } catch (error) {
      console.log('❌ [Chat] IP location error:', error.message);
      showError(t('chat.locationUpdateFailed'));
    }
  };

  useEffect(() => {
    Animated.spring(scrollButtonAnim, {
      toValue: showScrollButton ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [showScrollButton, scrollButtonAnim]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    Haptics.selectionAsync();
  }, []);

  // Scroll to show user's message at top when typing starts
  const scrollToUserMessage = useCallback(() => {
    // Data after reverse: [oldest...userMessage, botPlaceholder]
    const reversedMessages = [...messages].reverse();

    // Find the newest user message (not bot, not welcome)
    // This is the question user just asked - we want it at the top
    let userMessageIndex = -1;
    for (let i = reversedMessages.length - 1; i >= 0; i--) {
      const msg = reversedMessages[i];
      if (!msg.isBot && msg._id !== 'welcome') {
        userMessageIndex = i;
        break;
      }
    }

    if (userMessageIndex >= 0) {
      flatListRef.current?.scrollToIndex({
        index: userMessageIndex,
        animated: true,
        viewPosition: 0, // Position at top of viewport
      });
    }
  }, [messages]);

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  // When typing starts, scroll to show user's question at top
  const prevIsTyping = useRef(isTyping);
  useEffect(() => {
    if (isTyping && !prevIsTyping.current) {
      // Typing just started - scroll to show user's message at top
      // Small delay to let the message render first
      setTimeout(() => scrollToUserMessage(), 100);
    }
    prevIsTyping.current = isTyping;
  }, [isTyping, scrollToUserMessage]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header - Clean, logo-only design */}
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
      <View style={styles.messagesContainer}>
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
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onContentSizeChange={() => {
              // Only auto-scroll when NOT typing (i.e., when bot response arrives)
              // When typing, we want user's question to stay visible at top
              if (!isTyping) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={(info) => {
              // Fallback if item hasn't rendered yet
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0,
                });
              }, 100);
            }}
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

      {/* Floating Input */}
      <InputToolbar
        onSendText={handleSendText}
        onSendImage={handleSendImage}
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
