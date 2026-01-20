import React, { useRef, useCallback, useEffect, useState } from 'react';
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
import TypingIndicator from '../components/ui/TypingIndicator';
import WeatherWidget from '../components/weather/WeatherWidget';
import StarterQuestions from '../components/StarterQuestions';

import { styles } from './chat/styles';
import { lookupLocation } from '../services/db';
import { t } from '../constants/strings';
import type { Message } from '../types';
import type { ChatScreenProps, InputToolbarHandle } from './chat/types';

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { theme, language, location, locationDetails, setLocation } = useApp();
  const { showSuccess, showWarning, showError } = useToast();
  
  // Explicitly typing the FlatList ref to allow null
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputToolbarRef = useRef<InputToolbarHandle>(null);

  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;

  const {
    messages, isTyping, isLoadingSession, newestBotMessageId,
    thinkingText, handleSendText, handleSendImage,
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession,
  } = useChat(sessionId);

  const {
    showScrollButton, scrollButtonAnim,
    scrollToBottom, onMessageLayout,
    handleScroll, handleScrollBeginDrag,
    handleLayout, handleContentSizeChange,
    handleScrollToIndexFailed, resetScrollState
  } = useChatScroll({ 
    messages, 
    isTyping, 
    flatListRef: flatListRef as React.RefObject<FlatList<Message>> 
  });

  const { weatherData, weatherLoading, weatherError, weatherProvider } = useWeatherData(
    location?.latitude !== null && location?.longitude !== null 
      ? { latitude: location.latitude as number, longitude: location.longitude as number } 
      : null,
    locationDetails,
    language?.code || 'en'
  );

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  useEffect(() => {
    if (isNewSession) {
      startNewSession();
      resetScrollState();
    }
  }, [isNewSession, startNewSession, resetScrollState]);

  const handleSend = useCallback(async (text: string) => {
    await handleSendText(text);
  }, [handleSendText]);

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
            data={messages}
            inverted={true}
            renderItem={({ item }) => (
              <MessageItem
                message={item}
                isNewMessage={item._id === newestBotMessageId}
                onLayout={(height) => onMessageLayout(item._id, height)}
                onRetry={handleDiagnosisRetry}
                onFollowUpTap={handleFollowUpTap}
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
            onScrollToIndexFailed={handleScrollToIndexFailed}
            ListHeaderComponent={isTyping && thinkingText ? <TypingIndicator text={thinkingText} /> : null}
            ListFooterComponent={
              <>
                {messages.length === 0 && (
                  <StarterQuestions onQuestionTap={handleSend} />
                )}
                <WeatherWidget
                  data={weatherData}
                  loading={weatherLoading}
                  error={weatherError}
                  provider={weatherProvider ?? undefined}
                />
              </>
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

