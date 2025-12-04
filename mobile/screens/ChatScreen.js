import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import useChat from '../hooks/useChat';
import MessageItem from '../components/MessageItem';
import InputToolbar from '../components/InputToolbar';
import ThemeToggle from '../components/ThemeToggle';
import { SPACING } from '../constants/themes';

export default function ChatScreen({ navigation, route }) {
  const { theme, language, locationDetails } = useApp();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Get session params from navigation
  const sessionId = route?.params?.sessionId;
  const isNewSession = route?.params?.newSession;
  
  const { 
    messages, isTyping, isLoadingSession, newestBotMessageId, 
    handleSendText, handleSendImage, handleSendVoice, startNewSession 
  } = useChat(sessionId);
  
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);

  // Handle new session request
  React.useEffect(() => {
    if (isNewSession) {
      startNewSession();
    }
  }, [isNewSession, startNewSession]);

  useEffect(() => {
    Animated.spring(scrollButtonAnim, {
      toValue: showScrollButton ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [showScrollButton, scrollButtonAnim]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    Haptics.selectionAsync();
  }, []);

  const handleScroll = useCallback((event) => {
    setShowScrollButton(event.nativeEvent.contentOffset.y > 200);
  }, []);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: headerPaddingTop }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="leaf" size={28} color={theme.accent} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Farm Assistant</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              {locationDetails?.displayName || language?.nativeName || 'English'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.surfaceVariant }]} onPress={() => navigation.navigate('History')}>
            <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <ThemeToggle />
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.surfaceVariant }]} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        {isLoadingSession ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading conversation...</Text>
          </View>
        ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageItem message={item} isNewMessage={item._id === newestBotMessageId} />}
          keyExtractor={(item) => item._id}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={isTyping ? (
            <View style={[styles.typingIndicator, { backgroundColor: theme.botMessage }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.typingText, { color: theme.textSecondary }]}>Thinking...</Text>
            </View>
          ) : null}
        />
        )}
        <Animated.View
          style={[styles.scrollButtonContainer, {
            opacity: scrollButtonAnim,
            transform: [
              { translateY: scrollButtonAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
              { scale: scrollButtonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            ],
          }]}
          pointerEvents={showScrollButton ? 'auto' : 'none'}
        >
          <TouchableOpacity style={[styles.scrollButton, { backgroundColor: theme.accent }]} onPress={scrollToBottom} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Input */}
      <InputToolbar onSendText={handleSendText} onSendImage={handleSendImage} onSendVoice={handleSendVoice} disabled={isTyping} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 13 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  messagesContainer: { flex: 1, position: 'relative' },
  messagesList: { paddingVertical: 8 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  typingText: { fontSize: 14 },
  scrollButtonContainer: { position: 'absolute', bottom: 16, alignSelf: 'center', zIndex: 100 },
  scrollButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 15 },
});
