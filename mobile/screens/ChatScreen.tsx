import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Animated, NativeScrollEvent, NativeSyntheticEvent, LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import useChat from '../hooks/useChat';
import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ChatHeader from '../components/chat/ChatHeader';
import ScrollToBottomButton from '../components/chat/ScrollToBottomButton';
import TypingIndicator from '../components/ui/TypingIndicator';
import WeatherWidget from '../components/weather/WeatherWidget';
import { weatherService } from '../services/weather';
import { lookupLocation } from '../services/db';
import { t } from '../constants/strings';
import { log, error as logError } from '../utils/logger';
import { Message } from '../types';

const SERVICE_PREFS_KEY = '@service_preferences';

interface ChatScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params?: { sessionId?: string; newSession?: boolean; openCamera?: boolean } }, 'params'>;
}

interface WeatherData {
  current?: any;
  forecast?: any;
  location?: {
    city?: string;
    [key: string]: any;
  };
  provider?: string;
}

interface InputToolbarHandle {
  openAttachSheet: () => void;
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { theme, isDark, language, location, locationDetails, setLocation } = useApp();
  const { showSuccess, showWarning, showError } = useToast();
  const flatListRef = useRef<FlatList>(null);
  const inputToolbarRef = useRef<InputToolbarHandle>(null);
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
  // WEATHER WIDGET STATE
  // ===========================================
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherProvider, setWeatherProvider] = useState<string | null>(null);

  // ===========================================
  // SCROLL BEHAVIOR STATE & REFS
  // ===========================================
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // Scroll behavior state
  const isUserScrollingRef = useRef(false);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const currentScrollYRef = useRef(0);
  const messageHeightsRef = useRef<{ [key: string]: number }>({});
  const lastUserMessageIdRef = useRef<string | null>(null);
  const shouldScrollToUserRef = useRef(false);
  const blockAutoScrollRef = useRef(false);
  const isAnchorLockedRef = useRef(false);

  // Handle new session request
  useEffect(() => {
    if (isNewSession) {
      startNewSession();
      isUserScrollingRef.current = false;
      lastUserMessageIdRef.current = null;
    }
  }, [isNewSession, startNewSession]);

  // ===========================================
  // FETCH WEATHER DATA
  // ===========================================
  const isFetchingWeatherRef = useRef(false);

  const fetchWeather = useCallback(async () => {
    if (!location?.latitude || !location?.longitude) {
      return;
    }

    if (isFetchingWeatherRef.current) {
      return;
    }

    isFetchingWeatherRef.current = true;
    setWeatherLoading(true);
    setWeatherError(false);

    try {
      let prefs: { weather?: string } = {};
      try {
        const stored = await AsyncStorage.getItem(SERVICE_PREFS_KEY);
        if (stored) prefs = JSON.parse(stored);
      } catch (e) {
        log('[Weather] Failed to load service prefs:', e);
      }

      const weatherPref = prefs.weather || 'accuweather';

      const data = await weatherService.getCurrentAndForecast(
        location.latitude,
        location.longitude,
        language?.code || 'en',
        weatherPref
      );

      if (locationDetails?.displayName) {
        data.location = {
          ...data.location,
          city: locationDetails.displayName,
        };
      }

      setWeatherProvider(data.provider || weatherPref);
      setWeatherData(data);
    } catch (error) {
      logError('[Weather] Failed to fetch weather:', error);
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
      isFetchingWeatherRef.current = false;
    }
  }, [location?.latitude, location?.longitude, language?.code, locationDetails?.displayName]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  useFocusEffect(
    useCallback(() => {
      fetchWeather();
    }, [fetchWeather])
  );

  // ===========================================
  // MESSAGE HEIGHT TRACKING
  // ===========================================
  const onMessageLayout = useCallback((messageId: string, height: number) => {
    messageHeightsRef.current[messageId] = height;
  }, []);

  // ===========================================
  // SCROLL TO USER MESSAGE
  // ===========================================
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
  }, [messages]);

  // ===========================================
  // SCROLL EVENT HANDLERS
  // ===========================================
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

  // ===========================================
  // TRIGGER SCROLL WHEN isTyping STARTS
  // ===========================================
  const prevIsTypingRef = useRef(isTyping);
  const prevMessagesLengthRef = useRef(messages.length);

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
            shouldScrollToUserRef.current = false;
            
            setTimeout(() => {
              blockAutoScrollRef.current = false;
            }, 1000);
          }
        }, 150);
      });
    }

    if (!isTyping && prevIsTypingRef.current) {
      blockAutoScrollRef.current = false;
      isAnchorLockedRef.current = false;
    }

    prevIsTypingRef.current = isTyping;
    prevMessagesLengthRef.current = messages.length;
  }, [isTyping, messages.length, scrollToUserMessage]);

  // ===========================================
  // WRAPPED SEND HANDLERS
  // ===========================================
  const handleSend = useCallback(async (text: string) => {
    isUserScrollingRef.current = false;
    lastUserMessageIdRef.current = null;
    await handleSendText(text);
  }, [handleSendText]);

  const handleSendImageWrapped = useCallback(async (imageData: any) => {
    isUserScrollingRef.current = false;
    lastUserMessageIdRef.current = null;
    await handleSendImage(imageData);
  }, [handleSendImage]);

  const handleDiagnosisRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
    inputToolbarRef.current?.openAttachSheet();
  }, []);

  // ===========================================
  // SCROLL TO BOTTOM BUTTON
  // ===========================================
  const scrollToBottom = useCallback(() => {
    isUserScrollingRef.current = false;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
  // LOCATION HANDLERS
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
        });
      }
      if (!loc?.coords) {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
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
      <ChatHeader
        onRefreshLocation={handleRefreshLocation}
        onNewSession={startNewSession}
        onOpenSettings={() => navigation.navigate('Settings')}
        isRefreshing={isRefreshingLocation}
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
            data={messages}
            inverted={true}
            renderItem={({ item }) => (
              <MessageItem
                message={item}
                isNewMessage={item._id === newestBotMessageId}
                onLayout={(height: number) => onMessageLayout(item._id, height)}
                onRetry={handleDiagnosisRetry}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}

            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}

            keyboardShouldPersistTaps="handled"

            onScrollToIndexFailed={(info) => {
              log('📜 [Scroll] scrollToIndex failed, using offset fallback');
              const avgHeight = 100;
              flatListRef.current?.scrollToOffset({
                offset: info.index * avgHeight,
                animated: true,
              });
            }}

            ListHeaderComponent={isTyping ? (
              <TypingIndicator text={thinkingText || t('chat.thinking')} />
            ) : null}

            ListFooterComponent={
              <WeatherWidget
                data={weatherData}
                loading={weatherLoading}
                error={weatherError}
                provider={weatherProvider}
              />
            }
          />
        )}

        {/* Scroll to bottom button */}
        <ScrollToBottomButton
          visible={showScrollButton}
          animatedValue={scrollButtonAnim}
          onPress={scrollToBottom}
        />
      </View>

      {/* Input */}
      <InputToolbar
        ref={inputToolbarRef}
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
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesList: {
    paddingTop: SPACING.sm,
    paddingHorizontal: 0,
    flexGrow: 1,
    justifyContent: 'flex-end',
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
