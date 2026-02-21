import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import useChat from '../hooks/useChat';
import useChatScroll from '../hooks/useChatScroll';
import useWeatherData from '../hooks/useWeatherData';

import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import ChatHeader from '../components/chat/ChatHeader';
import ScrollToBottomButton from '../components/chat/ScrollToBottomButton';
import DateSeparator from '../components/chat/DateSeparator';
import WeatherWidget from '../components/weather/WeatherWidget';
import StarterQuestions from '../components/StarterQuestions';

import { styles } from './chat/styles';
import { lookupLocation } from '../services/db';
import { t } from '../constants/strings';
import type { Message, A2UIPayload } from '../types';
import type { ChatScreenProps, InputToolbarHandle } from './chat/types';

// Type for starter questions synthetic item
type StarterQuestionsItem = { _id: 'starter-questions'; isStarterQuestions: true };
type ListItem = Message | StarterQuestionsItem;

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { theme, language, location, locationDetails, setLocation } = useApp();
  const { showSuccess, showWarning, showError } = useToast();
  
  // Explicitly typing the FlatList ref to allow null
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const inputToolbarRef = useRef<InputToolbarHandle>(null);

  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;

  const {
    messages, isTyping, isLoadingSession, newestBotMessageId,
    handleSendText, handleSendImage,
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession,
  } = useChat(sessionId);

  const {
    showScrollButton, scrollButtonAnim,
    scrollToBottom, scrollToLastConversation, onMessageLayout,
    handleScroll, handleScrollBeginDrag,
    handleLayout, handleContentSizeChange,
    handleScrollToIndexFailed, resetScrollState
  } = useChatScroll({
    messages,
    isTyping,
    flatListRef: flatListRef
  });

  const { weatherData, weatherLoading, weatherError, weatherProvider } = useWeatherData(
    location?.latitude !== null && location?.longitude !== null
      ? { latitude: location.latitude as number, longitude: location.longitude as number }
      : null,
    locationDetails,
    language?.code || 'en'
  );

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // Track which A2UI widgets the user has already responded to
  const [respondedA2UIWidgetIds, setRespondedA2UIWidgetIds] = useState<Set<string>>(new Set());

  // Combine messages with starter questions as a scrollable item
  // In inverted list: higher index = visual top, lower index = visual bottom
  // Order should be: Weather (footer) → Welcome → Starter Questions → User messages → Input
  const listData = useMemo<ListItem[]>(() => {
    const starterItem: StarterQuestionsItem = { _id: 'starter-questions', isStarterQuestions: true };

    // Find the welcome message (should stay at visual top, just below weather)
    const welcomeMsg = messages.find(m => m._id === 'welcome');
    const otherMessages = messages.filter(m => m._id !== 'welcome');

    // Array order: [other messages (newest first), starter questions, welcome message]
    // Visual order (top to bottom): Weather → Welcome → Starter Questions → Messages → Input
    const result: ListItem[] = [...otherMessages, starterItem];
    if (welcomeMsg) {
      result.push(welcomeMsg);
    }
    return result;
  }, [messages]);

  useEffect(() => {
    if (isNewSession) {
      startNewSession();
      resetScrollState();
    }
  }, [isNewSession, startNewSession, resetScrollState]);

  // When loading existing session (history), scroll to show the last conversation
  const prevLoadingRef = useRef(isLoadingSession);
  useEffect(() => {
    // Detect when loading just finished (was loading, now not loading)
    if (prevLoadingRef.current && !isLoadingSession && messages.length > 0 && !isNewSession) {
      // Scroll to last conversation after history is loaded
      scrollToLastConversation();
    }
    prevLoadingRef.current = isLoadingSession;
  }, [isLoadingSession, messages.length, isNewSession, scrollToLastConversation]);

  const handleSend = useCallback(async (text: string) => {
    await handleSendText(text);
    scrollToBottom();
  }, [handleSendText, scrollToBottom]);

  const handleSendImageWrapped = useCallback(async (imageData: any) => {
    await handleSendImage(imageData);
  }, [handleSendImage]);

  const handleDiagnosisRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollToBottom();
    inputToolbarRef.current?.openAttachSheet();
  }, [scrollToBottom]);

  const handleFollowUpTap = useCallback((question: string) => {
    // Send the follow-up question as a new message
    handleSendText(question);
    scrollToBottom();
  }, [handleSendText, scrollToBottom]);

  const handleA2UIPress = useCallback((widget: A2UIPayload) => {
    // Mark this widget as responded
    setRespondedA2UIWidgetIds(prev => new Set(prev).add(widget.widgetId));
    // Build a display text from widget context (e.g. selected option label)
    const ctx = widget.context || {};
    const displayText = (ctx.selectedLabel as string) || widget.title || `Selected: ${widget.widgetType}`;
    // Send the selection as a chat message so the AI receives the user's choice
    handleSendText(displayText);
    scrollToBottom();
  }, [handleSendText, scrollToBottom]);

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
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ChatHeader
        onRefreshLocation={handleRefreshLocation}
        onNewSession={startNewSession}
        onOpenSettings={() => navigation.navigate('Settings')}
        isRefreshing={isRefreshingLocation}
      />

      <View style={styles.messagesContainer} onLayout={handleLayout}>
        {isLoadingSession ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('chat.loadingConversation')}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            inverted={true}
            renderItem={({ item, index }) => {
              // Render starter questions as a scrollable item
              if ('isStarterQuestions' in item) {
                return <StarterQuestions onQuestionTap={handleSend} />;
              }

              // Check if we need a date separator above this message
              // In inverted list, index+1 = older message (visually above)
              const nextItem = listData[index + 1];
              const showDateSeparator = nextItem && !('isStarterQuestions' in nextItem) && (() => {
                const currDate = new Date(item.createdAt);
                const nextDate = new Date(nextItem.createdAt);
                return currDate.toDateString() !== nextDate.toDateString();
              })();

              return (
                <>
                  <MessageItem
                    message={item}
                    isNewMessage={item._id === newestBotMessageId}
                    onLayout={(height) => onMessageLayout(item._id, height)}
                    onRetry={handleDiagnosisRetry}
                    onFollowUpTap={handleFollowUpTap}
                    onA2UIPress={handleA2UIPress}
                    respondedA2UIWidgetIds={respondedA2UIWidgetIds}
                  />
                  {showDateSeparator && <DateSeparator date={item.createdAt} />}
                </>
              );
            }}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={handleScrollToIndexFailed}
            ListFooterComponent={
              <WeatherWidget
                data={weatherData}
                loading={weatherLoading}
                error={weatherError}
                provider={weatherProvider ?? undefined}
              />
            }
          />
        )}

        <ScrollToBottomButton
          visible={showScrollButton}
          animatedValue={scrollButtonAnim}
          onPress={scrollToBottom}
        />
      </View>

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

