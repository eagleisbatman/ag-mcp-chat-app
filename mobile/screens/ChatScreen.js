import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import useChat from '../hooks/useChat';
import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import { SPACING, TYPOGRAPHY } from '../constants/themes';

export default function ChatScreen({ navigation, route }) {
  const { theme, language, location, locationDetails, setLocation } = useApp();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Get session params from navigation
  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;
  
  const { 
    messages, isTyping, isLoadingSession, newestBotMessageId, 
    handleSendText, handleSendImage, 
    transcribeAudioForInput, uploadAudioInBackground,
    startNewSession 
  } = useChat(sessionId);
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);

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
        showError('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 'granted');
      showSuccess('Location updated!');
    } catch (error) {
      console.log('Location refresh error:', error);
      showError('Could not update location');
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

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      {/* Header - Cleaner design */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: headerPaddingTop }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoContainer, { backgroundColor: theme.accentLight }]}>
            <Ionicons name="leaf" size={22} color={theme.iconPrimary || theme.accent} />
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Farm Assistant</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
              {locationDetails?.displayName || locationDetails?.level5City || locationDetails?.level3District || locationDetails?.level2State || (location?.latitude ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : 'Tap location to set')}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: theme.surfaceVariant }]} 
            onPress={handleRefreshLocation}
            disabled={isRefreshingLocation}
            activeOpacity={0.7}
          >
            {isRefreshingLocation ? (
              <ActivityIndicator size="small" color={theme.iconPrimary || theme.accent} />
            ) : (
              <Ionicons name="location" size={18} color={theme.iconPrimary || theme.accent} />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: theme.accentLight }]} 
            onPress={startNewSession}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={theme.iconPrimary || theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: theme.surfaceVariant }]} 
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={20} color={theme.iconSecondary || theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages - with bottom padding for floating input */}
      <View style={styles.messagesContainer}>
        {isLoadingSession ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading conversation...</Text>
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
              <View style={[styles.typingIndicator, { backgroundColor: theme.botMessage }]}>
                <View style={[styles.typingDot, { backgroundColor: theme.accent }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.accent, opacity: 0.7 }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.accent, opacity: 0.4 }]} />
                <Text style={[styles.typingText, { color: theme.textSecondary }]}>Thinking...</Text>
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
          <TouchableOpacity 
            style={[styles.scrollButton, { backgroundColor: theme.accent }]} 
            onPress={scrollToBottom} 
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
          </TouchableOpacity>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, 
    borderBottomWidth: 0.5,
  },
  headerLeft: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.md,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: SPACING.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: { 
    flex: 1,
  },
  headerTitle: { 
    fontSize: TYPOGRAPHY.sizes.lg, 
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -0.3,
  },
  headerSubtitle: { 
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.sm, 
    flexShrink: 0,
  },
  headerButton: { 
    width: 36, 
    height: 36, 
    borderRadius: SPACING.radiusMd, 
    alignItems: 'center', 
    justifyContent: 'center',
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
  scrollButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 6,
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
