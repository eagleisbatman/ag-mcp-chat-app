import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { t } from '../../constants/strings';
import ContentCard from './ContentCard';

interface ContentItem {
  id?: string;
  _id?: string;
  type?: 'article' | 'podcast' | 'video';
  thumbnailUrl?: string;
  coverImageUrl?: string;
  title?: string;
  summary?: string;
  duration?: number;
  readingTime?: number;
  publishedAt?: string;
  topics?: string[];
}

interface ContentCarouselProps {
  title?: string;
  items?: ContentItem[];
  onItemPress?: (item: ContentItem) => void;
  onSeeAll?: () => void;
  loading?: boolean;
}

/**
 * ContentCarousel - Horizontal scrolling content list with title and "See All" button
 */
const ContentCarousel: React.FC<ContentCarouselProps> = ({
  title,
  items = [],
  onItemPress,
  onSeeAll,
  loading = false,
}) => {
  const { theme } = useApp();

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {title || t('content.forYou')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      </View>
    );
  }

  // Empty state
  if (!items || items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {title || t('content.forYou')}
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('content.noContent')}
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Render a single content item
   */
  const renderItem: ListRenderItem<ContentItem> = ({ item }) => (
    <ContentCard
      item={item}
      variant="compact"
      onPress={() => onItemPress?.(item)}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header with title and See All */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {title || t('content.forYou')}
        </Text>
        {onSeeAll && (
          <Pressable
            style={({ pressed }) => [styles.seeAllButton, pressed && { opacity: 0.7 }]}
            onPress={onSeeAll}
          >
            <Text style={[styles.seeAllText, { color: theme.accent }]}>
              {t('content.seeAll')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.accent} />
          </Pressable>
        )}
      </View>

      {/* Horizontal content list */}
      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  separator: {
    width: SPACING.md,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});

export default ContentCarousel;
