// OneSignal Push Notification Service
import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';
import { fetchWithTimeout } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY } from '../utils/config';
import { log, error as logError, warn } from '../utils/logger';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

// Type definitions
export interface NotificationData {
  [key: string]: unknown;
}

export interface NotificationOptions {
  onNotificationOpened?: (data: NotificationData, notification: unknown) => void;
  onNotificationReceived?: (notification: unknown) => boolean | void;
}

export interface NotificationPreferences {
  weatherAlerts?: boolean;
  contentUpdates?: boolean;
  tipsAndReminders?: boolean;
}

export interface DeviceState {
  userId?: string;
  pushToken?: string;
  hasNotificationPermission?: boolean;
}

export const notificationService = {
  /**
   * Initialize OneSignal with optional handlers
   */
  initialize(options: NotificationOptions = {}): void {
    if (!ONESIGNAL_APP_ID) {
      warn('[Notifications] OneSignal App ID not configured');
      return;
    }

    log('[Notifications] Initializing OneSignal...');

    // Set app ID
    OneSignal.setAppId(ONESIGNAL_APP_ID);

    // Set log level for debugging (6 = verbose, 0 = none)
    if (__DEV__) {
      OneSignal.setLogLevel(6, 0);
    }

    // Handle notification opened (user tapped notification)
    OneSignal.setNotificationOpenedHandler((openedEvent: { notification: { additionalData?: NotificationData } }) => {
      log('[Notifications] Notification opened:', openedEvent);
      const { notification } = openedEvent;
      const data = notification.additionalData || {};

      if (options.onNotificationOpened) {
        options.onNotificationOpened(data, notification);
      }
    });

    // Handle notification received in foreground
    OneSignal.setNotificationWillShowInForegroundHandler((event: { getNotification: () => unknown; complete: (n?: unknown) => void }) => {
      log('[Notifications] Notification received in foreground');
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

    log('[Notifications] OneSignal initialized successfully');
  },

  /**
   * Register push token with backend
   */
  async registerToken(): Promise<string | null> {
    try {
      const deviceState: DeviceState | null = await OneSignal.getDeviceState();

      if (!deviceState?.userId) {
        warn('[Notifications] No OneSignal player ID available');
        return null;
      }

      log('[Notifications] Registering push token:', deviceState.userId.substring(0, 20) + '...');

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

      log('[Notifications] Push token registered successfully');
      return deviceState.userId;
    } catch (error) {
      logError('[Notifications] Failed to register push token:', error);
      return null;
    }
  },

  /**
   * Set user tags for targeting
   */
  async setTags(tags: Record<string, string>): Promise<void> {
    try {
      log('[Notifications] Setting tags:', tags);
      OneSignal.sendTags(tags);
    } catch (error) {
      logError('[Notifications] Failed to set tags:', error);
    }
  },

  /**
   * Set user region tag for regional notifications
   */
  async setRegion(regionCode: string | null): Promise<void> {
    if (!regionCode) return;
    await this.setTags({ region: regionCode });
  },

  /**
   * Set user language tag
   */
  async setLanguage(languageCode: string | null): Promise<void> {
    if (!languageCode) return;
    await this.setTags({ language: languageCode });
  },

  /**
   * Set notification preferences (both in OneSignal tags and backend)
   */
  async setPreferences(preferences: NotificationPreferences): Promise<void> {
    const tags: Record<string, string> = {};

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
        warn('[Notifications] Failed to sync preferences to backend');
      }
    } catch (error) {
      logError('[Notifications] Error syncing preferences:', error);
    }
  },

  /**
   * Request notification permissions from user
   */
  async requestPermission(): Promise<boolean> {
    try {
      log('[Notifications] Requesting notification permission...');
      const granted = await OneSignal.promptForPushNotificationsWithUserResponse();
      log('[Notifications] Permission granted:', granted);
      return granted;
    } catch (error) {
      logError('[Notifications] Error requesting permission:', error);
      return false;
    }
  },

  /**
   * Check if notifications are currently enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const deviceState: DeviceState | null = await OneSignal.getDeviceState();
      return deviceState?.hasNotificationPermission ?? false;
    } catch (error) {
      logError('[Notifications] Error checking notification status:', error);
      return false;
    }
  },

  /**
   * Get the current player ID (OneSignal user ID)
   */
  async getPlayerId(): Promise<string | null> {
    try {
      const deviceState: DeviceState | null = await OneSignal.getDeviceState();
      return deviceState?.userId ?? null;
    } catch (error) {
      logError('[Notifications] Error getting player ID:', error);
      return null;
    }
  },

  /**
   * Set external user ID for cross-device targeting
   */
  async setExternalUserId(userId: string | null): Promise<void> {
    if (!userId) return;
    try {
      log('[Notifications] Setting external user ID:', userId);
      OneSignal.setExternalUserId(userId);
    } catch (error) {
      logError('[Notifications] Error setting external user ID:', error);
    }
  },

  /**
   * Remove external user ID (e.g., on logout)
   */
  async removeExternalUserId(): Promise<void> {
    try {
      OneSignal.removeExternalUserId();
    } catch (error) {
      logError('[Notifications] Error removing external user ID:', error);
    }
  },

  /**
   * Disable push notifications
   */
  disablePush(): void {
    try {
      OneSignal.disablePush(true);
      log('[Notifications] Push notifications disabled');
    } catch (error) {
      logError('[Notifications] Error disabling push:', error);
    }
  },

  /**
   * Enable push notifications
   */
  enablePush(): void {
    try {
      OneSignal.disablePush(false);
      log('[Notifications] Push notifications enabled');
    } catch (error) {
      logError('[Notifications] Error enabling push:', error);
    }
  },
};

export default notificationService;
