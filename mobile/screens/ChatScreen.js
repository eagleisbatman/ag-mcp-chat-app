import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import AppIcon from '../components/ui/AppIcon';
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
import { t } from '../constants/strings';
import { ToolsMenu } from '../widgets';

export default function ChatScreen({ navigation, route }) {
  const { theme, language, location, locationDetails, setLocation } = useApp();
  const { showSuccess, showWarning, showError } = useToast();
  const flatListRef = useRef(null);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Get session params from navigation
  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;
  
  const {
    messages, isTyping, isLoadingSession, newestBotMessageId,
    handleSendText, handleSendImage, handleSendWidget, showInputWidget,
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession,
  } = useChat(sessionId);
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('chat.locationDenied'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 'granted');
      showSuccess(t('chat.locationUpdated'));
    } catch (error) {
      console.log('Location refresh error:', error);
      showError(t('chat.locationUpdateFailed'));
    } finally {
      setIsRefreshingLocation(false);
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

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  // Handle widget selection from tools menu
  const handleSelectWidget = useCallback((widget) => {
    // Show the input widget directly in the chat
    showInputWidget(widget.type);
  }, [showInputWidget]);

  // Handle accepting a widget suggestion from a bot message
  const handleWidgetSuggestionAccept = useCallback((widgetType) => {
    showInputWidget(widgetType);
  }, [showInputWidget]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header - Clean, logo-only design */}
      <ScreenHeader
        align="left"
        center={
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <AppIcon name="leaf" size={24} color={theme.iconPrimary || theme.accent} />
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
              {locationDetails?.displayName ||
                locationDetails?.level5City ||
                locationDetails?.level3District ||
                locationDetails?.level2State ||
                (location?.latitude ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : t('chat.tapLocationToSet'))}
            </Text>
          </View>
        }
        right={
          <>
            <IconButton
              icon="apps"
              onPress={() => setShowToolsMenu(true)}
              size={36}
              backgroundColor="transparent"
              color={theme.iconPrimary || theme.accent}
              accessibilityLabel="Open tools menu"
            />
            <IconButton
              icon="location"
              onPress={handleRefreshLocation}
              disabled={isRefreshingLocation}
              size={36}
              backgroundColor="transparent"
              color={theme.iconPrimary || theme.accent}
              accessibilityLabel={t('a11y.refreshLocation')}
            />
            <IconButton
              icon="add"
              onPress={startNewSession}
              size={36}
              backgroundColor="transparent"
              color={theme.iconPrimary || theme.accent}
              accessibilityLabel={t('a11y.newChat')}
            />
            <IconButton
              icon="menu"
              onPress={() => navigation.navigate('Settings')}
              size={36}
              backgroundColor="transparent"
              color={theme.iconSecondary || theme.textSecondary}
              accessibilityLabel={t('a11y.openSettings')}
            />
          </>
        }
      />

      {/* Messages - with bottom padding for floating input */}
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
                onFollowUpPress={handleSendText}
                onWidgetSubmit={handleSendWidget}
                onWidgetSuggestionAccept={handleWidgetSuggestionAccept}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={isTyping ? (
              <View style={styles.typingIndicator}>
                <View style={[styles.typingDot, { backgroundColor: theme.accent }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.accent, opacity: 0.7 }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.accent, opacity: 0.4 }]} />
                <Text style={[styles.typingText, { color: theme.textSecondary }]}>{t('chat.thinking')}</Text>
              </View>
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

      {/* Tools Menu Modal */}
      <ToolsMenu
        visible={showToolsMenu}
        onClose={() => setShowToolsMenu(false)}
        onSelectWidget={handleSelectWidget}
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
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  typingIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, 
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typingText: { 
    fontSize: TYPOGRAPHY.sizes.sm,
    marginLeft: SPACING.sm,
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
