import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import useChat from '../hooks/useChat';
import useChatScroll from '../hooks/useChatScroll';
import useWeatherData from '../hooks/useWeatherData';
import { useA2UIPicker } from '../hooks/useA2UIPicker';

import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import ChatHeader from '../components/chat/ChatHeader';
import ScrollToBottomButton from '../components/chat/ScrollToBottomButton';
import DateSeparator from '../components/chat/DateSeparator';
import WeatherWidget from '../components/weather/WeatherWidget';
import StarterQuestions from '../components/StarterQuestions';
import PickerSheet from '../components/a2ui/picker/PickerSheet';

import { styles } from './chat/styles';
import { lookupLocation } from '../services/db';
import { t } from '../constants/strings';
import type { Message, A2UIPayload } from '../types';
import type { ChatScreenProps, InputToolbarHandle } from './chat/types';

// Type for starter questions synthetic item
type StarterQuestionsItem = { _id: 'starter-questions'; isStarterQuestions: true };
type ListItem = Message | StarterQuestionsItem;

// Whitelist of allowed nudge message keys (prevents prompt injection from push payloads)
const NUDGE_MESSAGES: Record<string, string> = {
  setup_farm_profile: "Let's set up your farm profile so I can give you better advice",
  add_crops: 'What crops are you growing this season?',
  add_livestock: 'What animals do you keep on your farm?',
};

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { theme, language, location, locationDetails, setLocation, userId } = useApp();
  const { showSuccess, showWarning, showError } = useToast();

  // Explicitly typing the FlatList ref to allow null
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const inputToolbarRef = useRef<InputToolbarHandle>(null);

  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;
  const nudgeMessage = route?.params?.nudgeMessage;
  const onBehalfOfFarmerUserId = route?.params?.onBehalfOfFarmerUserId;
  const onBehalfOfFarmerName = route?.params?.onBehalfOfFarmerName;

  const {
    messages, isTyping, isLoadingSession, newestBotMessageId,
    handleSendText, handleSendImage,
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession,
  } = useChat(sessionId, onBehalfOfFarmerUserId);

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

  // Track which A2UI widgets the user has already responded to (persisted per session).
  //
  // Race condition prevention:
  // - AsyncStorage.getItem is async, so the user could respond to a widget BEFORE the load completes.
  // - respondedLoadedRef gates persistence writes: we don't write until the initial load finishes,
  //   preventing an empty/partial Set from overwriting the stored data.
  // - On load, we MERGE stored IDs with any already in state (added between mount and load).
  const [respondedA2UIWidgetIds, setRespondedA2UIWidgetIds] = useState<Set<string>>(new Set());
  const respondedLoadedRef = useRef(false);

  // Load persisted respondedWidgetIds when session loads
  useEffect(() => {
    respondedLoadedRef.current = false;
    if (!sessionId || !userId) return;
    AsyncStorage.getItem(`responded:${userId}:${sessionId}`).then((stored) => {
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          if (Array.isArray(ids) && ids.length > 0) {
            setRespondedA2UIWidgetIds((prev) => {
              const merged = new Set([...ids, ...prev]);
              return merged;
            });
          }
        } catch { /* ignore corrupt data */ }
      }
      respondedLoadedRef.current = true;
    });
  }, [sessionId, userId]);

  // Persist respondedWidgetIds on change (only after initial load completes to avoid overwriting)
  // Debounced to avoid thrashing AsyncStorage when multiple widgets are responded to quickly.
  useEffect(() => {
    if (!sessionId || !userId || respondedA2UIWidgetIds.size === 0 || !respondedLoadedRef.current) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(`responded:${userId}:${sessionId}`, JSON.stringify([...respondedA2UIWidgetIds]));
    }, 500);
    return () => clearTimeout(timer);
  }, [sessionId, userId, respondedA2UIWidgetIds]);

  // A2UI picker system (replaces per-type modal state + handlers)
  const {
    pickerState, items: pickerItems, suggestedItems, profileActions,
    openPicker, handleComplete: handlePickerComplete,
    handleClose: handlePickerClose,
    handleSaveError, handleSaveSuccess,
  } = useA2UIPicker({
    handleSendText, scrollToBottom, showSuccess, showError,
    respondedA2UIWidgetIds, setRespondedA2UIWidgetIds,
  });

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

  // Auto-send nudge message (e.g. from push notification for profile collection)
  const nudgeSentRef = useRef(false);
  useEffect(() => {
    if (nudgeMessage && !nudgeSentRef.current && !isLoadingSession) {
      const safeMessage = NUDGE_MESSAGES[nudgeMessage];
      if (safeMessage) {
        nudgeSentRef.current = true;
        handleSendText(safeMessage);
      }
    }
  }, [nudgeMessage, isLoadingSession, handleSendText]);

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

  // InputToolbar types base64 as optional but handleSendImage requires it.
  // Narrow here rather than using 'any' to preserve type safety.
  const handleSendImageTyped = useCallback((data: { uri: string; base64?: string; text?: string }) => {
    if (data.base64 !== undefined) {
      handleSendImage({ uri: data.uri, base64: data.base64, text: data.text });
    }
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

  // A2UI press delegates to the picker system (registered pickers open modals, others send text)
  const handleA2UIPress = useCallback((widget: A2UIPayload) => {
    openPicker(widget);
  }, [openPicker]);

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

      {onBehalfOfFarmerUserId && (
        <View style={{ backgroundColor: theme.warning + '20', paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: theme.warning, fontSize: 13, fontWeight: '600' }}>
            {'Chatting as: '}
          </Text>
          <Text style={{ color: theme.warning, fontSize: 13 }} numberOfLines={1}>
            {onBehalfOfFarmerName || 'Farmer'}
          </Text>
        </View>
      )}

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
                    onA2UIPress={item.a2uiWidgets?.length ? handleA2UIPress : undefined}
                    respondedA2UIWidgetIds={item.a2uiWidgets?.length ? respondedA2UIWidgetIds : undefined}
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
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
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
        onSendImage={handleSendImageTyped}
        transcribeAudio={transcribeAudioForInput}
        uploadAudioInBackground={uploadAudioInBackground}
        disabled={isTyping}
      />

      {/* A2UI Picker — single generic modal driven by picker registry */}
      {pickerState.config && (
        <PickerSheet
          visible={pickerState.visible}
          onClose={handlePickerClose}
          config={pickerState.config}
          items={pickerItems}
          title={pickerState.widget?.title}
          suggestedItems={suggestedItems}
          purpose={pickerState.widget?.purpose}
          profileActions={profileActions}
          onComplete={handlePickerComplete}
          onSaveError={handleSaveError}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </View>
  );
}
