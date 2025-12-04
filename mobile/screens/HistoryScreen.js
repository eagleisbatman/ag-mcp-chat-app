import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { listSessions, deleteSession } from '../services/db';
import { SPACING } from '../constants/themes';

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top + SPACING.headerPaddingOffset, SPACING.headerMinPadding);
  const { theme, setCurrentSessionId, isDbSynced } = useApp();
  const { showSuccess, showError } = useToast();
  
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!isDbSynced) {
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await listSessions({ limit: 50 });
      if (result.success) {
        setSessions(result.sessions || []);
      } else {
        console.log('Failed to load sessions:', result.error);
      }
    } catch (error) {
      console.error('Load sessions error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isDbSynced]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSessions();
  };

  const handleSelectSession = (session) => {
    setCurrentSessionId(session.id);
    navigation.navigate('Chat', { sessionId: session.id, sessionTitle: session.title });
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    navigation.navigate('Chat', { newSession: true });
  };

  const handleDeleteSession = (session) => {
    Alert.alert(
      'Delete Conversation',
      `Delete "${session.title || 'Untitled'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteSession(session.id);
              if (result.success) {
                setSessions(prev => prev.filter(s => s.id !== session.id));
                showSuccess('Conversation deleted');
              } else {
                showError('Could not delete conversation');
              }
            } catch (error) {
              showError('Delete failed');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderSession = ({ item }) => (
    <TouchableOpacity
      style={[styles.sessionItem, { backgroundColor: theme.surface }]}
      onPress={() => handleSelectSession(item)}
      onLongPress={() => handleDeleteSession(item)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionContent}>
        <View style={[styles.sessionIcon, { backgroundColor: theme.accentLight }]}>
          <Ionicons name="chatbubbles-outline" size={20} color={theme.accent} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title || 'New Conversation'}
          </Text>
          <Text style={[styles.sessionMeta, { color: theme.textMuted }]}>
            {item.messageCount || 0} messages • {formatDate(item.lastMessageAt || item.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        Start a new chat to get farming advice
      </Text>
      <TouchableOpacity
        style={[styles.newChatButton, { backgroundColor: theme.accent }]}
        onPress={handleNewChat}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.newChatButtonText}>New Chat</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Conversations</Text>
        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: theme.accentLight }]}
          onPress={handleNewChat}
        >
          <Ionicons name="add" size={24} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : !isDbSynced ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Not connected
          </Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Conversation history requires an internet connection
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            sessions.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accent}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  sessionItem: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

