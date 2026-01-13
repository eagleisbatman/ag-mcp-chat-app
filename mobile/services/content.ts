// Content API service - fetches articles, podcasts, and videos
import { fetchWithTimeout } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';
import { log, error as logError, warn } from '../utils/logger';

const DEFAULT_TIMEOUT_MS = TIMEOUTS.DEFAULT; // 30s for content endpoints

// Type definitions
export interface ContentItem {
  id: string;
  type: 'article' | 'podcast' | 'video';
  title: string;
  description?: string;
  imageUrl?: string;
  duration?: number;
  createdAt?: string;
  language?: string;
  tags?: string[];
}

export interface ContentFeedOptions {
  limit?: number;
  offset?: number;
  types?: string[];
}

export interface ContentSearchOptions {
  language?: string;
  types?: string[];
  limit?: number;
}

export interface ContentViewData {
  duration?: number;
  completionPercent?: number;
  source?: string;
}

/**
 * Content Service
 * Provides personalized content feed and content management
 */
export const contentService = {
  /**
   * Get personalized content feed for user's location
   */
  async getFeed(
    latitude: number | null,
    longitude: number | null,
    language: string = 'en',
    options: ContentFeedOptions = {}
  ): Promise<ContentItem[]> {
    try {
      const { limit = 10, offset = 0, types } = options;

      const queryParams = new URLSearchParams({
        latitude: latitude?.toString() || '',
        longitude: longitude?.toString() || '',
        language,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (types && types.length > 0) {
        queryParams.append('types', types.join(','));
      }

      const url = `${API_BASE_URL}/api/content/feed?${queryParams}`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Content API error: ${response.status}`);
      }

      const result = await response.json();
      log('[Content] Feed fetched:', {
        count: result.data?.length || 0,
        language,
      });

      return result.data || [];
    } catch (error) {
      logError('Content feed error:', error);
      // Return empty array on error to prevent UI crash
      return [];
    }
  },

  /**
   * Get a single content item by ID
   */
  async getContent(contentId: string): Promise<ContentItem | null> {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Content API error: ${response.status}`);
      }

      const result = await response.json();
      log('[Content] Item fetched:', {
        id: contentId,
        type: result.data?.type,
      });

      return result.data;
    } catch (error) {
      logError('Get content error:', error);
      return null;
    }
  },

  /**
   * Track content view (for analytics and recommendations)
   */
  async trackView(contentId: string, data: ContentViewData = {}): Promise<void> {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/view`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          duration: data.duration,
          completionPercent: data.completionPercent,
          source: data.source || 'feed',
        }),
      }, DEFAULT_TIMEOUT_MS);

      log('[Content] View tracked:', contentId);
    } catch (error) {
      // Don't throw on tracking errors - they shouldn't block the user
      warn('Failed to track content view:', error);
    }
  },

  /**
   * Like/favorite a content item
   */
  async likeContent(contentId: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/like`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      log('[Content] Liked:', contentId);
    } catch (error) {
      warn('Failed to like content:', error);
    }
  },

  /**
   * Unlike a content item
   */
  async unlikeContent(contentId: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/unlike`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      log('[Content] Unliked:', contentId);
    } catch (error) {
      warn('Failed to unlike content:', error);
    }
  },

  /**
   * Track content share (for analytics)
   */
  async shareContent(contentId: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/share`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      log('[Content] Shared:', contentId);
    } catch (error) {
      warn('Failed to track content share:', error);
    }
  },

  /**
   * Search content
   */
  async searchContent(query: string, options: ContentSearchOptions = {}): Promise<ContentItem[]> {
    try {
      const { language = 'en', types, limit = 20 } = options;

      const queryParams = new URLSearchParams({
        q: query,
        language,
        limit: limit.toString(),
      });

      if (types && types.length > 0) {
        queryParams.append('types', types.join(','));
      }

      const url = `${API_BASE_URL}/api/content/search?${queryParams}`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Content API error: ${response.status}`);
      }

      const result = await response.json();
      log('[Content] Search results:', {
        query,
        count: result.data?.length || 0,
      });

      return result.data || [];
    } catch (error) {
      logError('Content search error:', error);
      return [];
    }
  },

  /**
   * Get related content for a given content item
   */
  async getRelatedContent(contentId: string, limit: number = 5): Promise<ContentItem[]> {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/related?limit=${limit}`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Content API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      logError('Related content error:', error);
      return [];
    }
  },
};

export default contentService;
