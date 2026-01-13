import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { t } from '../constants/strings';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import { error as logError } from '../utils/logger';

import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import ContentCarousel from '../components/content/ContentCarousel';
import { contentService } from '../services/content';

interface ContentDetailScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { contentId?: string } }, 'params'>;
}

interface ContentData {
  id?: string;
  _id?: string;
  title?: string;
  summary?: string;
  body?: string;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  type?: string;
  duration?: number;
  author?: string;
  publishedAt?: string;
  readingTime?: number;
  topics?: string[];
  url?: string;
  sourceUrl?: string;
}

interface RelatedContentItem {
  id?: string;
  _id?: string;
  [key: string]: any;
}

/**
 * ContentDetailScreen - Full content view for articles, podcasts, and videos
 */
export default function ContentDetailScreen({ navigation, route }: ContentDetailScreenProps) {
  const { contentId } = route.params || {};
  const { theme, isDark } = useApp();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const viewStartTime = useRef(Date.now());

  // State
  const [content, setContent] = useState<ContentData | null>(null);
  const [relatedContent, setRelatedContent] = useState<RelatedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  /**
   * Load content data
   */
  useEffect(() => {
    const loadContent = async () => {
      if (!contentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        viewStartTime.current = Date.now();

        // Load content and related content in parallel
        const [contentData, relatedData] = await Promise.all([
          contentService.getContent(contentId),
          contentService.getRelatedContent(contentId, 5),
        ]);

        setContent(contentData);
        setRelatedContent(relatedData);

        // Track view
        contentService.trackView(contentId, { source: 'detail' });
      } catch (error) {
        logError('Error loading content:', error);
        showError(t('content_load_error') || 'Could not load content');
      } finally {
        setLoading(false);
      }
    };

    loadContent();

    // Track view duration on unmount
    return () => {
      if (contentId) {
        const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
        contentService.trackView(contentId, { duration, source: 'detail' });
      }
    };
  }, [contentId]);

  /**
   * Handle like/unlike
   */
  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);

    if (contentId) {
      if (!liked) {
        await contentService.likeContent(contentId);
      } else {
        await contentService.unlikeContent(contentId);
      }
    }
  };

  /**
   * Handle share
   */
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await Share.share({
        title: content?.title,
        message: `${content?.title}\n\n${content?.summary || ''}\n\nRead more on FarmerChat`,
        url: content?.url,
      });

      // Track share
      if (contentId) {
        contentService.shareContent(contentId);
      }
    } catch (error) {
      logError('Share error:', error);
    }
  };

  /**
   * Handle related content press
   */
  const handleRelatedPress = (item: RelatedContentItem) => {
    // Navigate to same screen with new content ID
    navigation.push('ContentDetail', { contentId: item.id || item._id });
  };

  /**
   * Format duration for display
   */
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get content type icon
   */
  const getTypeIcon = (type?: string): string => {
    switch (type) {
      case 'podcast':
        return 'headset';
      case 'video':
        return 'play-circle';
      default:
        return 'document-text';
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          left={
            <IconButton
              icon="arrow-back"
              onPress={() => navigation.goBack()}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('common.back') || 'Back'}
            />
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  // Error/not found state
  if (!content) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          left={
            <IconButton
              icon="arrow-back"
              onPress={() => navigation.goBack()}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('common.back') || 'Back'}
            />
          }
        />
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.textMuted }]}>
            {t('content_not_found') || 'Content not found'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScreenHeader
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            size={36}
            borderRadius={10}
            backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
            color={theme.icon}
            accessibilityLabel={t('common.back') || 'Back'}
          />
        }
        right={
          <>
            <IconButton
              icon={liked ? 'heart' : 'heart-outline'}
              onPress={handleLike}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={liked ? theme.error : theme.icon}
              accessibilityLabel={t('content_like') || 'Like'}
            />
            <IconButton
              icon="share-outline"
              onPress={handleShare}
              size={36}
              borderRadius={10}
              backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
              color={theme.icon}
              accessibilityLabel={t('content_share') || 'Share'}
            />
          </>
        }
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        {(content.coverImageUrl || content.thumbnailUrl) && (
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: content.coverImageUrl || content.thumbnailUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            {/* Media type overlay for podcasts/videos */}
            {(content.type === 'podcast' || content.type === 'video') && (
              <View style={styles.mediaOverlay}>
                <View style={styles.playButton}>
                  <Ionicons
                    name={content.type === 'podcast' ? 'headset' : 'play'}
                    size={32}
                    color="#fff"
                  />
                </View>
                {content.duration && (
                  <Text style={styles.durationOverlay}>
                    {formatDuration(content.duration)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Content Header */}
        <View style={styles.contentHeader}>
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: theme.accent }]}>
            <Ionicons name={getTypeIcon(content.type) as any} size={14} color="#fff" />
            <Text style={styles.typeBadgeText}>
              {(content.type || 'article').toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            {content.title}
          </Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {content.author && (
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                By {content.author}
              </Text>
            )}
            {content.publishedAt && (
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {new Date(content.publishedAt).toLocaleDateString()}
              </Text>
            )}
            {content.readingTime && (
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {content.readingTime} min read
              </Text>
            )}
          </View>

          {/* Topics */}
          {content.topics && content.topics.length > 0 && (
            <View style={styles.topicsRow}>
              {content.topics.map((topic, index) => (
                <View
                  key={index}
                  style={[styles.topicTag, { backgroundColor: theme.surfaceVariant }]}
                >
                  <Text style={[styles.topicText, { color: theme.textSecondary }]}>
                    {topic}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Summary */}
        {content.summary && (
          <View style={styles.summarySection}>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              {content.summary}
            </Text>
          </View>
        )}

        {/* Main content body */}
        {content.body && (
          <View style={styles.bodySection}>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              {content.body}
            </Text>
          </View>
        )}

        {/* Source link */}
        {content.sourceUrl && (
          <TouchableOpacity
            style={[styles.sourceLink, { borderColor: theme.accent }]}
            onPress={() => Linking.openURL(content.sourceUrl!)}
          >
            <Ionicons name="open-outline" size={16} color={theme.accent} />
            <Text style={[styles.sourceLinkText, { color: theme.accent }]}>
              {t('content_read_more') || 'Read More'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Related Content */}
        {relatedContent.length > 0 && (
          <ContentCarousel
            title={t('content_related') || 'Related'}
            items={relatedContent}
            onItemPress={handleRelatedPress}
          />
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusSm,
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  contentHeader: {
    padding: SPACING.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusSm,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold as any,
    lineHeight: TYPOGRAPHY.sizes['2xl'] * TYPOGRAPHY.lineHeights.tight,
    marginBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metaText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  topicTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.radiusFull,
  },
  topicText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  summarySection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryText: {
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.sizes.md * TYPOGRAPHY.lineHeights.relaxed,
    fontStyle: 'italic',
  },
  bodySection: {
    padding: SPACING.lg,
  },
  bodyText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.relaxed,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderRadius: SPACING.radiusMd,
    gap: SPACING.sm,
  },
  sourceLinkText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
});
