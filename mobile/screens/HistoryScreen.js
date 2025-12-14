import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { listSessions, deleteSession } from '../services/db';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import ListRow from '../components/ui/ListRow';
import AppIcon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import { t } from '../constants/strings';

export default function HistoryScreen({ navigation }) {
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
      t('history.deleteTitle'),
      t('history.deleteMessage', { title: session.title || t('history.untitled') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteSession(session.id);
              if (result.success) {
                setSessions(prev => prev.filter(s => s.id !== session.id));
                showSuccess(t('history.deleted'));
              } else {
                showError(t('history.couldNotDelete'));
              }
            } catch (error) {
              showError(t('history.deleteFailed'));
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
      return t('history.yesterday');
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderSession = ({ item }) => (
    <Card style={styles.sessionCard}>
      <ListRow
        title={item.title || t('history.newConversation')}
        subtitle={`${item.messageCount || 0} messages • ${formatDate(item.lastMessageAt || item.createdAt)}`}
        left={
          <View style={styles.sessionIcon}>
            <AppIcon name="chatbubbles-outline" size={20} color={theme.accent} />
          </View>
        }
        onPress={() => handleSelectSession(item)}
        onLongPress={() => handleDeleteSession(item)}
        delayLongPress={350}
        paddingHorizontal={SPACING.md}
        accessibilityLabel={`${t('history.title')}: ${item.title || t('history.newConversation')}`}
      />
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <AppIcon name="chatbubbles-outline" size={64} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {t('history.noConversations')}
      </Text>
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        {t('history.noConversationsHint')}
      </Text>
      <Button
        title={t('history.newChat')}
        onPress={handleNewChat}
        left={<AppIcon name="add" size={20} color="#FFFFFF" />}
        accessibilityLabel={t('a11y.startNewChat')}
        style={styles.newChatButton}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        title={t('history.title')}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={
          <IconButton
            icon="add"
            onPress={handleNewChat}
            backgroundColor="transparent"
            color={theme.accent}
            accessibilityLabel={t('history.newChat')}
          />
        }
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : !isDbSynced ? (
        <View style={styles.emptyState}>
          <AppIcon name="cloud-offline-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t('history.notConnectedTitle')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('history.notConnectedHint')}
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
  sessionCard: {
    marginBottom: SPACING.sm,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: 'center',
  },
  newChatButton: {
    marginTop: SPACING.lg,
  },
});
