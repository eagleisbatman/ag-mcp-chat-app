// Content API service - fetches articles, podcasts, and videos
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

const DEFAULT_TIMEOUT_MS = 30000; // 30s for content endpoints

/**
 * Content Service
 * Provides personalized content feed and content management
 */
export const contentService = {
  /**
   * Get personalized content feed for user's location
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {string} language - Language code (e.g., 'en', 'hi')
   * @param {object} options - Additional options
   * @param {number} options.limit - Number of items to fetch (default: 10)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {Array<string>} options.types - Content types to filter (e.g., ['article', 'podcast'])
   * @returns {Promise<Array<object>>}
   */
  async getFeed(latitude, longitude, language = 'en', options = {}) {
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
      console.log('[Content] Feed fetched:', {
        count: result.data?.length || 0,
        language,
      });

      return result.data || [];
    } catch (error) {
      console.error('Content feed error:', error);
      // Return empty array on error to prevent UI crash
      return [];
    }
  },

  /**
   * Get a single content item by ID
   * @param {string} contentId - Content ID
   * @returns {Promise<object|null>}
   */
  async getContent(contentId) {
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
      console.log('[Content] Item fetched:', {
        id: contentId,
        type: result.data?.type,
      });

      return result.data;
    } catch (error) {
      console.error('Get content error:', error);
      return null;
    }
  },

  /**
   * Track content view (for analytics and recommendations)
   * @param {string} contentId - Content ID
   * @param {object} data - View data
   * @param {number} data.duration - Time spent viewing (seconds)
   * @param {number} data.completionPercent - How much was read/watched (0-100)
   * @param {string} data.source - Where user found the content (e.g., 'feed', 'search')
   */
  async trackView(contentId, data = {}) {
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

      console.log('[Content] View tracked:', contentId);
    } catch (error) {
      // Don't throw on tracking errors - they shouldn't block the user
      console.warn('Failed to track content view:', error);
    }
  },

  /**
   * Like/favorite a content item
   * @param {string} contentId - Content ID
   */
  async likeContent(contentId) {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/like`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      console.log('[Content] Liked:', contentId);
    } catch (error) {
      console.warn('Failed to like content:', error);
    }
  },

  /**
   * Unlike a content item
   * @param {string} contentId - Content ID
   */
  async unlikeContent(contentId) {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/unlike`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      console.log('[Content] Unliked:', contentId);
    } catch (error) {
      console.warn('Failed to unlike content:', error);
    }
  },

  /**
   * Track content share (for analytics)
   * @param {string} contentId - Content ID
   */
  async shareContent(contentId) {
    try {
      const url = `${API_BASE_URL}/api/content/${contentId}/share`;

      await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }, DEFAULT_TIMEOUT_MS);

      console.log('[Content] Shared:', contentId);
    } catch (error) {
      console.warn('Failed to track content share:', error);
    }
  },

  /**
   * Search content
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @param {string} options.language - Language code
   * @param {Array<string>} options.types - Content types to filter
   * @param {number} options.limit - Max results
   * @returns {Promise<Array<object>>}
   */
  async searchContent(query, options = {}) {
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
      console.log('[Content] Search results:', {
        query,
        count: result.data?.length || 0,
      });

      return result.data || [];
    } catch (error) {
      console.error('Content search error:', error);
      return [];
    }
  },

  /**
   * Get related content for a given content item
   * @param {string} contentId - Content ID
   * @param {number} limit - Max results
   * @returns {Promise<Array<object>>}
   */
  async getRelatedContent(contentId, limit = 5) {
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
      console.error('Related content error:', error);
      return [];
    }
  },
};

export default contentService;
