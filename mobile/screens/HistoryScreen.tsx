import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ListRenderItem,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { SkeletonSessionItem } from '../components/ui/Skeleton';
import { t } from '../constants/strings';
import { log } from '../utils/logger';
import type { RootStackParamList, Session } from '../types';

interface HistoryScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { theme, setCurrentSessionId, isDbSynced } = useApp();
  const { showSuccess, showError } = useToast();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (s.title || '').toLowerCase().includes(q);
      })
    : sessions;

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
        log('Failed to load sessions:', result.error);
      }
    } catch (error) {
      log('Load sessions error:', error);
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

  const handleSelectSession = (session: Session) => {
    setCurrentSessionId(session.id);
    navigation.navigate('Chat', { sessionId: session.id });
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    navigation.navigate('Chat', { newSession: true });
  };

  const handleDeleteSession = (session: Session) => {
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

  const formatDate = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else if (diffDays === 1) {
      return t('history.yesterday');
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
  };

  const renderSession: ListRenderItem<Session> = ({ item }) => (
    <Card style={styles.sessionCard}>
      <ListRow
        title={item.title || t('history.newConversation')}
        subtitle={`${item.messageCount === 1 ? t('history.messageCountSingular') : t('history.messageCount', { count: item.messageCount || 0 })} • ${formatDate(item.updatedAt || item.createdAt)}`}
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
            testID="history-new-chat"
          />
        }
      />

      {/* Search bar */}
      {!isLoading && isDbSynced && sessions.length > 0 && (
        <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
          <AppIcon name="search" size={16} color={theme.textMuted} />
          <TextInput
            testID="history-search"
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('history.searchPlaceholder')}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <IconButton
              icon="x"
              size={16}
              onPress={() => setSearchQuery('')}
              backgroundColor="transparent"
              color={theme.textMuted}
            />
          )}
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonSessionItem />
          <SkeletonSessionItem />
          <SkeletonSessionItem />
          <SkeletonSessionItem />
          <SkeletonSessionItem />
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
          data={filteredSessions}
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
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    paddingVertical: SPACING.xs,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  emptyListContent: { flex: 1 },
  sessionCard: { marginBottom: SPACING.sm },
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
  newChatButton: { marginTop: SPACING.lg },
});
