import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';

interface ContentItem {
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

interface ContentCardProps {
  item: ContentItem;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

/**
 * ContentCard - Card component for articles, podcasts, and videos
 */
const ContentCard: React.FC<ContentCardProps> = ({ item, onPress, variant = 'default' }) => {
  const { theme } = useApp();

  const isCompact = variant === 'compact';
  const isPodcast = item.type === 'podcast';
  const isVideo = item.type === 'video';

  /**
   * Format duration from seconds to MM:SS
   */
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get badge color based on content type
   */
  const getTypeColor = (type?: string): string => {
    switch (type) {
      case 'article':
        return theme.success;
      case 'podcast':
        return '#9C27B0'; // Purple
      case 'video':
        return theme.error;
      default:
        return theme.info;
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        isCompact && styles.containerCompact,
        { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}
    >
      {/* Thumbnail */}
      <View style={[styles.imageContainer, isCompact && styles.imageContainerCompact]}>
        {item.thumbnailUrl || item.coverImageUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl || item.coverImageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'LJI=IA%1_4%2D*s:WBoe~pt6-ooJ' }}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons
              name={isPodcast ? 'headset' : isVideo ? 'videocam' : 'document-text'}
              size={32}
              color={theme.textMuted}
            />
          </View>
        )}

        {/* Media type indicator (for podcasts/videos) */}
        {(isPodcast || isVideo) && (
          <View style={styles.mediaIndicator}>
            <Ionicons
              name={isPodcast ? 'headset' : 'play-circle'}
              size={24}
              color="#fff"
            />
            {item.duration && (
              <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            )}
          </View>
        )}

        {/* Content type badge */}
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <Text style={styles.typeBadgeText}>{(item.type || 'article').toUpperCase()}</Text>
        </View>
      </View>

      {/* Content info */}
      <View style={[styles.content, isCompact && styles.contentCompact]}>
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={2}
        >
          {item.title || 'Untitled'}
        </Text>

        {/* Summary (only in default variant) */}
        {!isCompact && item.summary && (
          <Text
            style={[styles.summary, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {item.summary}
          </Text>
        )}

        {/* Topics/Tags */}
        {item.topics && item.topics.length > 0 && (
          <View style={styles.tags}>
            {item.topics.slice(0, 2).map((topic, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: theme.surfaceVariant }]}
              >
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Meta info */}
        <View style={styles.meta}>
          {item.readingTime && (
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {item.readingTime} min read
            </Text>
          )}
          {item.publishedAt && (
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {new Date(item.publishedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: SPACING.radiusMd,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerCompact: {
    width: 200,
  },
  imageContainer: {
    height: 160,
    position: 'relative',
  },
  imageContainerCompact: {
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaIndicator: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusSm,
  },
  durationText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.xs,
    marginLeft: SPACING.xs,
  },
  typeBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusSm,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  content: {
    padding: SPACING.md,
  },
  contentCompact: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
  summary: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusSm + 4,
  },
  tagText: {
    fontSize: 11,
  },
  meta: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  metaText: {
    fontSize: 11,
  },
});

export default ContentCard;
