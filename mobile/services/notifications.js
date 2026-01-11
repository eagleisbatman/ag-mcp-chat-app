// OneSignal Push Notification Service
import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';
import { fetchWithTimeout, parseErrorMessage } from '../utils/apiHelpers';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ag-mcp-api-gateway.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

export const notificationService = {
  /**
   * Initialize OneSignal with optional handlers
   * @param {object} options - Configuration options
   * @param {function} options.onNotificationOpened - Handler for when notification is tapped
   * @param {function} options.onNotificationReceived - Handler for foreground notifications
   */
  initialize(options = {}) {
    if (!ONESIGNAL_APP_ID) {
      console.warn('[Notifications] OneSignal App ID not configured');
      return;
    }

    console.log('[Notifications] Initializing OneSignal...');

    // Set app ID
    OneSignal.setAppId(ONESIGNAL_APP_ID);

    // Set log level for debugging (6 = verbose, 0 = none)
    if (__DEV__) {
      OneSignal.setLogLevel(6, 0);
    }

    // Handle notification opened (user tapped notification)
    OneSignal.setNotificationOpenedHandler((openedEvent) => {
      console.log('[Notifications] Notification opened:', openedEvent);
      const { notification } = openedEvent;
      const data = notification.additionalData;

      if (options.onNotificationOpened) {
        options.onNotificationOpened(data, notification);
      }
    });

    // Handle notification received in foreground
    OneSignal.setNotificationWillShowInForegroundHandler((event) => {
      console.log('[Notifications] Notification received in foreground');
      const notification = event.getNotification();

      if (options.onNotificationReceived) {
        // Let the handler decide whether to show it
        const shouldShow = options.onNotificationReceived(notification);
        if (shouldShow === false) {
          // Don't show the notification
          event.complete();
          return;
        }
      }

      // Complete to show the notification
      event.complete(notification);
    });

    console.log('[Notifications] OneSignal initialized successfully');
  },

  /**
   * Register push token with backend
   * @returns {Promise<string|null>} Player ID if successful, null otherwise
   */
  async registerToken() {
    try {
      const deviceState = await OneSignal.getDeviceState();

      if (!deviceState?.userId) {
        console.warn('[Notifications] No OneSignal player ID available');
        return null;
      }

      console.log('[Notifications] Registering push token:', deviceState.userId.substring(0, 20) + '...');

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          playerId: deviceState.userId,
          platform: Platform.OS,
          deviceId: deviceState.pushToken,
        }),
      }, 10000);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      console.log('[Notifications] Push token registered successfully');
      return deviceState.userId;
    } catch (error) {
      console.error('[Notifications] Failed to register push token:', error);
      return null;
    }
  },

  /**
   * Set user tags for targeting
   * @param {object} tags - Key-value pairs of tags
   */
  async setTags(tags) {
    try {
      console.log('[Notifications] Setting tags:', tags);
      OneSignal.sendTags(tags);
    } catch (error) {
      console.error('[Notifications] Failed to set tags:', error);
    }
  },

  /**
   * Set user region tag for regional notifications
   * @param {string} regionCode - Region code (e.g., 'ETH', 'KEN', 'VNM')
   */
  async setRegion(regionCode) {
    if (!regionCode) return;
    await this.setTags({ region: regionCode });
  },

  /**
   * Set user language tag
   * @param {string} languageCode - Language code (e.g., 'en', 'hi', 'am')
   */
  async setLanguage(languageCode) {
    if (!languageCode) return;
    await this.setTags({ language: languageCode });
  },

  /**
   * Set notification preferences (both in OneSignal tags and backend)
   * @param {object} preferences - Notification preferences
   * @param {boolean} preferences.weatherAlerts - Receive weather alerts
   * @param {boolean} preferences.contentUpdates - Receive content updates
   * @param {boolean} preferences.tipsAndReminders - Receive tips and engagement reminders
   */
  async setPreferences(preferences) {
    const tags = {};

    if (preferences.weatherAlerts !== undefined) {
      tags.weather_alerts = preferences.weatherAlerts ? 'true' : 'false';
    }
    if (preferences.contentUpdates !== undefined) {
      tags.content_updates = preferences.contentUpdates ? 'true' : 'false';
    }
    if (preferences.tipsAndReminders !== undefined) {
      tags.engagement_reminders = preferences.tipsAndReminders ? 'true' : 'false';
    }

    // Update OneSignal tags
    await this.setTags(tags);

    // Also sync to backend
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ preferences }),
      }, 10000);

      if (!response.ok) {
        console.warn('[Notifications] Failed to sync preferences to backend');
      }
    } catch (error) {
      console.error('[Notifications] Error syncing preferences:', error);
    }
  },

  /**
   * Request notification permissions from user
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermission() {
    try {
      console.log('[Notifications] Requesting notification permission...');
      const granted = await OneSignal.promptForPushNotificationsWithUserResponse();
      console.log('[Notifications] Permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return false;
    }
  },

  /**
   * Check if notifications are currently enabled
   * @returns {Promise<boolean>} Whether notifications are enabled
   */
  async areNotificationsEnabled() {
    try {
      const deviceState = await OneSignal.getDeviceState();
      return deviceState?.hasNotificationPermission ?? false;
    } catch (error) {
      console.error('[Notifications] Error checking notification status:', error);
      return false;
    }
  },

  /**
   * Get the current player ID (OneSignal user ID)
   * @returns {Promise<string|null>} Player ID if available
   */
  async getPlayerId() {
    try {
      const deviceState = await OneSignal.getDeviceState();
      return deviceState?.userId ?? null;
    } catch (error) {
      console.error('[Notifications] Error getting player ID:', error);
      return null;
    }
  },

  /**
   * Set external user ID for cross-device targeting
   * @param {string} userId - Your backend user ID
   */
  async setExternalUserId(userId) {
    if (!userId) return;
    try {
      console.log('[Notifications] Setting external user ID:', userId);
      OneSignal.setExternalUserId(userId);
    } catch (error) {
      console.error('[Notifications] Error setting external user ID:', error);
    }
  },

  /**
   * Remove external user ID (e.g., on logout)
   */
  async removeExternalUserId() {
    try {
      OneSignal.removeExternalUserId();
    } catch (error) {
      console.error('[Notifications] Error removing external user ID:', error);
    }
  },

  /**
   * Disable push notifications
   */
  disablePush() {
    try {
      OneSignal.disablePush(true);
      console.log('[Notifications] Push notifications disabled');
    } catch (error) {
      console.error('[Notifications] Error disabling push:', error);
    }
  },

  /**
   * Enable push notifications
   */
  enablePush() {
    try {
      OneSignal.disablePush(false);
      console.log('[Notifications] Push notifications enabled');
    } catch (error) {
      console.error('[Notifications] Error enabling push:', error);
    }
  },
};

export default notificationService;
